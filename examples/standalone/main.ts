import {RecordController} from '@banora/sdk/controller';
import type {CommandResult} from '@banora/sdk/controller';
import {decodeSgf, parseSgf} from '@banora/sdk/sgf';
import {mountViewer} from '@banora/sdk/viewer';
import sample from './sample.sgf?raw';
import './style.css';

function element<T extends HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing element: ${id}`);
  return result as T;
}

const controller = new RecordController({sgf: sample});
const view = mountViewer(element('viewer'), {
  controller,
  editable: true,
  board: {touch: {mode: 'release'}},
});
const file = element<HTMLInputElement>('file');
const dialog = element<HTMLDialogElement>('unsaved');
const status = element('status');
let filename = 'opening-study.sgf';
let opening = false;
let disposed = false;
const urls = new Map<string, ReturnType<typeof setTimeout>>();
const events = new AbortController();

function report(result: CommandResult): boolean {
  if (!result.ok) {
    status.textContent = result.diagnostics?.map(item => item.message).join('; ')
      ?? `Action rejected: ${result.reason.replaceAll('-', ' ')}.`;
  }
  return result.ok;
}

const unsubscribe = controller.subscribe(state => {
  element('record-state').textContent = `${filename} · Move ${state.position.moveNumber} · ${state.dirty ? 'Unsaved changes' : 'No changes'}`;
});

function save(): boolean {
  const ticket = controller.prepareExport();
  let url: string | undefined;
  try {
    url = URL.createObjectURL(new Blob([ticket.text], {type: 'application/x-go-sgf;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    if (!report(controller.acknowledgeExport(ticket.id))) return false;
    status.textContent = 'SGF download started. Keep the downloaded file before leaving.';
    return true;
  } catch (error) {
    controller.cancelExport(ticket.id);
    status.textContent = `Could not save the record: ${String(error)}`;
    return false;
  } finally {
    if (url) {
      const currentUrl = url;
      urls.set(currentUrl, setTimeout(() => {
        URL.revokeObjectURL(currentUrl);
        urls.delete(currentUrl);
      }, 30_000));
    }
  }
}

async function approveReplacement(): Promise<boolean> {
  if (!controller.getState().dirty) return true;
  return new Promise(resolve => {
    dialog.returnValue = 'cancel';
    dialog.addEventListener('close', () => resolve(!disposed && (
      dialog.returnValue === 'discard' || (dialog.returnValue === 'export' && save())
    )), {once: true});
    dialog.showModal();
  });
}

async function open(input: string | File, name: string): Promise<void> {
  if (opening || disposed) return;
  if (input instanceof File && input.size > 5 * 1024 * 1024) {
    status.textContent = 'SGF files must be no larger than 5 MiB.';
    return;
  }
  opening = true;
  const buttons = ['open', 'sample', 'new'].map(id => element<HTMLButtonElement>(id));
  for (const button of buttons) button.disabled = true;
  try {
    const bytes = typeof input === 'string' ? input : new Uint8Array(await input.arrayBuffer());
    if (disposed) return;
    const parsed = typeof bytes === 'string' ? parseSgf(bytes) : decodeSgf(bytes);
    if (!parsed.ok) {
      status.textContent = parsed.diagnostics.map(item => item.message).join('; ');
      return;
    }
    const approvedRecord = controller.getState().record;
    if (!await approveReplacement() || disposed) return;
    if (controller.getState().record !== approvedRecord) {
      status.textContent = 'The record changed while opening the file. Open it again.';
      return;
    }
    const oldName = filename;
    // oxlint-disable-next-line eslint/no-control-regex -- Remove control characters from download filenames.
    filename = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 100) || 'record.sgf';
    if (!/\.sgf$/i.test(filename)) filename += '.sgf';
    if (!report(controller.loadSgf(bytes, {discardChanges: true}))) {
      filename = oldName;
      return;
    }
    status.textContent = `Opened ${filename}. Files stay in this browser.`;
  } catch (error) {
    if (!disposed) status.textContent = `Could not open the file: ${String(error)}`;
  } finally {
    opening = false;
    for (const button of buttons) button.disabled = false;
  }
}

element('open').addEventListener('click', () => file.click(), {signal: events.signal});
file.addEventListener('change', () => {
  const selected = file.files?.[0];
  file.value = '';
  if (selected) void open(selected, selected.name);
}, {signal: events.signal});
element('sample').addEventListener('click', () => {void open(sample, 'opening-study.sgf');}, {signal: events.signal});
element('new').addEventListener('click', () => {void open('(;FF[4]GM[1]CA[UTF-8]SZ[19])', 'untitled.sgf');}, {signal: events.signal});
element('save').addEventListener('click', save, {signal: events.signal});
element<HTMLInputElement>('editing').addEventListener('change', event => {
  view.update({editable: (event.currentTarget as HTMLInputElement).checked});
}, {signal: events.signal});
window.addEventListener('beforeunload', event => {
  if (!controller.getState().dirty) return;
  event.preventDefault();
  event.returnValue = '';
}, {signal: events.signal});
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  disposed = true;
  if (dialog.open) dialog.close('cancel');
  events.abort();
  view.dispose();
  unsubscribe();
  controller.dispose();
  for (const [url, timer] of urls) {clearTimeout(timer); URL.revokeObjectURL(url);}
  urls.clear();
}, {signal: events.signal});
