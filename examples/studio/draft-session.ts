import type { RecordController, ControllerState } from '@0disoft/banora/controller';
import { DraftError, safeDraftFilename } from './draft-store.js';
import type { DraftStore, StudioDraft, DraftErrorCode } from './draft-store.js';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'off' | DraftErrorCode;
export interface AutosaveRuntime {
  readonly now?: () => number;
  readonly createId?: () => string;
  readonly scheduler?: {
    after(delayMs: number, task: () => void): () => void;
  };
}
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
  #timer: (() => void) | undefined;
  #queued = new Map<Owner, { epoch: number; draft: StudioDraft }>();
  #running: Promise<void> | undefined;
  #closed = false;
  #unsubscribe: () => void;
  #seen: ControllerState;
  #owners = new WeakMap<object, Owner>();
  #ownerKey: object | undefined;
  constructor(
    private readonly controller: RecordController,
    private readonly filename: () => string,
    private readonly store: Pick<DraftStore, 'save'>,
    private enabled: boolean,
    private readonly changed: (status: AutosaveStatus) => void,
    private readonly session?: { ownerKey(): object },
    private readonly runtime: AutosaveRuntime = {},
  ) {
    this.#seen = controller.getState();
    this.#owner = this.#newOwner(this.#seen.recordGeneration);
    this.#ownerKey = session?.ownerKey();
    if (this.#ownerKey) this.#owners.set(this.#ownerKey, this.#owner);
    this.#status = enabled ? 'idle' : 'off';
    this.#unsubscribe = controller.subscribe(() => {
      if (this.#syncSource()) this.#schedule();
    });
  }
  /** Read live source/owner together; notification snapshots can arrive after a switch. */
  #syncSource(): boolean {
    if (this.#closed) return false;
    const state = this.controller.getState();
    if (state === this.#seen) return false;
    this.#seen = state;
    const key = this.session?.ownerKey();
    if (key && key !== this.#ownerKey) {
      this.#ownerKey = key;
      this.#owner = this.#owners.get(key) ?? this.#newOwner(state.recordGeneration);
      this.#owners.set(key, this.#owner);
    } else if (!key && state.recordGeneration !== this.#owner.generation)
      this.#owner = this.#newOwner(state.recordGeneration);
    this.#epoch++;
    return true;
  }
  #newOwner(generation: number): Owner {
    return { id: this.runtime.createId?.() ?? crypto.randomUUID(), generation, revision: 0 };
  }
  #publish(status: AutosaveStatus): void {
    if (this.#status === status) return;
    this.#status = status;
    if (!this.#closed) {
      try {
        this.changed(status);
      } catch {
        console.error('Banora autosave status listener failed');
      }
    }
  }
  #cancelTimer(): void {
    this.#timer?.();
    this.#timer = undefined;
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
    this.#cancelTimer();
    this.#queued.clear();
    if (enabled) {
      this.#owner = this.#newOwner(this.controller.getState().recordGeneration);
      if (this.#ownerKey) this.#owners.set(this.#ownerKey, this.#owner);
      this.#schedule();
    } else this.#publish('off');
  }
  #schedule(): void {
    this.#cancelTimer();
    if (!this.enabled) return;
    this.#needsSave = true;
    this.#publish('saving');
    if (this.#closed || !this.enabled) return;
    let cancelled = false;
    const task = () => {
      if (cancelled || this.#closed) return;
      void this.flush();
    };
    const stop = this.runtime.scheduler
      ? this.runtime.scheduler.after(500, task)
      : (() => {
          const handle = setTimeout(task, 500);
          return () => clearTimeout(handle);
        })();
    this.#timer = () => {
      cancelled = true;
      stop();
    };
  }
  retry(): void {
    if (this.#closed || !this.enabled) return;
    if (this.#status === 'conflict')
      this.#owner = this.#newOwner(this.controller.getState().recordGeneration);
    if (this.#ownerKey) this.#owners.set(this.#ownerKey, this.#owner);
    this.#epoch++;
    this.#publish('saving');
    void this.flush();
  }
  /** Capture now so disposal can let this queued immutable checkpoint finish. */
  flush(): Promise<void> {
    this.#cancelTimer();
    if (this.#closed || !this.enabled) return this.#running ?? Promise.resolve();
    try {
      if (this.#syncSource()) this.#needsSave = true;
      if (!this.#needsSave || this.#capturedEpoch === this.#epoch)
        return this.#running ?? Promise.resolve();
      this.#queued.set(this.#owner, {
        epoch: this.#epoch,
        draft: {
          schemaVersion: 'banora.studio-draft/v1',
          id: this.#owner.id,
          filename: safeDraftFilename(this.filename()),
          updatedAt: this.runtime.now?.() ?? Date.now(),
          revision: this.#owner.revision + 1,
          checkpoint: this.controller.createCheckpoint(),
        },
      });
      this.#capturedEpoch = this.#epoch;
    } catch {
      this.#publish('invalid');
      return Promise.resolve();
    }
    return this.#running ?? this.#startDrain();
  }
  #startDrain(): Promise<void> {
    this.#running = this.#drain().finally(() => {
      this.#running = undefined;
      // A completion callback may queue a checkpoint after the loop has ended.
      // Keep existing flush/close waiters attached until that work finishes too.
      if (this.#queued.size) return this.#startDrain();
    });
    return this.#running;
  }
  async #drain(): Promise<void> {
    while (this.#queued.size) {
      const [owner, pending] = this.#queued.entries().next().value!;
      const job = { ...pending, owner };
      this.#queued.delete(owner);
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
    this.#cancelTimer();
    this.#unsubscribe();
    return pending;
  }
}
