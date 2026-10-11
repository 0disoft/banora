import { localizeUi, setUiText } from './ui-language.js';
import { createShareLink, decodeShareLink } from '@banora/sdk/share';
import type { ShareKind, SharedRecord } from '@banora/sdk/share';
import type { RecordController, SgfRecord } from '@banora/sdk';
import './sharing-controls.css';

// One initial address per document, not every controller swap/widget remount.
let initialHandled = false;
export interface SharingOptions {
  readonly replace?: (record: SharedRecord, signal: AbortSignal) => Promise<boolean>;
}

/** Example-only UI. The controller is borrowed; codec/import use public SDK APIs. */
export function mountSharing(
  host: HTMLElement,
  controller: RecordController,
  options: SharingOptions = {},
): () => void {
  const abort = new AbortController(),
    { signal } = abort;
  const panel = document.createElement('section');
  panel.className = 'sharing-controls';
  panel.innerHTML = `<h2>Share a record or position</h2>
    <div class="sharing-row"><label>Content <select data-share="kind"><option value="node">Record at this node</option><option value="record">Full record</option><option value="position">Current position only</option></select></label>
    <label data-share="comment-control" hidden><input type="checkbox" data-share="comment"> Include this node's comment</label>
    <button type="button" data-share="create">Create link</button></div>
    <p data-share="notice"></p>
    <label>Created link <textarea data-share="output" rows="2" readonly placeholder="Create a link, then copy it." spellcheck="false"></textarea></label>
    <div class="sharing-row"><button type="button" data-share="copy" disabled>Copy link</button></div>
    <label>Open a shared link <textarea data-share="input" rows="2" placeholder="Paste a Banora share link here." spellcheck="false"></textarea></label>
    <button type="button" data-share="open">Open link</button>
    <p data-share="status" role="status"></p>`;
  const find = <T extends HTMLElement>(name: string) =>
    panel.querySelector<T>(`[data-share="${name}"]`)!;
  const kind = find<HTMLSelectElement>('kind'),
    comment = find<HTMLInputElement>('comment');
  const output = find<HTMLTextAreaElement>('output'),
    input = find<HTMLTextAreaElement>('input');
  const copy = find<HTMLButtonElement>('copy'),
    open = find<HTMLButtonElement>('open'),
    status = find('status');
  const dialog = document.createElement('dialog');
  dialog.dataset.share = 'guard';
  dialog.innerHTML =
    '<form method="dialog"><h2>This record has changes.</h2><p>Export a copy before opening the shared record, or discard your changes.</p><div class="sharing-row"><button value="cancel">Cancel</button><button value="discard">Discard</button><button value="export">Export &amp; continue</button></div></form>';
  panel.append(dialog);
  host.append(panel);
  const disposeLanguage = localizeUi(panel);
  let feedbackRevision = 0;
  const report = (message: string) => {
    if (signal.aborted) return;
    feedbackRevision++;
    setUiText(status, message);
  };
  const notice = () => {
    const position = kind.value === 'position';
    find('comment-control').hidden = !position;
    setUiText(
      find('notice'),
      position
        ? 'Position only. Anyone with the link can view it.'
        : 'Anyone with the link can view this record.',
    );
  };
  notice();
  kind.addEventListener('change', notice, { signal });
  find('create').addEventListener(
    'click',
    () => {
      const result = createShareLink(controller.getState(), location.href, {
        kind: kind.value as ShareKind,
        includeComment: comment.checked,
      });
      if (!result.ok) {
        output.value = '';
        copy.disabled = true;
        report(result.message);
        return;
      }
      output.value = result.value;
      copy.disabled = false;
      report('Link created.');
    },
    { signal },
  );
  copy.addEventListener(
    'click',
    () => {
      // Capture the exact displayed link before an asynchronous clipboard write.
      const text = output.value;
      const revision = ++feedbackRevision;
      const reportCopy = (message: string) => {
        if (revision === feedbackRevision && output.value === text) report(message);
      };
      output.focus();
      output.select();
      void (async () => {
        try {
          await navigator.clipboard.writeText(text);
          reportCopy('Link copied.');
        } catch {
          reportCopy('Clipboard unavailable. Select the created link and copy it manually.');
        }
      })();
    },
    { signal },
  );

  function exportRecord(): boolean {
    const ticket = controller.prepareExport();
    let url: string | undefined;
    try {
      url = URL.createObjectURL(
        new Blob([ticket.text], { type: 'application/x-go-sgf;charset=utf-8' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'banora-record.sgf';
      document.body.append(link);
      link.click();
      link.remove();
      const result = controller.acknowledgeExport(ticket.id);
      return result.ok && !controller.getState().dirty;
    } catch {
      controller.cancelExport(ticket.id);
      report('SGF download failed. The shared record was not opened.');
      return false;
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 30_000);
    }
  }
  function mayReplace(): Promise<SgfRecord | null> {
    if (!controller.getState().dirty) return Promise.resolve(controller.getState().record);
    return new Promise((resolve) => {
      const finish = (record: SgfRecord | null) => {
        dialog.removeEventListener('close', closed);
        signal.removeEventListener('abort', cancel);
        if (dialog.open) dialog.close('cancel');
        resolve(record);
      };
      const cancel = () => finish(null);
      const closed = () => {
        const allowed =
          dialog.returnValue === 'discard' || (dialog.returnValue === 'export' && exportRecord());
        finish(allowed ? controller.getState().record : null);
      };
      dialog.returnValue = 'cancel';
      dialog.addEventListener('close', closed, { once: true });
      signal.addEventListener('abort', cancel, { once: true });
      dialog.showModal();
    });
  }
  let busy = false;
  async function openLink(text: string): Promise<void> {
    if (busy || signal.aborted) return;
    // Pending clipboard feedback must not cover this import's result or approval.
    feedbackRevision++;
    const decoded = decodeShareLink(text.trim());
    if (!decoded.ok) {
      report(decoded.message);
      return;
    }
    busy = true;
    open.disabled = true;
    try {
      if (options.replace) {
        if (!(await options.replace(decoded.value, signal))) {
          report('Shared record was not opened.');
          return;
        }
      } else {
        const approved = await mayReplace();
        if (signal.aborted) return;
        if (!approved) {
          report('Opening cancelled. Current record retained.');
          return;
        }
        if (controller.getState().record !== approved) {
          report('Record changed during approval. Open the link again.');
          return;
        }
        const result = controller.loadSgf(decoded.value.sgf, {
          locator: decoded.value.locator,
          discardChanges: true,
        });
        if (!result.ok) {
          report(`Shared record was not opened: ${result.reason}.`);
          return;
        }
      }
      report(
        decoded.value.kind === 'position'
          ? 'Opened a static position. Capture and repetition history are not included.'
          : 'Opened the shared record at its saved target.',
      );
    } catch (error) {
      report(`Could not open the share: ${String(error)}`);
    } finally {
      busy = false;
      if (!signal.aborted) open.disabled = false;
    }
  }
  open.addEventListener(
    'click',
    () => {
      void openLink(input.value);
    },
    { signal },
  );
  const openAddress = () => {
    if (!location.hash.startsWith('#banora=')) return;
    input.value = location.href;
    if (busy) {
      report('Finish or cancel the current import, then open the new address link.');
      return;
    }
    void openLink(input.value).finally(() => {
      if (!signal.aborted) initialHandled = true;
    });
  };
  window.addEventListener('hashchange', openAddress, { signal });
  if (!initialHandled) openAddress();
  const dispose = () => {
    abort.abort();
    disposeLanguage();
    panel.remove();
  };
  window.addEventListener(
    'pagehide',
    (event) => {
      if (!event.persisted) dispose();
    },
    { signal },
  );
  return dispose;
}
