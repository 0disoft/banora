import type { RecordController } from '@0disoft/banora/controller';
import { parseRecordCheckpoint } from '@0disoft/banora/checkpoint';
import { DraftAutosave } from './draft-session.js';
import type { AutosaveStatus } from './draft-session.js';
import {
  DRAFT_BACKUP_BYTES,
  DraftError,
  DraftStore,
  isDraftEntry,
  safeDraftFilename,
} from './draft-store.js';
import type { DraftEntry, StudioDraft } from './draft-store.js';
import { localizeUi, setUiText, getUiLocale } from '../ui-language.js';
import type { StudioDiagnostics } from './diagnostics.js';
import { describeDiagnosticFailure } from '@0disoft/banora/diagnostics';

const statusText: Record<AutosaveStatus, string> = {
  idle: '',
  saving: 'Saving draft…',
  saved: 'Draft saved',
  off: 'Autosave off',
  unavailable: 'Local storage unavailable. Download a backup.',
  blocked: 'Close other Studio tabs and retry.',
  quota: 'Storage full. Delete a draft or download a backup.',
  full: '20 drafts saved. Delete one to continue.',
  conflict: 'Draft changed. Refresh or retry.',
  invalid: 'Invalid backup. Current record kept.',
  timeout: 'Storage timed out. Retry or download a backup.',
  failed: 'Draft not saved. Retry or download a backup.',
};
export function mountRecoveryControls(
  host: HTMLElement,
  controller: RecordController,
  options: {
    diagnostics?: StudioDiagnostics;
    filename(): string;
    replace(checkpoint: unknown, filename: string, signal: AbortSignal): Promise<boolean>;
    autosave: boolean;
    onAutosaveChange(enabled: boolean): void;
  },
): () => void {
  host.innerHTML = `<button class="button" id="drafts-open" type="button">Local drafts</button>
    <span id="draft-status" class="muted small" role="status" aria-live="off"></span>
    <dialog id="drafts-dialog" aria-labelledby="draft-title"><h2 id="draft-title">Local drafts</h2>
    <div class="draft-actions"><label class="checkbox"><input id="draft-autosave" type="checkbox" checked/><span>Autosave on this browser</span></label>
    <button id="draft-retry" class="button" type="button">Retry</button></div>
    <label class="draft-selection"><span>Saved drafts</span><select id="draft-list"></select></label>
    <div class="draft-actions"><button id="draft-refresh" class="button" type="button">Refresh</button>
    <button id="draft-restore" class="button" type="button">Restore draft</button>
    <button id="draft-backup" class="button" type="button">Back up draft</button>
    <button id="draft-delete" class="button" type="button">Delete draft</button><button id="draft-delete-cancel" class="button" type="button" hidden>Cancel</button></div>
    <div class="draft-actions"><button id="backup-save" class="button" type="button">Download backup</button>
    <button id="backup-open" class="button" type="button">Open backup</button><input id="backup-file" type="file" accept=".json,application/json" hidden/></div>
    <p class="muted small" id="draft-message" role="status"></p>
    <div class="dialog-actions"><button id="draft-close" class="button" type="button">Close</button></div></dialog>`;
  const find = <T extends HTMLElement>(id: string): T =>
    (host.querySelector<T>(`#${id}`) ?? dialog.querySelector<T>(`#${id}`))!;
  const dialog: HTMLDialogElement = find<HTMLDialogElement>('drafts-dialog');
  const toggle = find<HTMLInputElement>('draft-autosave');
  const list = find<HTMLSelectElement>('draft-list');
  const message = find('draft-message');
  const abort = new AbortController(),
    { signal } = abort;
  const store = new DraftStore();
  let disposed = false,
    busy = false,
    listSequence = 0,
    requestSequence = 0;
  let operationAbort: AbortController | undefined;
  let deletion: { id: string; revision: number | null } | undefined;
  let entries = new Map<string, DraftEntry | null>();
  toggle.checked = options.autosave;
  let checkpointCompletion: ReturnType<StudioDiagnostics['begin']> | undefined;
  const autosave = new DraftAutosave(
    controller,
    options.filename,
    store,
    toggle.checked,
    (status) => {
      if (status === 'saving') checkpointCompletion = options.diagnostics?.begin('checkpoint');
      else if (checkpointCompletion) {
        checkpointCompletion(
          status === 'saved'
            ? { status: 'success' }
            : ['idle', 'off'].includes(status)
              ? { status: 'cancelled' }
              : { status: 'failure', failure: describeDiagnosticFailure('storage', status) },
        );
        checkpointCompletion = undefined;
      }
      find('draft-status').setAttribute(
        'aria-live',
        ['idle', 'saving', 'saved', 'off'].includes(status) ? 'off' : 'polite',
      );
      setUiText(find('draft-status'), statusText[status]);
      find<HTMLButtonElement>('draft-retry').disabled =
        status === 'saved' || status === 'idle' || status === 'saving' || status === 'off';
    },
  );
  setUiText(find('draft-status'), toggle.checked ? '' : statusText.off);
  find<HTMLButtonElement>('draft-retry').disabled = true;
  const disposeLanguage = localizeUi(host);
  // Modal ownership is independent of the temporarily borrowed menu controls.
  document.body.append(dialog);
  const disposeModalLanguage = localizeUi(dialog);
  function failure(error: unknown): void {
    setUiText(message, statusText[error instanceof DraftError ? error.code : 'failed']);
  }
  function controls(): void {
    for (const id of ['draft-restore', 'draft-delete', 'draft-backup'])
      find<HTMLButtonElement>(id).disabled = busy || !list.value;
    find<HTMLButtonElement>('backup-open').disabled = busy;
    list.disabled = busy;
    find('draft-delete-cancel').hidden = !deletion;
    setUiText(find('draft-delete'), deletion ? 'Confirm delete' : 'Delete draft');
  }
  async function refresh(): Promise<void> {
    deletion = undefined;
    const sequence = ++listSequence;
    try {
      const result = await store.list();
      if (disposed || sequence !== listSequence) return;
      const selected = list.value;
      entries = new Map(result.entries.map((item) => [item.id, item.entry]));
      list.replaceChildren();
      for (const item of [...result.entries].sort(
        (a, b) => (b.entry?.updatedAt ?? 0) - (a.entry?.updatedAt ?? 0),
      )) {
        const option = document.createElement('option');
        option.value = item.id;
        if (item.entry)
          option.textContent = `${item.entry.filename} · ${new Intl.DateTimeFormat(getUiLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(item.entry.updatedAt)}`;
        else setUiText(option, 'Invalid draft');
        list.append(option);
      }
      if (entries.has(selected)) list.value = selected;
      if (!result.total) {
        const empty = document.createElement('option');
        empty.value = '';
        setUiText(empty, 'No saved drafts');
        list.append(empty);
      }
      controls();
    } catch (error) {
      if (!disposed && sequence === listSequence) failure(error);
    }
  }
  const unchanged = (state: ReturnType<RecordController['getState']>, sequence: number) =>
    !disposed && sequence === requestSequence && controller.getState() === state;
  async function restore(
    value: unknown,
    state: ReturnType<RecordController['getState']>,
    sequence: number,
  ): Promise<void> {
    if (!unchanged(state, sequence)) {
      if (!disposed) setUiText(message, 'Record changed. Try again.');
      return;
    }
    if (
      !isDraftEntry(value) ||
      !('checkpoint' in value) ||
      !parseRecordCheckpoint(value.checkpoint).ok
    )
      throw new DraftError('invalid');
    const result = await options.replace(
      value.checkpoint,
      value.filename,
      operationAbort?.signal ?? signal,
    );
    if (disposed || sequence !== requestSequence) return;
    if (result) {
      dialog.close();
      find('drafts-open').focus({ preventScroll: true });
    }
  }
  async function operation(
    action: (state: ReturnType<RecordController['getState']>, sequence: number) => Promise<void>,
  ): Promise<void> {
    if (busy || disposed) return;
    busy = true;
    controls();
    setUiText(message, '');
    const sequence = ++requestSequence,
      state = controller.getState();
    operationAbort = new AbortController();
    try {
      await action(state, sequence);
    } catch (error) {
      if (!disposed && sequence === requestSequence) failure(error);
    } finally {
      if (!disposed && sequence === requestSequence) {
        busy = false;
        controls();
      }
    }
  }
  function downloadBackup(backup: unknown, filename: string): void {
    const complete = options.diagnostics?.begin('backup');
    let url: string | undefined;
    try {
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      if (blob.size > DRAFT_BACKUP_BYTES) throw new DraftError('invalid');
      url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeDraftFilename(filename).replace(/\.sgf$/i, '')}.banora.json`;
      (dialog.open ? dialog : document.body).append(link);
      link.click();
      link.remove();
      setUiText(message, 'Backup download started.');
      complete?.({ status: 'success' });
    } catch (error) {
      complete?.({
        status: 'failure',
        failure: describeDiagnosticFailure(
          'storage',
          error instanceof DraftError ? error.code : 'failed',
        ),
      });
      failure(error);
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 30_000);
    }
  }
  function download(): void {
    try {
      const backup: StudioDraft = {
        schemaVersion: 'banora.studio-draft/v1',
        id: crypto.randomUUID(),
        filename: safeDraftFilename(options.filename()),
        updatedAt: Date.now(),
        revision: 1,
        checkpoint: controller.createCheckpoint(),
      };
      downloadBackup(backup, backup.filename);
    } catch (error) {
      failure(error);
    }
  }
  find('draft-backup').addEventListener(
    'click',
    () => {
      const id = list.value,
        filename = entries.get(id)?.filename ?? 'unrecognized-draft';
      void operation(async (_state, sequence) => {
        const data = await store.get(id);
        if (!disposed && sequence === requestSequence) {
          if (data === undefined) throw new DraftError('invalid');
          downloadBackup(data, filename);
        }
      });
    },
    { signal },
  );
  find('drafts-open').addEventListener(
    'click',
    () => {
      if (!dialog.open) dialog.showModal();
      setUiText(message, '');
      void refresh();
    },
    { signal },
  );
  find('draft-close').addEventListener('click', () => dialog.close(), { signal });
  dialog.addEventListener(
    'close',
    () => {
      deletion = undefined;
      operationAbort?.abort();
      requestSequence++;
      busy = false;
      controls();
      find('drafts-open').focus({ preventScroll: true });
    },
    { signal },
  );
  toggle.addEventListener(
    'change',
    () => {
      autosave.setEnabled(toggle.checked);
      options.onAutosaveChange(toggle.checked);
    },
    { signal },
  );
  find('draft-retry').addEventListener('click', () => autosave.retry(), { signal });
  find('draft-refresh').addEventListener(
    'click',
    () => {
      void refresh();
    },
    { signal },
  );
  list.addEventListener(
    'change',
    () => {
      deletion = undefined;
      controls();
    },
    { signal },
  );
  find('draft-delete-cancel').addEventListener(
    'click',
    () => {
      deletion = undefined;
      setUiText(message, '');
      controls();
      find('draft-delete').focus();
    },
    { signal },
  );
  find('draft-restore').addEventListener(
    'click',
    () => {
      const id = list.value;
      void operation(async (state, sequence) => restore(await store.get(id), state, sequence));
    },
    { signal },
  );
  find('draft-delete').addEventListener(
    'click',
    () => {
      if (!deletion) {
        deletion = { id: list.value, revision: entries.get(list.value)?.revision ?? null };
        setUiText(message, 'Delete this saved draft?');
        controls();
        return;
      }
      const { id, revision } = deletion;
      deletion = undefined;
      controls();
      void operation(async (_state, sequence) => {
        if (id === autosave.getOwnerId()) {
          toggle.checked = false;
          toggle.dispatchEvent(new Event('change'));
          await autosave.idle();
        }
        await store.remove(id, revision);
        if (disposed || sequence !== requestSequence) return;
        await refresh();
        if (!disposed && sequence === requestSequence) setUiText(message, 'Draft deleted.');
      });
    },
    { signal },
  );
  find('backup-save').addEventListener('click', download, { signal });
  find('backup-open').addEventListener(
    'click',
    () => find<HTMLInputElement>('backup-file').click(),
    { signal },
  );
  find<HTMLInputElement>('backup-file').addEventListener(
    'change',
    (event) => {
      const input = event.target as HTMLInputElement,
        file = input.files?.[0];
      input.value = '';
      if (!file) return;
      void operation(async (state, sequence) => {
        if (file.size > DRAFT_BACKUP_BYTES) throw new DraftError('invalid');
        let value: unknown;
        try {
          value = JSON.parse(await file.text());
        } catch {
          throw new DraftError('invalid');
        }
        await restore(value, state, sequence);
      });
    },
    { signal },
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) void autosave.flush();
    },
    { signal },
  );
  controls();
  return () => {
    if (disposed) return;
    disposed = true;
    abort.abort();
    disposeLanguage();
    requestSequence++;
    listSequence++;
    operationAbort?.abort();
    if (dialog.open) dialog.close();
    void autosave.close().finally(() => store.close());
    disposeModalLanguage();
    dialog.remove();
    host.replaceChildren();
  };
}
