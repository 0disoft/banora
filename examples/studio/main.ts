import { createUiMessages, createBoardLabels } from '@banora/sdk/locale';
import type { BanoraLocale } from '@banora/sdk/locale';
import {
  getUiLocale,
  setUiLocale,
  localizeUi,
  setUiText,
  subscribeUiLanguage,
  translateUi,
} from '../ui-language.js';
import {
  RecordController,
  decodeSgf,
  mountBoard,
  mountComparison,
  mountPlaybackControls,
  parseSgf,
} from '@banora/sdk';
import type {
  BoardRotation,
  CommandResult,
  ComparisonView,
  ControllerState,
  MarkerKind,
  Point,
  RecordLocator,
  SgfNode,
  SgfRecord,
  StoneTextures,
  TouchOptions,
} from '@banora/sdk';
import sample from '../fixtures/study.sgf?raw';
import { mountSharing } from '../sharing-controls.js';
import { mountTextureControls } from '../texture-controls.js';
import { mountScoringControls } from '../scoring-controls.js';
import { mountBoardMenu } from './board-menu.js';

const find = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const boardSize = find<HTMLSelectElement>('board-size');
const isBoardSize = (value: string | null): value is 'small' | 'default' | 'large' =>
  value === 'small' || value === 'default' || value === 'large';
try {
  const stored = localStorage.getItem('banora.studio.board-size');
  if (isBoardSize(stored)) boardSize.value = stored;
} catch {
  /* Restricted storage still allows session-local size changes. */
}
find('board').dataset.displaySize = boardSize.value;
boardSize.addEventListener('change', () => {
  if (!isBoardSize(boardSize.value)) return;
  find('board').dataset.displaySize = boardSize.value;
  try {
    localStorage.setItem('banora.studio.board-size', boardSize.value);
  } catch {
    /* Optional preference persistence. */
  }
});
const language = find<HTMLSelectElement>('language');
const browserLanguage = navigator.language.toLowerCase();
let initialLanguage: BanoraLocale = browserLanguage.startsWith('ko')
  ? 'ko'
  : browserLanguage.startsWith('zh')
    ? 'zh'
    : browserLanguage.startsWith('ja')
      ? 'ja'
      : 'en';
try {
  const stored = localStorage.getItem('banora.studio.locale');
  if (stored === 'en' || stored === 'ko' || stored === 'zh' || stored === 'ja')
    initialLanguage = stored;
} catch {
  /* Restricted storage still allows session-local language changes. */
}
setUiLocale(initialLanguage);
language.value = initialLanguage;
const disposeStaticLanguage = localizeUi(document.documentElement);
let ui = createUiMessages({ locale: initialLanguage });
document.documentElement.lang = initialLanguage;
const controller = new RecordController({ sgf: sample });
const comment = find<HTMLTextAreaElement>('comment');
const tool = find<HTMLSelectElement>('tool');
const penOption = document.createElement('option');
penOption.value = 'pen';
setUiText(penOption, 'Freehand ink');
tool.append(penOption);
const status = find('status');
const dialog = find<HTMLDialogElement>('unsaved');
const file = find<HTMLInputElement>('file');
const games = find<HTMLSelectElement>('games');
let filename = 'opening-study.sgf';
let opening = false;
let disposed = false;
let fileReadSequence = 0;
let lastTreeState: { record: ControllerState['record']; id: string } | undefined;
let connectionStart: { point: Point; node: string } | undefined;
let comparison: ComparisonView | undefined;
let stoneTextures: StoneTextures | null = null;

function report(result: CommandResult): void {
  if (!result.ok)
    setUiText(
      status,
      result.diagnostics?.map((item) => item.message).join('; ') ??
        `Action rejected: ${result.reason.replaceAll('-', ' ')}.`,
    );
}
const view = mountBoard(find('board'), {
  controller,
  labels: createBoardLabels({ locale: getUiLocale() }),
  touch: { mode: 'release' },
  onPoint(point) {
    const mode = tool.value;
    if (mode === 'play') report(controller.play(point));
    else if (mode === 'setup-black' || mode === 'setup-white' || mode === 'setup-empty') {
      report(
        controller.setSetup([
          {
            ...point,
            color: mode === 'setup-empty' ? null : mode === 'setup-black' ? 'black' : 'white',
          },
        ]),
      );
    } else if (mode === 'line' || mode === 'arrow') {
      const state = controller.getState();
      if (!connectionStart || connectionStart.node !== state.node.id) {
        connectionStart = { point, node: state.node.id };
        setUiText(status, `Choose the second point for this ${mode}. Escape cancels.`);
      } else {
        const start = connectionStart.point;
        connectionStart = undefined;
        const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
        const existing = state.connections.some(
          (connection) =>
            connection.kind === mode &&
            ((same(connection.from, start) && same(connection.to, point)) ||
              (mode === 'line' && same(connection.to, start) && same(connection.from, point))),
        );
        const result = controller.setConnection(start, point, mode, !existing);
        if (result.ok)
          setUiText(
            status,
            `${mode === 'arrow' ? 'Arrow' : 'Line'} ${existing ? 'removed' : 'added'}. Choose two points to draw another.`,
          );
        else report(result);
      }
    } else {
      const existing = controller
        .getState()
        .markers.find((marker) => marker.point.x === point.x && marker.point.y === point.y);
      const kind = mode === 'erase' || existing?.kind === mode ? null : (mode as MarkerKind);
      report(controller.setMarker(point, kind, find<HTMLInputElement>('label-text').value || 'A'));
    }
  },
});

const playbackControls = mountPlaybackControls(find('playback'), {
  controller,
  scope: document.body,
  locale: getUiLocale(),
  onAction: report,
});

function nodeTitle(node: SgfNode, depth: number, width: number, height: number): string {
  const value = node.properties.B?.[0] ?? node.properties.W?.[0];
  const color = node.properties.B ? ui.black : ui.white;
  if (value === undefined)
    return depth === 0 ? ui.start : (node.properties.N?.[0] ?? ui.annotation);
  if (!value || (value === 'tt' && width <= 19 && height <= 19))
    return `${color} ${getUiLocale() === 'ko' ? '패스' : 'pass'}`;
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
  const pending = [
    { node: state.record.games[state.gameIndex]!, depth: 0, indent: 0, parentMove: 0 },
  ];
  const shown = new Set<string>();
  let count = 0;
  const row = (node: SgfNode, depth: number, indent: number, moveNumber: number) => {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('role', 'listitem');
    const button = document.createElement('button');
    button.setAttribute('aria-current', String(node.id === state.node.id));
    button.style.paddingLeft = `${10 + Math.min(indent, 8) * 13}px`;
    const dot = document.createElement('span');
    dot.className = `tree-dot ${node.properties.W ? 'white' : node.properties.B ? '' : 'root'}`;
    const text = document.createElement('span');
    text.textContent = `${moveNumber} · ${nodeTitle(node, depth, state.position.width, state.position.height)}`;
    button.append(dot, text);
    if (node.properties.C?.[0]?.trim()) {
      const indicator = document.createElement('span');
      indicator.className = 'banora-comment-indicator';
      indicator.title = ui.hasComment;
      indicator.setAttribute('aria-hidden', 'true');
      indicator.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M3 3h14v10H8l-4 3v-3H3Z"/></svg>';
      button.setAttribute('aria-description', ui.hasComment);
      button.append(indicator);
    }
    button.addEventListener('click', () => report(controller.goTo(node.id)));
    wrapper.append(button);
    fragment.append(wrapper);
    shown.add(node.id);
  };
  while (pending.length && count++ < 500) {
    const entry = pending.pop()!;
    const props = entry.node.properties;
    const moveNumber = props.MN
      ? Number(props.MN[0])
      : entry.parentMove + (props.B || props.W ? 1 : 0);
    row(entry.node, entry.depth, entry.indent, moveNumber);
    for (let i = entry.node.children.length - 1; i >= 0; i--)
      pending.push({
        node: entry.node.children[i]!,
        depth: entry.depth + 1,
        indent: entry.indent + (i > 0 ? 1 : 0),
        parentMove: moveNumber,
      });
  }
  if (!shown.has(state.node.id))
    row(state.node, state.path.length - 1, 0, state.position.moveNumber);
  find('tree').replaceChildren(fragment);
  setUiText(
    find('tree-note'),
    pending.length ? 'First 500 nodes shown. Move controls can navigate the whole record.' : '',
  );
}
const renderState = (state: ControllerState) => {
  if (connectionStart?.node !== state.node.id) connectionStart = undefined;
  const root = state.record.games[state.gameIndex]!;
  find('game-name').textContent = root.properties.GN?.[0] ?? filename.replace(/\.sgf$/i, '');
  find('black-name').textContent = root.properties.PB?.[0] ?? ui.black;
  find('white-name').textContent = root.properties.PW?.[0] ?? ui.white;
  setUiText(
    find('board-info'),
    `${state.position.width} × ${state.position.height} / ${root.properties.KM?.[0] ?? (getUiLocale() === 'ko' ? '미지정' : 'not specified')}`,
  );
  setUiText(find('turn'), `${state.position.toPlay === 'black' ? '● Black' : '○ White'} to play`);
  setUiText(
    find('captures'),
    `Captures  ● ${state.position.captures.black}  ○ ${state.position.captures.white}`,
  );
  setUiText(find('move'), `Move ${state.position.moveNumber}`);
  setUiText(find('dirty'), state.dirty ? 'Unsaved changes' : 'No changes');
  find('dirty').classList.toggle('changed', state.dirty);
  find<HTMLButtonElement>('undo').disabled = !state.canUndo;
  find<HTMLButtonElement>('redo').disabled = !state.canRedo;
  find<HTMLButtonElement>('clear-ink').disabled = state.strokes.length === 0;
  setUiText(
    find('ink-count'),
    `${state.strokes.length} stroke${state.strokes.length === 1 ? '' : 's'} on this node`,
  );
  find<HTMLButtonElement>('previous').disabled = state.path.length <= 1;
  find<HTMLButtonElement>('first').disabled = state.path.length <= 1;
  find<HTMLButtonElement>('next').disabled = state.node.children.length === 0;
  find<HTMLButtonElement>('last').disabled = state.node.children.length === 0;
  find<HTMLButtonElement>('remove-branch').disabled = state.path.length <= 1;
  const parent =
    state.path.length > 1
      ? findNode(state.record.games[state.gameIndex]!, state.path.at(-2)!)
      : undefined;
  find<HTMLButtonElement>('promote-branch').disabled =
    !parent || parent.children[0]?.id === state.node.id;
  find<HTMLSelectElement>('next-player').value = state.position.toPlay;
  const text = state.node.properties.C?.[0] ?? '';
  if (comment.value !== text) comment.value = text;
  if (
    games.options.length !== state.record.games.length ||
    games.dataset.record !==
      state.record.games.map((root) => root.id + (root.properties.GN?.[0] ?? '')).join('|')
  ) {
    games.replaceChildren(
      ...state.record.games.map((root, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        setUiText(option, root.properties.GN?.[0] ?? `Game ${index + 1}`);
        return option;
      }),
    );
    games.dataset.record = state.record.games
      .map((root) => root.id + (root.properties.GN?.[0] ?? ''))
      .join('|');
  }
  games.value = String(state.gameIndex);
  renderTree(state);
};
const unsubscribe = controller.subscribe(renderState);

function findNode(root: SgfNode, id: string): SgfNode | undefined {
  const pending = [root];
  while (pending.length) {
    const node = pending.pop()!;
    if (node.id === id) return node;
    pending.push(...node.children);
  }
}

function exportRecord(): boolean {
  const ticket = controller.prepareExport();
  let url: string | undefined;
  try {
    url = URL.createObjectURL(
      new Blob([ticket.text], { type: 'application/x-go-sgf;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    report(controller.acknowledgeExport(ticket.id));
    setUiText(status, 'SGF download started.');
    return true;
  } catch (error) {
    controller.cancelExport(ticket.id);
    setUiText(status, `Export failed: ${String(error)}`);
    return false;
  } finally {
    if (url) setTimeout(() => URL.revokeObjectURL(url!), 30_000);
  }
}
async function mayReplace(signal?: AbortSignal): Promise<SgfRecord | null> {
  if (signal?.aborted || dialog.open) return null;
  if (!controller.getState().dirty) return controller.getState().record;
  return new Promise((resolve) => {
    dialog.returnValue = 'cancel';
    const cancel = () => {
      dialog.removeEventListener('close', closed);
      if (dialog.open) dialog.close('cancel');
      resolve(null);
    };
    const closed = () => {
      signal?.removeEventListener('abort', cancel);
      const allowed =
        dialog.returnValue === 'discard' ||
        (dialog.returnValue === 'export' && exportRecord() && !controller.getState().dirty);
      resolve(allowed ? controller.getState().record : null);
    };
    dialog.addEventListener('close', closed, { once: true });
    signal?.addEventListener('abort', cancel, { once: true });
    dialog.showModal();
  });
}
async function openRecord(
  input: string | Uint8Array,
  name: string,
  locator?: RecordLocator,
  signal?: AbortSignal,
): Promise<boolean> {
  if (opening || disposed || signal?.aborted) return false;
  opening = true;
  try {
    const parsed = typeof input === 'string' ? parseSgf(input) : decodeSgf(input);
    if (!parsed.ok) {
      setUiText(status, parsed.diagnostics.map((item) => item.message).join('; '));
      return false;
    }
    const approved = await mayReplace(signal);
    if (!approved || disposed || signal?.aborted) return false;
    if (controller.getState().record !== approved) {
      setUiText(status, 'Record changed during approval. Open it again.');
      return false;
    }
    const previousName = filename;
    filename = name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100);
    const result = controller.loadSgf(input, { discardChanges: true, locator });
    if (!result.ok) {
      filename = previousName;
      report(result);
      return false;
    }
    setUiText(status, `Opened ${filename}.`);
    return true;
  } finally {
    opening = false;
  }
}
async function openFile(selected?: File): Promise<void> {
  if (!selected || disposed) return;
  const sequence = ++fileReadSequence;
  const generation = controller.getState().recordGeneration;
  const current = () =>
    !disposed &&
    sequence === fileReadSequence &&
    generation === controller.getState().recordGeneration;
  if (selected.size > 5 * 1024 * 1024) {
    setUiText(status, 'SGF file exceeds the 5 MiB input limit.');
    return;
  }
  try {
    const bytes = new Uint8Array(await selected.arrayBuffer());
    if (!current()) return;
    await openRecord(bytes, selected.name);
  } catch (error) {
    if (current()) setUiText(status, `Could not open file: ${String(error)}`);
  }
}
find('open').addEventListener('click', () => file.click());
file.addEventListener('change', () => {
  void openFile(file.files?.[0]);
  file.value = '';
});
find('sample').addEventListener('click', () => {
  void openRecord(sample, 'opening-study.sgf');
});
find('new').addEventListener('click', () => {
  void openRecord('(;FF[4]GM[1]CA[UTF-8]SZ[19])', 'untitled.sgf');
});
find('export').addEventListener('click', exportRecord);
find('previous').addEventListener('click', () => report(controller.previous()));
find('next').addEventListener('click', () => report(controller.next()));
find('first').addEventListener('click', () =>
  report(controller.goTo(controller.getState().record.games[controller.getState().gameIndex]!.id)),
);
find('last').addEventListener('click', () => {
  let node = controller.getState().node;
  while (node.children[0]) node = node.children[0];
  report(controller.goTo(node.id));
});
find('pass').addEventListener('click', () => report(controller.play(null)));
find('undo').addEventListener('click', () => report(controller.undo()));
find('redo').addEventListener('click', () => report(controller.redo()));
find('promote-branch').addEventListener('click', () =>
  report(controller.reorderBranch(controller.getState().node.id, 0)),
);
find<HTMLSelectElement>('next-player').addEventListener('change', (event) =>
  report(controller.setSetup([], (event.target as HTMLSelectElement).value as 'black' | 'white')),
);
const removal = find<HTMLDialogElement>('remove-dialog');
let removalTarget: string | undefined;
find('remove-branch').addEventListener('click', () => {
  removalTarget = controller.getState().node.id;
  removal.returnValue = 'cancel';
  removal.showModal();
});
removal.addEventListener('close', () => {
  if (removal.returnValue === 'remove' && removalTarget)
    report(controller.removeBranch(removalTarget));
  removalTarget = undefined;
});
comment.addEventListener('focus', () => controller.beginEditGroup());
comment.addEventListener('input', () => report(controller.setComment(comment.value)));
comment.addEventListener('blur', () => controller.endEditGroup());
function updateInk() {
  view.update({
    drawing:
      tool.value === 'pen'
        ? {
            color: find<HTMLInputElement>('ink-color').value,
            width: Number(find<HTMLSelectElement>('ink-width').value),
          }
        : null,
  });
}
function updateToolHint() {
  tool.title = translateUi(
    tool.value === 'pen'
      ? 'Arrow keys move · Space adds an ink point · Enter finishes · Escape cancels'
      : 'Arrow keys move the board cursor · Enter places · Page Up / Down navigates',
  );
}
updateToolHint();
tool.addEventListener('change', () => {
  connectionStart = undefined;
  find('label-control').hidden = tool.value !== 'label';
  find('ink-control').hidden = tool.value !== 'pen';
  updateInk();
  updateToolHint();
});
find('ink-color').addEventListener('input', updateInk);
find('ink-width').addEventListener('change', updateInk);
find('clear-ink').addEventListener('click', () => report(controller.clearStrokes()));
function updateTouch() {
  view.update({
    touch: {
      mode: find<HTMLSelectElement>('touch-mode').value as TouchOptions['mode'],
      magnifier: find<HTMLInputElement>('touch-magnifier').checked,
    },
  });
}
find('touch-mode').addEventListener('change', updateTouch);
find('touch-magnifier').addEventListener('change', updateTouch);
function updateAnimation() {
  const enabled = find<HTMLInputElement>('animation').checked,
    duration = find<HTMLSelectElement>('animation-duration');
  duration.disabled = !enabled;
  view.update({ placementAnimation: enabled ? { durationMs: Number(duration.value) } : false });
}
find('animation').addEventListener('change', updateAnimation);
find('animation-duration').addEventListener('change', updateAnimation);
find<HTMLSelectElement>('theme').addEventListener('change', (event) => {
  const theme = (event.target as HTMLSelectElement).value as 'wood' | 'flat';
  view.update({ theme });
  comparison?.update({ board: { theme } });
});
find<HTMLInputElement>('numbers').addEventListener('change', (event) => {
  const moveNumbers = (event.target as HTMLInputElement).checked;
  view.update({ moveNumbers });
  comparison?.update({ board: { moveNumbers } });
});
const transformView = () => {
  const transform = {
    rotation: Number(find<HTMLSelectElement>('rotation').value) as BoardRotation,
    flipX: find<HTMLInputElement>('flip-x').checked,
  };
  view.update({ transform });
  comparison?.update({ board: { transform } });
};
find('rotation').addEventListener('change', transformView);
find('flip-x').addEventListener('change', transformView);
async function exportDiagram(format: 'svg' | 'png') {
  const name = `${filename.replace(/\.sgf$/i, '')}-move-${controller.getState().position.moveNumber}.${format}`;
  try {
    const blob =
      format === 'svg'
        ? new Blob([view.exportSvg()], { type: 'image/svg+xml;charset=utf-8' })
        : await view.exportPng();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setUiText(status, 'Diagram download started.');
  } catch (error) {
    setUiText(status, `Diagram export failed: ${String(error)}`);
  }
}
find('svg-export').addEventListener('click', () => {
  void exportDiagram('svg');
});
find('png-export').addEventListener('click', () => {
  void exportDiagram('png');
});
find('compare').addEventListener('click', () => {
  if (comparison) {
    comparison.dispose();
    comparison = undefined;
    find('comparison-panel').hidden = true;
    setUiText(find('compare'), 'Compare positions');
  } else {
    const state = controller.getState();
    find('comparison-panel').hidden = false;
    comparison = mountComparison(find('comparison-board'), {
      controller,
      left: state.node.id,
      right: state.node.children[0]?.id ?? state.node.id,
      board: {
        theme: find<HTMLSelectElement>('theme').value as 'wood' | 'flat',
        moveNumbers: find<HTMLInputElement>('numbers').checked,
        stoneTextures,
        transform: {
          rotation: Number(find<HTMLSelectElement>('rotation').value) as BoardRotation,
          flipX: find<HTMLInputElement>('flip-x').checked,
        },
      },
    });
    setUiText(find('compare'), 'Close comparison');
  }
  find<HTMLButtonElement>('pin-left').disabled = find<HTMLButtonElement>('pin-right').disabled =
    !comparison;
});
find('pin-left').addEventListener('click', () =>
  comparison?.update({ left: controller.getState().node.id }),
);
find('pin-right').addEventListener('click', () =>
  comparison?.update({ right: controller.getState().node.id }),
);
games.addEventListener('change', () =>
  report(controller.goTo(controller.getState().record.games[Number(games.value)]!.id)),
);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && connectionStart) {
    connectionStart = undefined;
    setUiText(status, 'Connection cancelled.');
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
    return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    report(event.shiftKey ? controller.redo() : controller.undo());
  }
});
window.addEventListener('beforeunload', (event) => {
  if (controller.getState().dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});
window.addEventListener('pagehide', (event) => {
  fileReadSequence++;
  playbackControls.playback.pause();
  if (!event.persisted) {
    disposed = true;
    disposeLanguage();
    disposeStaticLanguage();
    disposeBoardMenu();
    disposeScoring();
    disposeTextures();
    disposeSharing();
    comparison?.dispose();
    playbackControls.dispose();
    view.dispose();
    unsubscribe();
    controller.dispose();
  }
});
let dragDepth = 0;
document.addEventListener('dragover', (event) => {
  if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
});
document.addEventListener('dragenter', (event) => {
  if (event.dataTransfer?.types.includes('Files')) {
    dragDepth++;
    document.body.classList.add('dragging');
  }
});
document.addEventListener('dragleave', () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    document.body.classList.remove('dragging');
  }
});
document.addEventListener('drop', (event) => {
  event.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('dragging');
  void openFile(event.dataTransfer?.files[0]);
});
const disposeTextures = mountTextureControls(find('texture-host'), {
  onChange: (color, texture) => {
    const next = { ...stoneTextures, [color]: texture };
    view.update({ stoneTextures: next });
    comparison?.update({ board: { stoneTextures: next } });
    stoneTextures = next;
  },
});
const disposeSharing = mountSharing(find('sharing-host'), controller, {
  replace: (shared, signal) =>
    openRecord(
      shared.sgf,
      shared.kind === 'position' ? 'shared-position.sgf' : 'shared-record.sgf',
      shared.locator,
      signal,
    ),
});
const disposeScoring = mountScoringControls(find('scoring-host'), controller);
const disposeBoardMenu = mountBoardMenu();

const localizedTitles: Record<BanoraLocale, string> = {
  en: 'Banora Studio — Go record workspace',
  ko: 'Banora Studio — 바둑 기보 작업 공간',
  zh: 'Banora Studio — 围棋棋谱工作区',
  ja: 'Banora Studio — 囲碁棋譜ワークスペース',
};
const disposeLanguage = subscribeUiLanguage(() => {
  const locale = getUiLocale();
  document.documentElement.lang = locale;
  document.title = localizedTitles[locale];
  ui = createUiMessages({ locale });
  lastTreeState = undefined;
  games.dataset.record = '';
  view.update({ labels: createBoardLabels({ locale }) });
  playbackControls.update({ locale });
  renderState(controller.getState());
  updateToolHint();
});
document.title = localizedTitles[initialLanguage];
language.addEventListener('change', () => {
  const locale = language.value as BanoraLocale;
  setUiLocale(locale);
  try {
    localStorage.setItem('banora.studio.locale', locale);
  } catch {
    /* Optional preference persistence. */
  }
});
