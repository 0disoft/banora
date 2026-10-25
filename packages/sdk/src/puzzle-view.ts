import { mountBoard } from './board.js';
import type { BoardOptions, BoardView, DiagramOptions } from './board.js';
import { RecordController } from './controller.js';
import { createBoardLabels, formatUiFailure, formatUiMessage } from './locale.js';
import { createPuzzleMessages } from './puzzle-locale.js';
import type { PuzzleLocaleOptions } from './puzzle-locale.js';
export { createPuzzleMessages } from './puzzle-locale.js';
export type { PuzzleMessages, PuzzleLocaleOptions } from './puzzle-locale.js';
import { PuzzleSession } from './puzzle.js';
import type {
  PuzzleDefinition,
  PuzzleEvent,
  PuzzleFailure,
  PuzzleResult,
  PuzzleState,
} from './puzzle.js';
import { createSgfNode, pointToSgf, serializeSgf } from './sgf.js';

export type PuzzleBoardOptions = Pick<
  BoardOptions,
  'theme' | 'coordinates' | 'crop' | 'transform' | 'touch' | 'stoneTextures'
>;
export interface PuzzleViewOptions extends PuzzleLocaleOptions {
  readonly session?: PuzzleSession;
  readonly definition?: PuzzleDefinition;
  readonly board?: PuzzleBoardOptions;
  readonly onEvent?: (event: PuzzleEvent) => void;
}
export interface PuzzleView {
  readonly session: PuzzleSession;
  update(options: Omit<PuzzleViewOptions, 'session' | 'definition'>): void;
  exportSvg(options?: DiagramOptions): string;
  exportPng(options?: DiagramOptions): Promise<Blob>;
  dispose(): void;
}
const stylesheet = `
.banora-puzzle{font:15px system-ui;color:var(--banora-text,#294738);background:var(--banora-surface,#fafbf5);border:1px solid #d9e1d4;border-radius:12px;padding:18px;box-sizing:border-box;max-width:100%;min-width:0;overflow-wrap:anywhere}
.banora-puzzle h2{font-size:21px;margin:0}.banora-puzzle p{line-height:1.6}.banora-puzzle [data-puzzle-board]{max-width:560px;margin:auto}.banora-puzzle nav{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.banora-puzzle button{font:inherit;color:inherit;border:1px solid #cfd9cb;background:#fff;border-radius:7px;padding:10px 12px;cursor:pointer}.banora-puzzle button:disabled{opacity:.4;cursor:default}.banora-puzzle button:focus-visible{outline:3px solid #589474;outline-offset:3px}.banora-puzzle [data-puzzle-progress]{font-size:13px}.banora-puzzle [data-puzzle-feedback]{font-weight:650}.banora-puzzle[data-puzzle-status=correct] [data-puzzle-feedback]{color:#206650}.banora-puzzle[data-puzzle-status=incorrect] [data-puzzle-feedback]{color:#9c3d37}.banora-puzzle [data-puzzle-hints]{line-height:1.6;padding-left:22px}.banora-puzzle [data-puzzle-help]{font-size:13px;color:#687b69}.banora-puzzle [hidden]{display:none!important}
`;
function displaySgf(state: PuzzleState): string {
  const position = state.position,
    properties: Record<string, string[]> = {
      SZ: [`${position.width}:${position.height}`],
      PL: [position.toPlay === 'black' ? 'B' : 'W'],
    };
  for (let index = 0; index < position.board.length; index++) {
    const color = position.board[index];
    if (!color) continue;
    (properties[color === 'black' ? 'AB' : 'AW'] ??= []).push(
      pointToSgf({ x: index % position.width, y: Math.floor(index / position.width) }),
    );
  }
  const hint = state.hints.filter((hint) => hint.point).at(-1)?.point,
    last = state.line.at(-1)?.move;
  if (hint) properties.TR = [pointToSgf(hint)];
  if (last && (!hint || last.x !== hint.x || last.y !== hint.y)) properties.CR = [pointToSgf(last)];
  return serializeSgf({ games: [createSgfNode('puzzle-display', properties)] });
}

/** SSR-safe import; creates a browser view only when called. */
export function mountPuzzle(container: HTMLElement, initial: PuzzleViewOptions): PuzzleView {
  if (initial.session && initial.definition !== undefined)
    throw new TypeError('Supply a puzzle session or definition, not both');
  if (!initial.session && !initial.definition)
    throw new TypeError('A puzzle session or definition is required');
  let messages = createPuzzleMessages(initial);
  const owned = !initial.session,
    session = initial.session ?? new PuzzleSession(initial.definition!);
  const state = session.getState(),
    document = container.ownerDocument,
    root = document.createElement('section');
  root.className = 'banora-puzzle';
  root.innerHTML =
    '<h2 data-puzzle-title></h2><p data-puzzle-prompt></p><div data-puzzle-board></div><p data-puzzle-progress></p><p data-puzzle-feedback role="status"></p><ul data-puzzle-hints></ul><nav data-puzzle-controls><button type="button" data-puzzle-hint></button><button type="button" data-puzzle-pass></button><button type="button" data-puzzle-restart></button></nav><p data-puzzle-help></p>';
  const style = document.createElement('style');
  style.textContent = stylesheet;
  root.prepend(style);
  const find = <T extends HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-puzzle-${name}]`)!;
  const abort = new AbortController();
  let options = {
      locale: initial.locale,
      onEvent: initial.onEvent,
      messages: initial.messages && Object.freeze({ ...initial.messages }),
      board: { ...initial.board },
    },
    disposed = false,
    lastSgf = displaySgf(state);
  let lastState: PuzzleState | undefined = state;
  let lastFailure: PuzzleFailure | undefined;
  const display = new RecordController({ sgf: lastSgf });
  let board: BoardView | undefined,
    unsubscribe: (() => void) | undefined,
    stopEvents: (() => void) | undefined;
  const report = (result: PuzzleResult) => {
    if (disposed) return;
    lastFailure = result.ok ? undefined : result.reason;
    renderFeedback(lastState!);
  };
  const boardOptions = (state: PuzzleState, config = options, text = messages): BoardOptions => ({
    theme: config.board.theme,
    coordinates: config.board.coordinates,
    crop: config.board.crop,
    transform: config.board.transform,
    touch: config.board.touch,
    stoneTextures: config.board.stoneTextures,
    labels: createBoardLabels({
      locale: config.locale,
      messages: { black: text.black, white: text.white },
    }),
    readOnly: true,
    onPoint: state.status === 'active' ? (point) => report(session.play(point)) : undefined,
  });
  function renderLabels() {
    root.lang = options.locale ?? 'en';
    root.setAttribute('aria-label', messages.puzzle);
    find('hints').setAttribute('aria-label', messages.hints);
    find('controls').setAttribute('aria-label', messages.controls);
    for (const key of ['hint', 'pass', 'restart', 'help'] as const)
      find(key).textContent = messages[key];
  }
  function renderFeedback(state: PuzzleState) {
    if (lastFailure) {
      const reason =
        lastFailure === 'finished'
          ? messages.finished
          : lastFailure === 'no-hint'
            ? messages.noHint
            : lastFailure === 'busy'
              ? messages.busy
              : lastFailure === 'disposed'
                ? messages.disposed
                : formatUiFailure(lastFailure === 'invalid-move' ? 'out-of-bounds' : lastFailure, {
                    locale: options.locale,
                  });
      find('feedback').textContent = formatUiMessage(messages.rejected, { reason });
    } else {
      find('feedback').textContent =
        state.lastAnswer?.outcome === 'unlisted'
          ? messages.unlisted
          : state.feedback || messages.findSolution;
    }
  }
  function render(state: PuzzleState, updateBoard = true) {
    if (disposed) return;
    if (state !== lastState) lastFailure = undefined;
    lastState = state;
    const sgf = displaySgf(state);
    if (lastSgf !== sgf) {
      const loaded = display.loadSgf(sgf, { discardChanges: true });
      if (!loaded.ok) throw Error('Could not render puzzle position');
      lastSgf = sgf;
    }
    if (updateBoard) board!.update(boardOptions(state));
    root.dataset.puzzleStatus = state.status;
    find('title').textContent = state.title;
    find('prompt').textContent = state.prompt;
    find('progress').textContent = formatUiMessage(messages.progress, {
      color: messages[state.player],
      status: messages[state.status],
      attempts: state.attempts,
      moves: state.line.length,
    });
    renderFeedback(state);
    const hints = find('hints');
    hints.replaceChildren();
    hints.hidden = state.hints.length === 0;
    for (const hint of state.hints) {
      const item = document.createElement('li');
      item.textContent = hint.text;
      hints.append(item);
    }
    find<HTMLButtonElement>('hint').disabled =
      state.status !== 'active' || state.remainingHints === 0;
    find<HTMLButtonElement>('pass').disabled = state.status !== 'active';
  }
  try {
    renderLabels();
    board = mountBoard(find('board'), { controller: display, ...boardOptions(state) });
    unsubscribe = session.subscribe(render);
    stopEvents = session.onEvent((event) => options.onEvent?.(event));
    find('hint').addEventListener('click', () => report(session.requestHint()), {
      signal: abort.signal,
    });
    find('pass').addEventListener('click', () => report(session.pass()), { signal: abort.signal });
    find('restart').addEventListener('click', () => report(session.restart()), {
      signal: abort.signal,
    });
    container.append(root);
  } catch (error) {
    abort.abort();
    unsubscribe?.();
    stopEvents?.();
    board?.dispose();
    display.dispose();
    if (owned) session.dispose();
    root.remove();
    throw error;
  }
  return Object.freeze({
    session,
    update(next: Omit<PuzzleViewOptions, 'session' | 'definition'>) {
      if (disposed) throw Error('Puzzle view is disposed');
      if ('session' in next || 'definition' in next)
        throw TypeError('Remount to replace a puzzle session/definition');
      const merged = { ...options, ...next, board: { ...options.board, ...next.board } },
        nextMessages = createPuzzleMessages(merged),
        state = session.getState();
      board!.update(boardOptions(state, merged, nextMessages));
      options = { ...merged, messages: merged.messages && Object.freeze({ ...merged.messages }) };
      messages = nextMessages;
      renderLabels();
      render(state, false);
    },
    exportSvg: (config?: DiagramOptions) => {
      if (disposed) throw Error('Puzzle view is disposed');
      return board!.exportSvg(config);
    },
    exportPng: (config?: DiagramOptions) => {
      if (disposed) return Promise.reject(Error('Puzzle view is disposed'));
      return board!.exportPng(config);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      unsubscribe?.();
      stopEvents?.();
      unsubscribe = undefined;
      stopEvents = undefined;
      board!.dispose();
      display.dispose();
      root.remove();
      if (owned) session.dispose();
      lastState = undefined;
      lastFailure = undefined;
      lastSgf = '';
      options = { locale: undefined, onEvent: undefined, messages: undefined, board: {} };
      messages = createPuzzleMessages();
    },
  });
}
