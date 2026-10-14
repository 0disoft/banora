import {
  createUiMessages,
  createBoardLabels,
  formatUiMessage,
  formatUiFailure,
} from '@0disoft/banora/locale';
import type { BanoraLocale } from '@0disoft/banora/locale';
import {
  getUiLocale,
  setUiLocale,
  localizeUi,
  setUiText,
  subscribeUiLanguage,
  translateUi,
} from '../ui-language.js';
import {
  decodeSgf,
  mountBoard,
  mountComparison,
  mountPlaybackControls,
  parseSgf,
  parseRecordCheckpoint,
  getVariationRows,
  variationPathKey,
  variationCandidates,
  getMoveAssessment,
  pointToSgf,
} from '@0disoft/banora';
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
} from '@0disoft/banora';
import sample from '../fixtures/study.sgf?raw';
import { mountSharing } from '../sharing-controls.js';
import { mountTextureControls } from '../texture-controls.js';
import { mountScoringControls } from '../scoring-controls.js';
import { mountBoardMenu } from './board-menu.js';
import { mountRecoveryControls } from './recovery-controls.js';
import { safeDraftFilename } from './draft-store.js';
import { defaultPreferences, PreferenceStore } from './preferences.js';
import { applyPreferenceInputs, mountPreferenceControls } from './preference-controls.js';
import { mountSearchControls } from './search-controls.js';
import { StudioDiagnostics } from './diagnostics.js';
import { mountSupportControls } from './support-controls.js';
import { describeDiagnosticFailure } from '@0disoft/banora/diagnostics';
import type { DiagnosticOperation } from '@0disoft/banora/diagnostics';
import { arrangeStudio } from './layout.js';
import { applyStudioIcons } from './icons.js';
import { createStudioTextures } from './skin.js';
import { StudioWorkspace } from './workspace.js';
import { mountWorkspaceTabs } from './workspace-tabs.js';
import { mountPlacementSound } from './placement-sound.js';
import { mountBoardSizing } from './board-sizing.js';
import { mountFullscreen } from './fullscreen.js';
import { mountStatusNotice } from './status-notice.js';
import { mountVariationMenu } from './variation-menu.js';
import { applySetupPoint, coordinateTitle, setupNodeTitle } from './setup-editing.js';
import './atelier.css';
import './icons.css';
import './board-menu.css';
import './fonts.css';

arrangeStudio();
applyStudioIcons();

const find = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let preferenceStorage: Storage | undefined;
try {
  preferenceStorage = localStorage;
} catch {
  /* Session settings work even when storage access is denied. */
}
const preferences = new PreferenceStore(preferenceStorage, defaultPreferences(navigator.language));
applyPreferenceInputs(preferences);
const boardSize = find<HTMLSelectElement>('board-size');
find('board').dataset.displaySize = boardSize.value;
boardSize.addEventListener('change', () => {
  find('board').dataset.displaySize = boardSize.value;
});
const language = find<HTMLSelectElement>('language');
const initialLanguage = preferences.get('locale');
setUiLocale(initialLanguage);
language.value = initialLanguage;
const disposeStaticLanguage = localizeUi(document.documentElement);
let ui = createUiMessages({ locale: initialLanguage });
document.documentElement.lang = initialLanguage;
const workspace = new StudioWorkspace();
const controller = workspace.controller;
const diagnostics = new StudioDiagnostics();
const comment = find<HTMLTextAreaElement>('comment');
const tool = find<HTMLSelectElement>('tool');
const penOption = document.createElement('option');
penOption.value = 'pen';
setUiText(penOption, 'Freehand ink');
tool.append(penOption);
for (const [value, label] of [
  ['good-move', 'Good move'],
  ['bad-move', 'Bad move'],
]) {
  const option = document.createElement('option');
  option.value = value!;
  setUiText(option, label!);
  tool.append(option);
}
const statusNotice = mountStatusNotice(find('status'));
const showStatus = statusNotice.show;
const disposeFullscreen = mountFullscreen(find<HTMLButtonElement>('fullscreen'), () => {
  showStatus('Fullscreen unavailable');
});
const dialog = find<HTMLDialogElement>('unsaved');
const file = find<HTMLInputElement>('file');
const games = find<HTMLSelectElement>('games');
let opening = false;
let disposed = false;
let fileReadSequence = 0;
let lastTreeState:
  | { record: ControllerState['record']; gameIndex: number; id: string; branches: string }
  | undefined;
const treeButtons = new Map<string, HTMLButtonElement>();
let selectedTreeRow: HTMLDivElement | undefined;
let connectionStart: { point: Point; node: string } | undefined;
let comparison: ComparisonView | undefined;
let stoneTextures: StoneTextures | null = createStudioTextures();
find('board').dataset.theme = preferences.get('theme');

function report(
  result: CommandResult,
  operation: DiagnosticOperation = 'edit',
  record = true,
): void {
  const id = record
    ? diagnostics.record(
        result.ok
          ? { operation, status: 'success' }
          : {
              operation,
              status: 'failure',
              failure: describeDiagnosticFailure('controller', result.reason),
            },
      )
    : undefined;
  if (!result.ok)
    showStatus(
      () =>
        (result.diagnostics
          ?.map((item) => formatUiFailure(`sgf-${item.code}`, { locale: getUiLocale() }))
          .join('; ') ?? formatUiFailure(result.reason, { locale: getUiLocale() })) +
        (id ? ` (${id})` : ''),
    );
}
const view = mountBoard(find('board'), {
  controller,
  labels: createBoardLabels({ locale: getUiLocale() }),
  theme: preferences.get('theme'),
  stoneTextures,
  moveNumbers: preferences.get('moveNumbers'),
  variationHints: true,
  transform: { rotation: preferences.get('rotation'), flipX: preferences.get('flipX') },
  touch: { mode: preferences.get('touchMode'), magnifier: preferences.get('touchMagnifier') },
  placementAnimation: preferences.get('animation')
    ? { durationMs: preferences.get('animationDuration') }
    : false,
  onPoint(point) {
    const mode = tool.value;
    const state = controller.getState();
    const value = pointToSgf(point);
    const recordedMove = () => {
      const child = state.node.children.find(
        (node) => (node.properties.B?.[0] ?? node.properties.W?.[0]) === value,
      );
      if (child) return child;
      const color = state.position.board[point.y * state.position.width + point.x];
      if (!color) return undefined;
      const key = color === 'black' ? 'B' : 'W';
      for (let i = state.path.length - 1; i >= 0; i--) {
        const node = controller.inspectNode(state.path[i]!)?.node;
        if (node?.properties[key]?.[0] === value) return node;
      }
      return undefined;
    };
    if (mode === 'good-move' || mode === 'bad-move' || mode === 'erase') {
      const target = recordedMove();
      if (mode !== 'erase') {
        if (target)
          report(controller.setMoveAssessment(mode === 'good-move' ? 'good' : 'bad', target.id));
        else showStatus('Choose a recorded move');
        return;
      }
      if (target && getMoveAssessment(target)) {
        report(controller.setMoveAssessment(null, target.id));
        return;
      }
    }
    if (mode === 'play') {
      const candidate = variationCandidates(controller.getState()).find(
        (entry) => entry.point.x === point.x && entry.point.y === point.y,
      );
      report(candidate ? controller.goTo(candidate.node.id) : controller.play(point));
    } else if (mode === 'setup-black' || mode === 'setup-white' || mode === 'setup-empty') {
      const color = mode === 'setup-empty' ? null : mode === 'setup-black' ? 'black' : 'white';
      const action = applySetupPoint(controller, point, color);
      if (action) report(action.result, action.operation);
    } else if (mode === 'line' || mode === 'arrow') {
      const state = controller.getState();
      if (!connectionStart || connectionStart.node !== state.node.id) {
        connectionStart = { point, node: state.node.id };
        showStatus(`Choose the second point for this ${mode}. Escape cancels.`);
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
          showStatus(
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
  intervalMs: preferences.get('playbackInterval'),
});
const disposePlaybackPreference = playbackControls.playback.subscribe((state) => {
  if (state.intervalMs !== preferences.get('playbackInterval'))
    preferences.set('playbackInterval', state.intervalMs);
});
const placementSound = mountPlacementSound(
  find<HTMLButtonElement>('sound'),
  controller,
  preferences,
);
find('playback').querySelector('.banora-record-playback')!.append(find('sound'));

function nodeTitle(node: SgfNode, depth: number, width: number, height: number): string {
  const value = node.properties.B?.[0] ?? node.properties.W?.[0];
  const color = node.properties.B ? ui.black : ui.white;
  if (value === undefined) {
    if (depth === 0) return ui.start;
    if (node.properties.N) return node.properties.N[0]!;
    return setupNodeTitle(node, height) ?? ui.annotation;
  }
  if (!value || (value === 'tt' && width <= 19 && height <= 19))
    return formatUiMessage(ui.colorPass, { color });
  return `${color} ${coordinateTitle(value, height)}`;
}
function revealTreeSelection(id: string): void {
  const tree = find('tree'),
    button = treeButtons.get(id);
  if (!button) return;
  const bounds = tree.getBoundingClientRect(),
    selected = button.getBoundingClientRect();
  if (selected.top < bounds.top) tree.scrollTop += selected.top - bounds.top;
  else if (selected.bottom > bounds.bottom) tree.scrollTop += selected.bottom - bounds.bottom;
}
function renderTree(state: ControllerState): void {
  const previous = lastTreeState;
  const branches = variationPathKey(state);
  const reuse =
    previous?.record === state.record &&
    previous.gameIndex === state.gameIndex &&
    previous.branches === branches;
  if (reuse && previous.id === state.node.id) return;
  lastTreeState = { record: state.record, gameIndex: state.gameIndex, id: state.node.id, branches };
  const fragment = document.createDocumentFragment();
  const row = (
    node: SgfNode,
    depth: number,
    indent: number,
    moveNumber: number,
    branch = false,
    collapsed = false,
  ) => {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('role', 'listitem');
    const button = document.createElement('button');
    button.dataset.node = node.id;
    if (depth > 0) button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-current', String(node.id === state.node.id));
    button.style.paddingLeft = `${10 + Math.min(indent, 8) * 13}px`;
    if (branch && node.children.length) button.setAttribute('aria-expanded', String(!collapsed));
    const disclosure = document.createElement('span');
    disclosure.className = 'variation-disclosure';
    disclosure.setAttribute('aria-hidden', 'true');
    button.append(disclosure);
    const dot = document.createElement('span');
    dot.className = `tree-dot ${node.properties.W ? 'white' : node.properties.B ? '' : 'root'}`;
    const text = document.createElement('span');
    text.textContent = `${moveNumber} · ${nodeTitle(node, depth, state.position.width, state.position.height)}`;
    button.append(dot, text);
    const assessment = getMoveAssessment(node);
    const descriptions: string[] = [];
    if (assessment) {
      const indicator = document.createElement('span');
      indicator.className = `banora-move-assessment ${assessment}`;
      indicator.title = assessment === 'good' ? ui.goodMove : ui.badMove;
      indicator.setAttribute('aria-hidden', 'true');
      descriptions.push(indicator.title);
      button.append(indicator);
    }
    if (node.properties.C?.[0]?.trim()) {
      const indicator = document.createElement('span');
      indicator.className = 'banora-comment-indicator';
      indicator.title = ui.hasComment;
      indicator.setAttribute('aria-hidden', 'true');
      descriptions.push(ui.hasComment);
      button.append(indicator);
    }
    if (descriptions.length) button.setAttribute('aria-description', descriptions.join(' · '));
    button.addEventListener('click', () => report(controller.goTo(node.id), 'navigate'));
    wrapper.append(button);
    fragment.append(wrapper);
    treeButtons.set(node.id, button);
    return wrapper;
  };
  if (reuse) {
    const restoreFocus = selectedTreeRow?.contains(document.activeElement) ?? false;
    treeButtons.get(previous.id)?.setAttribute('aria-current', 'false');
    if (selectedTreeRow) {
      selectedTreeRow.remove();
      treeButtons.delete(previous.id);
      selectedTreeRow = undefined;
    }
    const current = treeButtons.get(state.node.id);
    if (current) current.setAttribute('aria-current', 'true');
    else {
      selectedTreeRow = row(state.node, state.path.length - 1, 0, state.position.moveNumber);
      find('tree').append(fragment);
    }
    if (restoreFocus) treeButtons.get(state.node.id)?.focus({ preventScroll: true });
    revealTreeSelection(state.node.id);
    return;
  }
  treeButtons.clear();
  selectedTreeRow = undefined;
  const outline = getVariationRows(state, true);
  for (const entry of outline.rows)
    row(entry.node, entry.depth, entry.indent, entry.moveNumber, entry.branch, entry.collapsed);
  if (!treeButtons.has(state.node.id))
    selectedTreeRow = row(state.node, state.path.length - 1, 0, state.position.moveNumber);
  find('tree').replaceChildren(fragment);
  revealTreeSelection(state.node.id);
  setUiText(
    find('tree-note'),
    outline.truncated ? 'First 500 nodes shown. Move controls can navigate the whole record.' : '',
  );
}
const renderState = (state: ControllerState) => {
  if (connectionStart?.node !== state.node.id) connectionStart = undefined;
  const root = state.record.games[state.gameIndex]!;
  const title = root.properties.GN?.[0];
  if (title) {
    delete find('game-name').dataset.uiText;
    find('game-name').textContent = title;
  } else
    setUiText(
      find('game-name'),
      workspace.active.filename.replace(/\.sgf$/i, '').replace(/^board-(\d+)$/, 'Board $1'),
    );
  find('black-name').textContent = root.properties.PB?.[0] ?? ui.black;
  find('white-name').textContent = root.properties.PW?.[0] ?? ui.white;
  setUiText(
    find('board-info'),
    `${state.position.width} × ${state.position.height} / ${root.properties.KM?.[0] ?? translateUi('not specified')}`,
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
        const authoredName = root.properties.GN?.[0];
        if (authoredName === undefined) setUiText(option, `Game ${index + 1}`);
        else option.textContent = authoredName;
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
  const complete = diagnostics.begin('export');
  const ticket = controller.prepareExport();
  let url: string | undefined;
  try {
    url = URL.createObjectURL(
      new Blob([ticket.text], { type: 'application/x-go-sgf;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = workspace.active.filename;
    // A second modal (recovery) may remain open after replacement approval.
    // Keep the download action inside the active modal's non-inert subtree.
    (document.querySelector<HTMLDialogElement>('dialog:modal') ?? document.body).append(link);
    link.click();
    link.remove();
    report(controller.acknowledgeExport(ticket.id), 'export', false);
    showStatus('SGF download started.');
    complete({ status: 'success' });
    return true;
  } catch {
    controller.cancelExport(ticket.id);
    complete({ status: 'failure', failure: describeDiagnosticFailure('io', 'write') });
    showStatus(() => formatUiFailure('io-write', { locale: getUiLocale() }));
    return false;
  } finally {
    if (url) setTimeout(() => URL.revokeObjectURL(url!), 30_000);
  }
}
async function mayReplace(signal?: AbortSignal): Promise<SgfRecord | null> {
  if (signal?.aborted || dialog.open) return null;
  if (!controller.getState().dirty) return controller.getState().record;
  const invokingControl = document.activeElement as HTMLElement | null;
  return new Promise((resolve) => {
    dialog.returnValue = 'cancel';
    const cancel = () => {
      dialog.removeEventListener('close', closed);
      if (dialog.open) dialog.close('cancel');
      resolve(null);
    };
    const closed = () => {
      signal?.removeEventListener('abort', cancel);
      if (!disposed && invokingControl)
        (invokingControl.checkVisibility() ? invokingControl : find('app-menu')).focus({
          preventScroll: true,
        });
      // Escape can finish dismissing the parent popover after the modal closes.
      // Recover only an abandoned body focus, without overriding a new user target.
      requestAnimationFrame(() => {
        if (
          !disposed &&
          document.activeElement === document.body &&
          !document.querySelector('dialog:modal')
        )
          (invokingControl?.checkVisibility() ? invokingControl : find('app-menu')).focus({
            preventScroll: true,
          });
      });
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
  fileCompletion?: ReturnType<StudioDiagnostics['begin']>,
): Promise<boolean> {
  if (opening || disposed || signal?.aborted) {
    fileCompletion?.({ status: 'cancelled' });
    return false;
  }
  const complete = fileCompletion ?? diagnostics.begin('import');
  let finished = false;
  opening = true;
  try {
    const parsed = typeof input === 'string' ? parseSgf(input) : decodeSgf(input);
    if (!parsed.ok) {
      complete({
        status: 'failure',
        failure: describeDiagnosticFailure('sgf', parsed.diagnostics[0]?.code),
      });
      finished = true;
      showStatus(() =>
        parsed.diagnostics
          .map((item) => formatUiFailure(`sgf-${item.code}`, { locale: getUiLocale() }))
          .join('; '),
      );
      return false;
    }
    const approved = await mayReplace(signal);
    if (!approved || disposed || signal?.aborted) return false;
    if (controller.getState().record !== approved) {
      complete({
        status: 'failure',
        failure: describeDiagnosticFailure('controller', 'stale-preview'),
      });
      finished = true;
      showStatus('Record changed during approval. Open it again.');
      return false;
    }
    const previousName = workspace.active.filename;
    workspace.rename(safeDraftFilename(name));
    const result = controller.loadSgf(input, { discardChanges: true, locator });
    if (!result.ok) {
      complete({
        status: 'failure',
        failure: describeDiagnosticFailure('controller', result.reason),
      });
      finished = true;
      workspace.rename(previousName);
      report(result, 'import', false);
      return false;
    }
    showStatus(`Opened ${workspace.active.filename}.`);
    complete({ status: 'success' });
    finished = true;
    return true;
  } finally {
    if (!finished) complete({ status: 'cancelled' });
    opening = false;
  }
}
async function openFile(selected?: File): Promise<void> {
  if (!selected || disposed) return;
  const complete = diagnostics.begin('import');
  const sequence = ++fileReadSequence;
  const generation = controller.getState().recordGeneration;
  const current = () =>
    !disposed &&
    sequence === fileReadSequence &&
    generation === controller.getState().recordGeneration;
  if (selected.size > 5 * 1024 * 1024) {
    complete({ status: 'failure', failure: describeDiagnosticFailure('sgf', 'limit') });
    showStatus('SGF file exceeds the 5 MiB input limit.');
    return;
  }
  try {
    const bytes = new Uint8Array(await selected.arrayBuffer());
    if (!current()) {
      complete({ status: 'cancelled' });
      return;
    }
    await openRecord(bytes, selected.name, undefined, undefined, complete);
  } catch {
    complete(
      current()
        ? { status: 'failure', failure: describeDiagnosticFailure('io', 'read') }
        : { status: 'cancelled' },
    );
    if (current()) showStatus(() => formatUiFailure('io-read', { locale: getUiLocale() }));
  }
}
async function openCheckpoint(input: unknown, name: string, signal: AbortSignal): Promise<boolean> {
  if (opening || disposed || signal.aborted) return false;
  const complete = diagnostics.begin('restore');
  let finished = false;
  opening = true;
  try {
    const parsed = parseRecordCheckpoint(input);
    if (!parsed.ok) {
      complete({
        status: 'failure',
        failure: describeDiagnosticFailure('controller', 'invalid-checkpoint'),
      });
      finished = true;
      showStatus('Invalid backup. Current record kept.');
      return false;
    }
    const approved = await mayReplace(signal);
    if (!approved || disposed || signal.aborted) return false;
    if (controller.getState().record !== approved) {
      complete({
        status: 'failure',
        failure: describeDiagnosticFailure('controller', 'stale-preview'),
      });
      finished = true;
      showStatus('Record changed during approval. Open it again.');
      return false;
    }
    const previousName = workspace.active.filename;
    workspace.rename(safeDraftFilename(name));
    const result = controller.loadCheckpoint(parsed.value, { discardChanges: true });
    if (!result.ok) {
      complete({
        status: 'failure',
        failure: describeDiagnosticFailure('controller', result.reason),
      });
      finished = true;
      workspace.rename(previousName);
      report(result, 'restore', false);
      return false;
    }
    showStatus('Draft restored.');
    complete({ status: 'success' });
    finished = true;
    return true;
  } finally {
    if (!finished) complete({ status: 'cancelled' });
    opening = false;
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
const disposeWorkspaceTabs = mountWorkspaceTabs(workspace, {
  canAct: () => !disposed && !opening && !document.querySelector('dialog:modal'),
  close: async (id) => {
    workspace.select(id);
    const target = workspace.active;
    const approved = await mayReplace();
    if (!approved || disposed || workspace.active !== target) return false;
    return workspace.close(id, true);
  },
});
const disposeBoardSizing = mountBoardSizing(find('board'), boardSize);
const disposeWorkspaceSwitch = workspace.beforeSwitch(() => {
  fileReadSequence++;
  connectionStart = undefined;
  playbackControls.playback.pause();
  comparison?.dispose();
  comparison = undefined;
  find('comparison-panel').hidden = true;
  statusNotice.clear();
});
find('export').addEventListener('click', exportRecord);
find('previous').addEventListener('click', () => report(controller.previous(), 'navigate'));
find('next').addEventListener('click', () => report(controller.next(), 'navigate'));
find('first').addEventListener('click', () =>
  report(
    controller.goTo(controller.getState().record.games[controller.getState().gameIndex]!.id),
    'navigate',
  ),
);
find('last').addEventListener('click', () => {
  let node = controller.getState().node;
  while (node.children[0]) node = node.children[0];
  report(controller.goTo(node.id), 'navigate');
});
find('pass').addEventListener('click', () => report(controller.play(null)));
find('undo').addEventListener('click', () =>
  placementSound.silently(() => report(controller.undo())),
);
find('redo').addEventListener('click', () =>
  placementSound.silently(() => report(controller.redo())),
);
find('promote-branch').addEventListener('click', () =>
  report(controller.reorderBranch(controller.getState().node.id, 0)),
);
find<HTMLSelectElement>('next-player').addEventListener('change', (event) =>
  report(controller.setSetup([], (event.target as HTMLSelectElement).value as 'black' | 'white')),
);
const removal = find<HTMLDialogElement>('remove-dialog');
let removalTarget: { id: string; state: ControllerState } | undefined;
function requestRemoval(id: string): void {
  const target = controller.inspectNode(id);
  if (!target || target.path.length <= 1 || removal.open) return;
  removalTarget = { id, state: controller.getState() };
  find('remove-target').textContent = treeButtons.get(id)?.textContent ?? '';
  removal.returnValue = 'cancel';
  removal.showModal();
}
find('remove-branch').addEventListener('click', () =>
  requestRemoval(controller.getState().node.id),
);
const disposeVariationMenu = mountVariationMenu(find('tree'), controller, requestRemoval);
removal.addEventListener('close', () => {
  const state = controller.getState();
  if (
    removal.returnValue === 'remove' &&
    removalTarget?.state.record === state.record &&
    removalTarget.state.recordGeneration === state.recordGeneration &&
    removalTarget.state.gameIndex === state.gameIndex
  )
    report(controller.removeBranch(removalTarget.id));
  removalTarget = undefined;
  treeButtons.get(controller.getState().node.id)?.focus({ preventScroll: true });
});
comment.addEventListener('focus', () => controller.beginEditGroup());
comment.addEventListener('input', () => report(controller.setComment(comment.value)));
comment.addEventListener('blur', () => controller.endEditGroup());
function updateInk() {
  view.update({
    variationHints: ['play', 'good-move', 'bad-move', 'erase'].includes(tool.value),
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
find<HTMLSelectElement>('animation-duration').disabled = !preferences.get('animation');
find<HTMLSelectElement>('theme').addEventListener('change', (event) => {
  const theme = (event.target as HTMLSelectElement).value as 'wood' | 'flat';
  find('board').dataset.theme = theme;
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
  const name = `${workspace.active.filename.replace(/\.sgf$/i, '')}-move-${controller.getState().position.moveNumber}.${format}`;
  try {
    // CSS wood grain decorates the consumer only. Capture an opaque SDK surface
    // synchronously so standalone diagrams remain independent of Studio CSS.
    const board = find('board');
    board.dataset.exporting = '';
    let diagram: Blob | Promise<Blob>;
    try {
      diagram =
        format === 'svg'
          ? new Blob([view.exportSvg()], { type: 'image/svg+xml;charset=utf-8' })
          : view.exportPng();
    } finally {
      delete board.dataset.exporting;
    }
    const blob = await diagram;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    showStatus('Diagram download started.');
  } catch {
    showStatus(() => formatUiFailure('io-diagram', { locale: getUiLocale() }));
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
      locale: getUiLocale(),
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
  report(controller.goTo(controller.getState().record.games[Number(games.value)]!.id), 'navigate'),
);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && connectionStart) {
    connectionStart = undefined;
    showStatus('Connection cancelled.');
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
    return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    placementSound.silently(() => report(event.shiftKey ? controller.redo() : controller.undo()));
  }
});
window.addEventListener('beforeunload', (event) => {
  if (workspace.dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});
window.addEventListener('pagehide', (event) => {
  fileReadSequence++;
  playbackControls.playback.pause();
  if (!event.persisted) {
    disposed = true;
    placementSound.dispose();
    disposeFullscreen();
    statusNotice.dispose();
    disposeBoardSizing();
    disposeWorkspaceTabs();
    disposeWorkspaceSwitch();
    disposeVariationMenu();
    treeButtons.clear();
    selectedTreeRow = undefined;
    lastTreeState = undefined;
    disposeRecovery();
    disposeSupport();
    diagnostics.dispose();
    disposeSearch();
    disposePreferences();
    disposePlaybackPreference();
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
  initial: stoneTextures,
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
const disposeRecovery = mountRecoveryControls(find('drafts-host'), controller, {
  diagnostics,
  filename: () => workspace.active.filename,
  workspace,
  replace: openCheckpoint,
  autosave: preferences.get('autosave'),
  onAutosaveChange: (enabled) => {
    preferences.set('autosave', enabled);
  },
});
const disposePreferences = mountPreferenceControls(find('preferences-host'), preferences, () => {
  // Apply the default interval before pause publishes its playback snapshot.
  playbackControls.playback.setInterval(preferences.get('playbackInterval'));
  playbackControls.playback.pause();
});
const disposeSearch = mountSearchControls(find('search-host'), controller, diagnostics);
const disposeSupport = mountSupportControls(find('support-host'), diagnostics);
const disposeBoardMenu = mountBoardMenu();

const localizedTitles: Record<BanoraLocale, string> = {
  en: 'Banora Studio — Go record workspace',
  ko: 'Banora Studio — 바둑 기보 작업 공간',
  zh: 'Banora Studio — 围棋棋谱工作区',
  ja: 'Banora Studio — 囲碁棋譜ワークスペース',
  hi: 'Banora Studio — गो रिकॉर्ड कार्यक्षेत्र',
  es: 'Banora Studio — Espacio de partidas de go',
  fr: 'Banora Studio — Espace de parties de go',
  ru: 'Banora Studio — Рабочее пространство партий го',
  id: 'Banora Studio — Ruang kerja catatan Go',
  vi: 'Banora Studio — Không gian kỳ phổ cờ vây',
  th: 'Banora Studio — พื้นที่ทำงานบันทึกหมากล้อม',
  ms: 'Banora Studio — Ruang kerja rekod Go',
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
  comparison?.update({ locale });
  renderState(controller.getState());
  updateToolHint();
});
document.title = localizedTitles[initialLanguage];
language.addEventListener('change', () => {
  const locale = language.value as BanoraLocale;
  setUiLocale(locale);
});
