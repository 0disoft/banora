import { mountBoard } from './board.js';
import type { BoardOptions, BoardView, DiagramOptions } from './board.js';
import { RecordController } from './controller.js';
import type { CommandResult, ControllerState } from './controller.js';
import { pointFromSgf } from './sgf.js';
import type { SgfNode } from './sgf.js';

export interface ViewerOptions {
  readonly controller?: RecordController;
  readonly sgf?: string | Uint8Array;
  readonly editable?: boolean;
  readonly comments?: boolean;
  readonly variations?: boolean;
  readonly board?: Omit<BoardOptions, 'controller' | 'readOnly' | 'nodeId'>;
}
export interface ViewerView {
  readonly controller: RecordController;
  update(options: Omit<ViewerOptions, 'controller' | 'sgf'>): void;
  exportSvg(options?: DiagramOptions): string;
  exportPng(options?: DiagramOptions): Promise<Blob>;
  dispose(): void;
}

const stylesheet = `
.banora-viewer{font:14px system-ui;color:var(--banora-text,#294738);background:var(--banora-surface,#fafbf5);border:1px solid #d9e1d4;border-radius:12px;padding:18px;box-sizing:border-box;max-width:100%;min-width:0}
.banora-viewer header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.banora-viewer h2{font-size:16px;margin:0}.banora-viewer button,.banora-viewer select{font:inherit;color:inherit;border:1px solid #cfd9cb;background:#fff;border-radius:7px;padding:8px 11px;cursor:pointer}.banora-viewer button:disabled{opacity:.4;cursor:default}.banora-viewer button:focus-visible,.banora-viewer select:focus-visible,.banora-viewer textarea:focus-visible{outline:3px solid #589474;outline-offset:3px}
.banora-viewer nav{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:7px;margin-top:14px}.banora-viewer [data-summary]{font-size:12px;text-align:center;margin:12px 0}.banora-viewer [data-tree]{max-height:220px;overflow:auto;display:grid;gap:3px;margin-top:10px}.banora-viewer [data-tree] button{text-align:left;width:100%;border:0;background:transparent}.banora-viewer [data-tree] button[aria-current=true]{background:#e3efdf;font-weight:600}.banora-viewer details{margin-top:16px}.banora-viewer summary{cursor:pointer}.banora-viewer [data-notes]{display:block;margin-top:16px}.banora-viewer textarea{display:block;width:100%;min-height:100px;box-sizing:border-box;resize:vertical;font:inherit;line-height:1.6;border:1px solid #d2dccd;border-radius:8px;margin-top:7px;padding:10px;background:#fff;color:inherit}.banora-viewer [data-status]{font-size:12px;color:#687b69;margin:12px 0 0}.banora-viewer [hidden]{display:none!important}
`;

export function mountViewer(container: HTMLElement, initial: ViewerOptions = {}): ViewerView {
  if (initial.controller && initial.sgf !== undefined)
    throw new TypeError('Supply a controller or SGF, not both');
  const document = container.ownerDocument;
  const owned = !initial.controller;
  const controller = initial.controller ?? new RecordController({ sgf: initial.sgf });
  controller.getState();
  let options = { ...initial, board: { ...initial.board } };
  let disposed = false;
  let closeCommentGroup: (() => void) | undefined;
  const endCommentGroup = () => {
    closeCommentGroup?.();
    closeCommentGroup = undefined;
  };
  const abort = new AbortController();
  const root = document.createElement('section');
  root.className = 'banora-viewer';
  root.setAttribute('aria-label', 'Go record viewer');
  const style = document.createElement('style');
  style.textContent = stylesheet;
  const header = document.createElement('header');
  const title = document.createElement('h2');
  const gameLabel = document.createElement('label');
  gameLabel.textContent = 'Game ';
  const games = document.createElement('select');
  games.setAttribute('aria-label', 'Select game');
  gameLabel.append(games);
  header.append(title, gameLabel);
  const boardContainer = document.createElement('div');
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Record navigation');
  const move = document.createElement('span');
  const summary = document.createElement('p');
  summary.dataset.summary = '';
  const status = document.createElement('p');
  status.dataset.status = '';
  status.setAttribute('role', 'status');
  const report = (result: CommandResult) => {
    status.textContent = result.ok
      ? ''
      : (result.diagnostics?.map((item) => item.message).join('; ') ??
        `Action rejected: ${result.reason}`);
  };
  const button = (label: string, text: string, action: () => CommandResult) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = text;
    element.setAttribute('aria-label', label);
    element.addEventListener('click', () => report(action()), { signal: abort.signal });
    return element;
  };
  const first = button('First node', '|←', () =>
    controller.goTo(controller.getState().record.games[controller.getState().gameIndex]!.id),
  );
  const previous = button('Previous move', '←', () => controller.previous());
  const next = button('Next move', '→', () => controller.next());
  const last = button('Last node', '→|', () => {
    let node = controller.getState().node;
    while (node.children[0]) node = node.children[0];
    return controller.goTo(node.id);
  });
  const pass = button('Pass', 'Pass', () => controller.play(null));
  const undo = button('Undo', 'Undo', () => controller.undo());
  const redo = button('Redo', 'Redo', () => controller.redo());
  nav.append(first, previous, move, next, last, pass, undo, redo);
  const variations = document.createElement('details');
  const treeTitle = document.createElement('summary');
  treeTitle.textContent = 'Variations';
  const tree = document.createElement('div');
  tree.dataset.tree = '';
  tree.setAttribute('role', 'list');
  const treeNote = document.createElement('p');
  treeNote.dataset.status = '';
  variations.append(treeTitle, tree, treeNote);
  const notes = document.createElement('label');
  notes.dataset.notes = '';
  notes.textContent = 'Comments';
  const comment = document.createElement('textarea');
  comment.setAttribute('aria-label', 'Position comments');
  notes.append(comment);
  root.append(style, header, boardContainer, nav, summary, variations, notes, status);
  container.append(root);
  let board: BoardView;
  try {
    board = mountBoard(boardContainer, {
      ...options.board,
      controller,
      readOnly: !options.editable,
      nodeId: null,
    });
  } catch (error) {
    root.remove();
    abort.abort();
    if (owned) controller.dispose();
    throw error;
  }
  let lastTree: { record: ControllerState['record']; selected: string } | undefined;

  function nodeName(node: SgfNode, state: ControllerState): string {
    const value = node.properties.B?.[0] ?? node.properties.W?.[0];
    if (value === undefined)
      return (
        node.properties.N?.[0] ??
        (node.id === state.record.games[state.gameIndex]!.id ? 'Start position' : 'Annotation')
      );
    const color = node.properties.B ? 'Black' : 'White';
    if (!value || (value === 'tt' && state.position.width <= 19 && state.position.height <= 19))
      return `${color} pass`;
    const point = pointFromSgf(value, state.position.width, state.position.height);
    return `${color} ${'ABCDEFGHJKLMNOPQRSTUVWXYZ'[point.x] ?? point.x + 1}${state.position.height - point.y}`;
  }
  function renderTree(state: ControllerState): void {
    if (lastTree?.record === state.record && lastTree.selected === state.node.id) return;
    lastTree = { record: state.record, selected: state.node.id };
    const focusInside = tree.contains(document.activeElement);
    const fragment = document.createDocumentFragment();
    const pending = [{ node: state.record.games[state.gameIndex]!, indent: 0 }];
    let count = 0;
    let selected: HTMLButtonElement | undefined;
    const row = (node: SgfNode, indent: number) => {
      const item = document.createElement('div');
      item.setAttribute('role', 'listitem');
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.textContent = nodeName(node, state);
      entry.setAttribute('aria-label', `Select ${nodeName(node, state)}`);
      entry.dataset.node = node.id;
      entry.style.paddingLeft = `${10 + Math.min(indent, 8) * 12}px`;
      entry.setAttribute('aria-current', String(node.id === state.node.id));
      if (node.id === state.node.id) selected = entry;
      item.append(entry);
      fragment.append(item);
    };
    while (pending.length && count++ < 500) {
      const item = pending.pop()!;
      row(item.node, item.indent);
      for (let i = item.node.children.length - 1; i >= 0; i--)
        pending.push({ node: item.node.children[i]!, indent: item.indent + (i > 0 ? 1 : 0) });
    }
    if (!selected) row(state.node, 0);
    tree.replaceChildren(fragment);
    treeNote.textContent = pending.length
      ? 'First 500 nodes shown; move controls navigate the complete record.'
      : '';
    if (focusInside) selected?.focus({ preventScroll: true });
  }
  function render(state: ControllerState): void {
    const game = state.record.games[state.gameIndex]!;
    title.textContent = game.properties.GN?.[0] ?? 'Go record';
    games.replaceChildren(
      ...state.record.games.map((game, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = game.properties.GN?.[0] ?? `Game ${index + 1}`;
        return option;
      }),
    );
    games.value = String(state.gameIndex);
    gameLabel.hidden = state.record.games.length < 2;
    move.textContent = `Move ${state.position.moveNumber}`;
    first.disabled = previous.disabled = state.path.length < 2;
    next.disabled = last.disabled = state.node.children.length === 0;
    undo.disabled = !state.canUndo;
    redo.disabled = !state.canRedo;
    undo.hidden = redo.hidden = pass.hidden = !options.editable;
    summary.textContent = `${game.properties.PB?.[0] ?? 'Black'} / ${game.properties.PW?.[0] ?? 'White'} · ${state.position.toPlay} to play · Captures ${state.position.captures.black} / ${state.position.captures.white}`;
    comment.readOnly = !options.editable;
    const text = state.node.properties.C?.[0] ?? '';
    if (comment.value !== text) comment.value = text;
    notes.hidden = options.comments === false;
    variations.hidden = options.variations === false;
    renderTree(state);
  }
  const unsubscribe = controller.subscribe(render);
  tree.addEventListener(
    'click',
    (event) => {
      const element = event.target as Element;
      const entry = element.closest<HTMLButtonElement>('button[data-node]');
      if (entry && tree.contains(entry)) report(controller.goTo(entry.dataset.node!));
    },
    { signal: abort.signal },
  );
  games.addEventListener(
    'change',
    () => report(controller.goTo(controller.getState().record.games[Number(games.value)]!.id)),
    { signal: abort.signal },
  );
  comment.addEventListener(
    'focus',
    () => {
      if (options.editable) closeCommentGroup = controller.beginEditGroup();
    },
    { signal: abort.signal },
  );
  comment.addEventListener('blur', endCommentGroup, { signal: abort.signal });
  comment.addEventListener(
    'input',
    () => {
      if (!options.editable) return;
      const result = controller.setComment(comment.value);
      report(result);
      if (!result.ok) comment.value = controller.getState().node.properties.C?.[0] ?? '';
    },
    { signal: abort.signal },
  );
  return Object.freeze({
    controller,
    exportSvg: (config?: DiagramOptions) => board.exportSvg(config),
    exportPng: (config?: DiagramOptions) => board.exportPng(config),
    update(next: Omit<ViewerOptions, 'controller' | 'sgf'>) {
      if (disposed) throw new Error('Viewer is disposed');
      const previous = options;
      const merged = { ...options, ...next, board: { ...options.board, ...next.board } };
      board.update({ ...merged.board, readOnly: !merged.editable, nodeId: null });
      options = merged;
      if ((previous.editable && !options.editable) || next.comments === false) endCommentGroup();
      render(controller.getState());
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      endCommentGroup();
      abort.abort();
      unsubscribe();
      board.dispose();
      root.remove();
      if (owned) controller.dispose();
    },
  });
}
