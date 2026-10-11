import type { RecordController, ControllerState } from '@banora/sdk/controller';
import { DraftError, safeDraftFilename } from './draft-store.js';
import type { DraftStore, StudioDraft, DraftErrorCode } from './draft-store.js';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'off' | DraftErrorCode;
interface Owner {
  id: string;
  generation: number;
  revision: number;
}

/** Serial writes, separate owners and latest-feedback gates; no silent retries after failure. */
export class DraftAutosave {
  #owner: Owner;
  #epoch = 0;
  #capturedEpoch = -1;
  #needsSave = false;
  #status: AutosaveStatus = 'idle';
  #timer: ReturnType<typeof setTimeout> | undefined;
  #queued: { owner: Owner; epoch: number; draft: StudioDraft } | undefined;
  #running: Promise<void> | undefined;
  #closed = false;
  #unsubscribe: () => void;
  #seen: ControllerState;
  constructor(
    private readonly controller: RecordController,
    private readonly filename: () => string,
    private readonly store: Pick<DraftStore, 'save'>,
    private enabled: boolean,
    private readonly changed: (status: AutosaveStatus) => void,
  ) {
    this.#seen = controller.getState();
    this.#owner = this.#newOwner(this.#seen.recordGeneration);
    this.#status = enabled ? 'idle' : 'off';
    this.#unsubscribe = controller.subscribe((state) => {
      if (state === this.#seen || this.#closed) return;
      this.#seen = state;
      if (state.recordGeneration !== this.#owner.generation)
        this.#owner = this.#newOwner(state.recordGeneration);
      this.#epoch++;
      this.#schedule();
    });
  }
  #newOwner(generation: number): Owner {
    return { id: crypto.randomUUID(), generation, revision: 0 };
  }
  #publish(status: AutosaveStatus): void {
    if (this.#status === status) return;
    this.#status = status;
    if (!this.#closed) this.changed(status);
  }
  getStatus(): AutosaveStatus {
    return this.#status;
  }
  getOwnerId(): string {
    return this.#owner.id;
  }
  setEnabled(enabled: boolean): void {
    if (this.#closed || enabled === this.enabled) return;
    this.enabled = enabled;
    this.#epoch++;
    clearTimeout(this.#timer);
    this.#queued = undefined;
    if (enabled) {
      this.#owner = this.#newOwner(this.controller.getState().recordGeneration);
      this.#schedule();
    } else this.#publish('off');
  }
  #schedule(): void {
    clearTimeout(this.#timer);
    if (!this.enabled) return;
    this.#needsSave = true;
    this.#publish('saving');
    this.#timer = setTimeout(() => {
      void this.flush();
    }, 500);
  }
  retry(): void {
    if (this.#closed || !this.enabled) return;
    if (this.#status === 'conflict')
      this.#owner = this.#newOwner(this.controller.getState().recordGeneration);
    this.#epoch++;
    this.#publish('saving');
    void this.flush();
  }
  /** Capture now so disposal can let this queued immutable checkpoint finish. */
  flush(): Promise<void> {
    clearTimeout(this.#timer);
    if (this.#closed || !this.enabled || !this.#needsSave || this.#capturedEpoch === this.#epoch)
      return this.#running ?? Promise.resolve();
    try {
      this.#queued = {
        owner: this.#owner,
        epoch: this.#epoch,
        draft: {
          schemaVersion: 'banora.studio-draft/v1',
          id: this.#owner.id,
          filename: safeDraftFilename(this.filename()),
          updatedAt: Date.now(),
          revision: this.#owner.revision + 1,
          checkpoint: this.controller.createCheckpoint(),
        },
      };
      this.#capturedEpoch = this.#epoch;
    } catch {
      this.#publish('invalid');
      return Promise.resolve();
    }
    if (!this.#running)
      this.#running = this.#drain().finally(() => {
        this.#running = undefined;
      });
    return this.#running;
  }
  async #drain(): Promise<void> {
    while (this.#queued) {
      const job = this.#queued;
      this.#queued = undefined;
      // A prior write may have finished since this checkpoint was queued.
      const draft = { ...job.draft, revision: job.owner.revision + 1 };
      try {
        await this.store.save(draft, job.owner.revision);
        job.owner.revision = draft.revision;
        if (job.owner === this.#owner && job.epoch === this.#epoch && this.enabled) {
          this.#needsSave = false;
          this.#publish('saved');
        }
      } catch (error) {
        if (job.owner === this.#owner && job.epoch === this.#epoch && this.enabled)
          this.#publish(error instanceof DraftError ? error.code : 'failed');
        // Only a newer explicit checkpoint may continue; do not invent retry loops.
      }
    }
  }
  idle(): Promise<void> {
    return this.#running ?? Promise.resolve();
  }
  close(): Promise<void> {
    const pending = this.flush();
    this.#closed = true;
    clearTimeout(this.#timer);
    this.#unsubscribe();
    return pending;
  }
}
