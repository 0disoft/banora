import { createUiMessages, createBoardLabels, formatUiMessage } from './locale.js';
import type { LocaleOptions } from './locale.js';
import { mountBoard } from './board.js';
import type { BoardOptions, BoardView, DiagramOptions } from './board.js';
import { RecordController, getMoveAssessment } from './controller.js';
import type { CommandResult, ControllerState } from './controller.js';
import { pointFromSgf } from './sgf.js';
import type { SgfNode } from './sgf.js';
import { mountPlaybackControls } from './playback-controls.js';
import { normalizePlaybackInterval } from './playback.js';
import type { PlaybackOptions, RecordPlayback } from './playback.js';
import { selectStyles } from './select-style.js';
import { getVariationRows } from './variations.js';

export interface ViewerOptions extends LocaleOptions {
  readonly controller?: RecordController;
  readonly sgf?: string | Uint8Array;
  readonly editable?: boolean;
  readonly comments?: boolean;
  readonly variations?: boolean;
  /** Keep fork candidates visible and expand only the selected path. Default: all rows. */
  readonly variationMode?: 'all' | 'focused';
  readonly playback?: PlaybackOptions;
  readonly board?: Omit<BoardOptions, 'controller' | 'readOnly' | 'nodeId'>;
}
export interface ViewerView {
  readonly controller: RecordController;
  readonly playback: RecordPlayback;
  update(options: Omit<ViewerOptions, 'controller' | 'sgf'>): void;
  exportSvg(options?: DiagramOptions): string;
  exportPng(options?: DiagramOptions): Promise<Blob>;
  dispose(): void;
}

const stylesheet = `${selectStyles('.banora-viewer')}
.banora-viewer .banora-move-assessment{display:inline-block;flex:none;width:16px;height:16px;margin-left:auto;background:currentColor}.banora-viewer .banora-move-assessment.good{color:#337858;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cg fill='none' stroke='black' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='10' cy='10' r='7.5'/%3E%3Cpath d='m6.5 10 2.4 2.5 4.8-5'/%3E%3C/g%3E%3C/svg%3E") center/contain no-repeat}.banora-viewer .banora-move-assessment.bad{color:#ae5042;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cg fill='none' stroke='black' stroke-width='1.6' stroke-linecap='round'%3E%3Ccircle cx='10' cy='10' r='7.5'/%3E%3Cpath d='m7 7 6 6m0-6-6 6'/%3E%3C/g%3E%3C/svg%3E") center/contain no-repeat}.banora-viewer .banora-move-assessment+.banora-comment-indicator{margin-left:0}
.banora-viewer .variation-disclosure{width:10px;height:10px;flex:none;display:grid;place-items:center}.banora-viewer button[aria-expanded] .variation-disclosure::before{content:'';display:block;width:10px;height:10px;background:currentColor;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='m4 2 4 4-4 4' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat}.banora-viewer button[aria-expanded=true] .variation-disclosure::before{transform:rotate(90deg)}
.banora-viewer{font:15px system-ui;color:var(--banora-text,#294738);background:var(--banora-surface,#fafbf5);border:1px solid #d9e1d4;border-radius:12px;padding:18px;box-sizing:border-box;max-width:100%;min-width:0}
.banora-viewer header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.banora-viewer h2{font-size:17px;margin:0}.banora-viewer button,.banora-viewer select{font:inherit;color:inherit;border:1px solid #cfd9cb;background:#fff;border-radius:7px;padding:8px 11px;cursor:pointer}.banora-viewer button:disabled{opacity:.4;cursor:default}.banora-viewer button:focus-visible,.banora-viewer select:focus-visible,.banora-viewer textarea:focus-visible{outline:3px solid #589474;outline-offset:3px}
.banora-viewer nav{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:7px;margin-top:14px}.banora-viewer [data-summary]{font-size:13px;text-align:center;margin:12px 0}.banora-viewer [data-tree]{max-height:220px;overflow:auto;display:grid;gap:3px;margin-top:10px}.banora-viewer [data-tree] button{display:flex;align-items:center;gap:8px;text-align:left;width:100%;border:0;background:transparent}.banora-viewer [data-tree] button[aria-current=true]{background:#e3efdf;font-weight:600}.banora-viewer .banora-comment-indicator{display:inline-flex;flex:none;margin-left:auto;opacity:.8}.banora-viewer details{margin-top:16px}.banora-viewer summary{cursor:pointer}.banora-viewer [data-notes]{display:block;margin-top:16px}.banora-viewer textarea{display:block;width:100%;min-height:100px;box-sizing:border-box;resize:vertical;font:inherit;line-height:1.6;border:1px solid #d2dccd;border-radius:8px;margin-top:7px;padding:10px;background:#fff;color:inherit}.banora-viewer [data-status]{font-size:13px;color:#687b69;margin:12px 0 0}.banora-viewer [hidden]{display:none!important}
`;

export function mountViewer(container: HTMLElement, initial: ViewerOptions = {}): ViewerView {
  if (initial.controller && initial.sgf !== undefined)
    throw new TypeError('Supply a controller or SGF, not both');
  let ui = createUiMessages(initial);
  const initialInterval = normalizePlaybackInterval(initial.playback?.intervalMs);
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
  root.lang = initial.locale ?? 'en';
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
        formatUiMessage(ui.rejected, { reason: result.reason }));
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
      variationHints: options.variationMode === 'focused',
      ...options.board,
      labels: { ...createBoardLabels(options), ...options.board?.labels },
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
  const playbackControls = mountPlaybackControls(nav, {
    controller,
    scope: root,
    intervalMs: initialInterval,
    locale: options.locale,
    messages: options.messages,
    onAction: report,
  });

  function nodeName(node: SgfNode, state: ControllerState): string {
    const value = node.properties.B?.[0] ?? node.properties.W?.[0];
    if (value === undefined)
      return (
        node.properties.N?.[0] ??
        (node.id === state.record.games[state.gameIndex]!.id ? ui.start : ui.annotation)
      );
    const color = node.properties.B ? ui.black : ui.white;
    if (!value || (value === 'tt' && state.position.width <= 19 && state.position.height <= 19))
      return formatUiMessage(ui.colorPass, { color });
    const point = pointFromSgf(value, state.position.width, state.position.height);
    return `${color} ${'ABCDEFGHJKLMNOPQRSTUVWXYZ'[point.x] ?? point.x + 1}${state.position.height - point.y}`;
  }
  function renderTree(state: ControllerState): void {
    if (lastTree?.record === state.record && lastTree.selected === state.node.id) return;
    lastTree = { record: state.record, selected: state.node.id };
    const focusInside = tree.contains(document.activeElement);
    const fragment = document.createDocumentFragment();
    let selected: HTMLButtonElement | undefined;
    const row = (
      node: SgfNode,
      indent: number,
      moveNumber: number,
      branch = false,
      collapsed = false,
    ) => {
      const item = document.createElement('div');
      item.setAttribute('role', 'listitem');
      const entry = document.createElement('button');
      entry.type = 'button';
      const label = `${moveNumber} · ${nodeName(node, state)}`;
      entry.textContent = label;
      entry.setAttribute('aria-label', formatUiMessage(ui.selectNode, { label }));
      entry.dataset.node = node.id;
      if (options.variationMode === 'focused') {
        if (branch && node.children.length) entry.setAttribute('aria-expanded', String(!collapsed));
        const disclosure = document.createElement('span');
        disclosure.className = 'variation-disclosure';
        disclosure.setAttribute('aria-hidden', 'true');
        entry.prepend(disclosure);
      }
      const descriptions: string[] = [];
      const assessment = getMoveAssessment(node);
      if (assessment) {
        const indicator = document.createElement('span');
        indicator.className = `banora-move-assessment ${assessment}`;
        indicator.title = assessment === 'good' ? ui.goodMove : ui.badMove;
        indicator.setAttribute('aria-hidden', 'true');
        descriptions.push(indicator.title);
        entry.append(indicator);
      }
      if (node.properties.C?.[0]?.trim()) {
        const indicator = document.createElement('span');
        indicator.className = 'banora-comment-indicator';
        indicator.title = ui.hasComment;
        indicator.setAttribute('aria-hidden', 'true');
        indicator.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M3 3h14v10H8l-4 3v-3H3Z"/></svg>';
        descriptions.push(ui.hasComment);
        entry.append(indicator);
      }
      if (descriptions.length) entry.setAttribute('aria-description', descriptions.join(' · '));
      entry.style.paddingLeft = `${10 + Math.min(indent, 8) * 12}px`;
      entry.setAttribute('aria-current', String(node.id === state.node.id));
      if (node.id === state.node.id) selected = entry;
      item.append(entry);
      fragment.append(item);
    };
    const outline = getVariationRows(state, options.variationMode === 'focused');
    for (const item of outline.rows)
      row(item.node, item.indent, item.moveNumber, item.branch, item.collapsed);
    if (!selected) row(state.node, 0, state.position.moveNumber);
    tree.replaceChildren(fragment);
    treeNote.textContent = outline.truncated ? ui.treeLimit : '';
    if (focusInside) selected?.focus({ preventScroll: true });
  }
  function renderLabels(): void {
    root.setAttribute('aria-label', ui.viewer);
    nav.setAttribute('aria-label', ui.navigation);
    gameLabel.firstChild!.textContent = ui.gameLabel;
    games.setAttribute('aria-label', ui.selectGame);
    treeTitle.textContent = ui.variations;
    notes.firstChild!.textContent = ui.comments;
    comment.setAttribute('aria-label', ui.positionComments);
    for (const [element, key] of [
      [first, 'first'],
      [previous, 'previous'],
      [next, 'next'],
      [last, 'last'],
      [pass, 'pass'],
      [undo, 'undo'],
      [redo, 'redo'],
    ] as const) {
      element.setAttribute('aria-label', ui[key]);
      if (key === 'pass' || key === 'undo' || key === 'redo') element.textContent = ui[key];
    }
  }
  renderLabels();
  function render(state: ControllerState): void {
    const game = state.record.games[state.gameIndex]!;
    title.textContent = game.properties.GN?.[0] ?? ui.record;
    games.replaceChildren(
      ...state.record.games.map((game, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent =
          game.properties.GN?.[0] ?? formatUiMessage(ui.game, { number: index + 1 });
        return option;
      }),
    );
    games.value = String(state.gameIndex);
    gameLabel.hidden = state.record.games.length < 2;
    move.textContent = formatUiMessage(ui.move, { number: state.position.moveNumber });
    first.disabled = previous.disabled = state.path.length < 2;
    next.disabled = last.disabled = state.node.children.length === 0;
    undo.disabled = !state.canUndo;
    redo.disabled = !state.canRedo;
    undo.hidden = redo.hidden = pass.hidden = !options.editable;
    summary.textContent = formatUiMessage(ui.summary, {
      black: game.properties.PB?.[0] ?? ui.black,
      white: game.properties.PW?.[0] ?? ui.white,
      color: ui[state.position.toPlay],
      blackCaptures: state.position.captures.black,
      whiteCaptures: state.position.captures.white,
    });
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
    playback: playbackControls.playback,
    exportSvg: (config?: DiagramOptions) => board.exportSvg(config),
    exportPng: (config?: DiagramOptions) => board.exportPng(config),
    update(next: Omit<ViewerOptions, 'controller' | 'sgf'>) {
      if (disposed) throw new Error('Viewer is disposed');
      const previous = options;
      const interval =
        next.playback === undefined
          ? undefined
          : normalizePlaybackInterval(next.playback.intervalMs);
      const merged = { ...options, ...next, board: { ...options.board, ...next.board } };
      const nextUi = createUiMessages(merged);
      board.update({
        variationHints: merged.board.variationHints ?? merged.variationMode === 'focused',
        // The board owns resolved settings, including crops cleared on size changes.
        // Do not replay old board options during unrelated Viewer updates.
        ...next.board,
        labels: { ...createBoardLabels(merged), ...merged.board.labels },
        readOnly: !merged.editable,
        nodeId: null,
      });
      options = merged;
      ui = nextUi;
      root.lang = options.locale ?? 'en';
      lastTree = undefined;
      renderLabels();
      playbackControls.update(options);
      if (interval !== undefined) playbackControls.playback.setInterval(interval);
      if ((previous.editable && !options.editable) || next.comments === false) endCommentGroup();
      render(controller.getState());
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      endCommentGroup();
      abort.abort();
      unsubscribe();
      playbackControls.dispose();
      board.dispose();
      root.remove();
      if (owned) controller.dispose();
    },
  });
}
