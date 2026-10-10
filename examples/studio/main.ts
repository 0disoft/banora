import { RecordController, decodeSgf, mountBoard, parseSgf } from '@banora/sdk';
import type { CommandResult, ControllerState, MarkerKind, SgfNode } from '@banora/sdk';
import sample from '../fixtures/study.sgf?raw';

const find = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const controller = new RecordController({ sgf: sample });
const comment = find<HTMLTextAreaElement>('comment');
const tool = find<HTMLSelectElement>('tool');
const status = find('status');
const dialog = find<HTMLDialogElement>('unsaved');
const file = find<HTMLInputElement>('file');
const games = find<HTMLSelectElement>('games');
let filename = 'opening-study.sgf';
let opening = false;
let lastTreeState: { record: ControllerState['record']; id: string } | undefined;

function report(result: CommandResult): void {
  if (!result.ok) status.textContent = result.diagnostics?.map(item => item.message).join('; ') ?? `Action rejected: ${result.reason.replaceAll('-', ' ')}.`;
}
const view = mountBoard(find('board'), { controller, onPoint(point) {
  const mode = tool.value;
  if (mode === 'play') report(controller.play(point));
  else {
    const existing = controller.getState().markers.find(marker => marker.point.x === point.x && marker.point.y === point.y);
    const kind = mode === 'erase' || existing?.kind === mode ? null : mode as MarkerKind;
    report(controller.setMarker(point, kind, find<HTMLInputElement>('label-text').value || 'A'));
  }
} });

function nodeTitle(node: SgfNode, depth: number, width: number, height: number): string {
  const value = node.properties.B?.[0] ?? node.properties.W?.[0];
  const color = node.properties.B ? 'Black' : 'White';
  if (value === undefined) return depth === 0 ? 'Start position' : node.properties.N?.[0] ?? 'Annotation';
  if (!value || (value === 'tt' && width <= 19 && height <= 19)) return `${color} pass`;
  const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const x = alphabet.indexOf(value[0]!);
  const y = alphabet.indexOf(value[1]!);
  return `${color} ${letters[x] ?? x + 1}${height - y}`;
}
function renderTree(state: ControllerState): void {
  if (lastTreeState?.record === state.record && lastTreeState.id === state.node.id) return;
  lastTreeState = { record: state.record, id: state.node.id };
  const fragment = document.createDocumentFragment();
  const pending = [{ node: state.record.games[state.gameIndex]!, depth: 0, indent: 0 }];
  const shown = new Set<string>();
  let count = 0;
  const row = (node: SgfNode, depth: number, indent: number) => {
    const wrapper = document.createElement('div'); wrapper.setAttribute('role', 'listitem');
    const button = document.createElement('button'); button.setAttribute('aria-current', String(node.id === state.node.id));
    button.style.paddingLeft = `${10 + Math.min(indent, 8) * 13}px`;
    const dot = document.createElement('span'); dot.className = `tree-dot ${node.properties.W ? 'white' : node.properties.B ? '' : 'root'}`;
    const text = document.createElement('span'); text.textContent = nodeTitle(node, depth, state.position.width, state.position.height);
    button.append(dot, text); button.addEventListener('click', () => report(controller.goTo(node.id)));
    wrapper.append(button); fragment.append(wrapper); shown.add(node.id);
  };
  while (pending.length && count++ < 500) {
    const entry = pending.pop()!; row(entry.node, entry.depth, entry.indent);
    for (let i = entry.node.children.length - 1; i >= 0; i--) pending.push({ node: entry.node.children[i]!, depth: entry.depth + 1, indent: entry.indent + (i > 0 ? 1 : 0) });
  }
  if (!shown.has(state.node.id)) row(state.node, state.path.length - 1, 0);
  find('tree').replaceChildren(fragment);
  find('tree-note').textContent = pending.length ? 'First 500 nodes shown. Move controls can navigate the whole record.' : '';
}
const unsubscribe = controller.subscribe(state => {
  const root = state.record.games[state.gameIndex]!;
  find('game-name').textContent = root.properties.GN?.[0] ?? filename.replace(/\.sgf$/i, '');
  find('black-name').textContent = root.properties.PB?.[0] ?? 'Black';
  find('white-name').textContent = root.properties.PW?.[0] ?? 'White';
  find('board-info').textContent = `${state.position.width} × ${state.position.height} / ${root.properties.KM?.[0] ?? 'not specified'}`;
  find('turn').textContent = `${state.position.toPlay === 'black' ? '● Black' : '○ White'} to play`;
  find('captures').textContent = `Captures  ● ${state.position.captures.black}  ○ ${state.position.captures.white}`;
  find('move').textContent = `Move ${state.position.moveNumber}`;
  find('dirty').textContent = state.dirty ? 'Unsaved changes' : 'No changes';
  find('dirty').classList.toggle('changed', state.dirty);
  find<HTMLButtonElement>('undo').disabled = !state.canUndo;
  find<HTMLButtonElement>('redo').disabled = !state.canRedo;
  find<HTMLButtonElement>('previous').disabled = state.path.length <= 1;
  find<HTMLButtonElement>('first').disabled = state.path.length <= 1;
  find<HTMLButtonElement>('next').disabled = state.node.children.length === 0;
  find<HTMLButtonElement>('last').disabled = state.node.children.length === 0;
  const text = state.node.properties.C?.[0] ?? '';
  if (comment.value !== text) comment.value = text;
  if (games.options.length !== state.record.games.length || games.dataset.record !== state.record.games.map(root => root.id + (root.properties.GN?.[0] ?? '')).join('|')) {
    games.replaceChildren(...state.record.games.map((root, index) => {
      const option = document.createElement('option'); option.value = String(index); option.textContent = root.properties.GN?.[0] ?? `Game ${index + 1}`; return option;
    }));
    games.dataset.record = state.record.games.map(root => root.id + (root.properties.GN?.[0] ?? '')).join('|');
  }
  games.value = String(state.gameIndex);
  renderTree(state);
});

function exportRecord(): boolean {
  const ticket = controller.prepareExport();
  let url: string | undefined;
  try {
    url = URL.createObjectURL(new Blob([ticket.text], { type: 'application/x-go-sgf;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
    report(controller.acknowledgeExport(ticket.id));
    status.textContent = 'SGF download started. Keep the exported file before leaving this page.';
    return true;
  } catch (error) {
    controller.cancelExport(ticket.id);
    status.textContent = `Export failed: ${String(error)}`;
    return false;
  } finally { if (url) setTimeout(() => URL.revokeObjectURL(url!), 30_000); }
}
async function mayReplace(): Promise<boolean> {
  if (!controller.getState().dirty) return true;
  return new Promise(resolve => {
    dialog.returnValue = 'cancel';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'discard' ||
      (dialog.returnValue === 'export' && exportRecord())), { once: true });
    dialog.showModal();
  });
}
async function openRecord(input: string | Uint8Array, name: string): Promise<void> {
  if (opening) return;
  opening = true;
  try {
    const parsed = typeof input === 'string' ? parseSgf(input) : decodeSgf(input);
    if (!parsed.ok) { status.textContent = parsed.diagnostics.map(item => item.message).join('; '); return; }
    if (!await mayReplace()) return;
    const previousName = filename;
    filename = name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100);
    const result = controller.loadSgf(input, { discardChanges: true });
    if (!result.ok) { filename = previousName; report(result); return; }
    status.textContent = `Opened ${filename}. Everything stays local.`;
  } finally { opening = false; }
}
async function openFile(selected?: File): Promise<void> {
  if (!selected) return;
  if (selected.size > 5 * 1024 * 1024) { status.textContent = 'SGF file exceeds the 5 MiB input limit.'; return; }
  try { await openRecord(new Uint8Array(await selected.arrayBuffer()), selected.name); }
  catch (error) { status.textContent = `Could not open file: ${String(error)}`; }
}
find('open').addEventListener('click', () => file.click());
file.addEventListener('change', () => { void openFile(file.files?.[0]); file.value = ''; });
find('sample').addEventListener('click', () => { void openRecord(sample, 'opening-study.sgf'); });
find('new').addEventListener('click', () => { void openRecord('(;FF[4]GM[1]CA[UTF-8]SZ[19])', 'untitled.sgf'); });
find('export').addEventListener('click', exportRecord);
find('previous').addEventListener('click', () => report(controller.previous()));
find('next').addEventListener('click', () => report(controller.next()));
find('first').addEventListener('click', () => report(controller.goTo(controller.getState().record.games[controller.getState().gameIndex]!.id)));
find('last').addEventListener('click', () => { let node = controller.getState().node; while (node.children[0]) node = node.children[0]; report(controller.goTo(node.id)); });
find('pass').addEventListener('click', () => report(controller.play(null)));
find('undo').addEventListener('click', () => report(controller.undo()));
find('redo').addEventListener('click', () => report(controller.redo()));
comment.addEventListener('focus', () => controller.beginEditGroup());
comment.addEventListener('input', () => report(controller.setComment(comment.value)));
comment.addEventListener('blur', () => controller.endEditGroup());
tool.addEventListener('change', () => { find('label-control').hidden = tool.value !== 'label'; });
find<HTMLSelectElement>('theme').addEventListener('change', event => view.update({ theme: (event.target as HTMLSelectElement).value as 'wood' | 'flat' }));
find<HTMLInputElement>('numbers').addEventListener('change', event => view.update({ moveNumbers: (event.target as HTMLInputElement).checked }));
games.addEventListener('change', () => report(controller.goTo(controller.getState().record.games[Number(games.value)]!.id)));
document.addEventListener('keydown', event => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); report(event.shiftKey ? controller.redo() : controller.undo()); }
});
window.addEventListener('beforeunload', event => { if (controller.getState().dirty) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('pagehide', event => { if (!event.persisted) { view.dispose(); unsubscribe(); controller.dispose(); } });
let dragDepth = 0;
document.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
document.addEventListener('dragenter', event => { if (event.dataTransfer?.types.includes('Files')) { dragDepth++; document.body.classList.add('dragging'); } });
document.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
document.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; document.body.classList.remove('dragging'); void openFile(event.dataTransfer?.files[0]); });
