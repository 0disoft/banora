import { mountBoard } from './board.js';
import type { BoardOptions, BoardView, DiagramOptions } from './board.js';
import { RecordController } from './controller.js';
import { createBoardLabels, formatUiMessage } from './locale.js';
import { createAnalysisMessages, analysisFailureMessage } from './analysis-locale.js';
import type { AnalysisLocaleOptions, AnalysisMessages } from './analysis-locale.js';
export { createAnalysisMessages } from './analysis-locale.js';
export type { AnalysisLocaleOptions, AnalysisMessages } from './analysis-locale.js';
import { AnalysisSession } from './analysis.js';
import type {
  AnalysisCompletion,
  AnalysisFailure,
  AnalysisProvider,
  AnalysisRequestOptions,
  AnalysisSettings,
  AnalysisState,
} from './analysis.js';
import type { Point } from './core.js';
import { analysisRequestLimits } from './analysis-request.js';
import { analysisCoordinate, analysisDisplaySgf, analysisPreview } from './analysis-display.js';
import { drawAnalysisOverlay } from './analysis-overlay.js';
export type AnalysisBoardOptions = Pick<
  BoardOptions,
  'theme' | 'coordinates' | 'crop' | 'transform' | 'touch' | 'stoneTextures'
>;
export interface AnalysisViewOptions extends AnalysisLocaleOptions {
  readonly session?: AnalysisSession;
  readonly controller?: RecordController;
  readonly provider?: AnalysisProvider;
  readonly settings?: AnalysisSettings;
  readonly board?: AnalysisBoardOptions;
  readonly request?: AnalysisRequestOptions;
  readonly showOwnership?: boolean;
  readonly onComplete?: (completion: AnalysisCompletion) => void;
}
export interface AnalysisView {
  readonly session: AnalysisSession;
  update(
    options: Omit<AnalysisViewOptions, 'session' | 'controller' | 'provider' | 'settings'>,
  ): void;
  /** Export the displayed root/PV position; predictions are excluded. */
  exportSvg(options?: DiagramOptions): string;
  exportPng(options?: DiagramOptions): Promise<Blob>;
  dispose(): void;
}
interface Options {
  board: AnalysisBoardOptions;
  request: Required<AnalysisRequestOptions>;
  showOwnership: boolean;
  onComplete: AnalysisViewOptions['onComplete'];
  locale: AnalysisViewOptions['locale'];
  messages: AnalysisViewOptions['messages'];
  text: AnalysisMessages;
}
type PresentationInput = Pick<
  AnalysisViewOptions,
  'board' | 'request' | 'showOwnership' | 'onComplete' | 'locale' | 'messages'
>;
function validateInput(input: PresentationInput): void {
  for (const value of [input.board, input.request])
    if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value)))
      throw TypeError('Analysis board/request options must be objects');
}
function snapshot(input: PresentationInput): Options {
  validateInput(input);
  if (input.showOwnership !== undefined && typeof input.showOwnership !== 'boolean')
    throw TypeError('Analysis ownership visibility must be boolean');
  if (input.onComplete !== undefined && typeof input.onComplete !== 'function')
    throw TypeError('Analysis completion callback must be a function');
  const text = createAnalysisMessages(input);
  return {
    locale: input.locale,
    messages: input.messages && Object.freeze({ ...input.messages }),
    text,
    board: {
      ...input.board,
      crop: input.board?.crop ? { ...input.board.crop } : input.board?.crop,
      transform: input.board?.transform ? { ...input.board.transform } : input.board?.transform,
      touch: input.board?.touch ? { ...input.board.touch } : input.board?.touch,
      stoneTextures: input.board?.stoneTextures
        ? { ...input.board.stoneTextures }
        : input.board?.stoneTextures,
    },
    request: analysisRequestLimits({ includeOwnership: true, ...input.request }),
    showOwnership: input.showOwnership ?? true,
    onComplete: input.onComplete,
  };
}
const stylesheet = `
.banora-analysis{font:15px system-ui;color:var(--banora-text,#294738);background:var(--banora-surface,#fafbf5);border:1px solid #d9e1d4;border-radius:12px;padding:18px;box-sizing:border-box;max-width:100%;min-width:0;overflow-wrap:anywhere}
.banora-analysis h2{margin:0;font-size:21px}.banora-analysis p{line-height:1.6}.banora-analysis nav{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.banora-analysis button{font:inherit;color:inherit;border:1px solid #cfd9cb;background:#fff;border-radius:7px;padding:10px 12px;cursor:pointer}.banora-analysis button:disabled{opacity:.45;cursor:default}.banora-analysis button:focus-visible{outline:3px solid #589474;outline-offset:3px}.banora-analysis button[aria-pressed=true]{background:#254f42;color:#fff}.banora-analysis [data-analysis-stack]{position:relative;max-width:600px;margin:auto}.banora-analysis [data-analysis-overlay]{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.banora-analysis [data-analysis-candidates]{width:100%;border-collapse:collapse;font-size:14px;margin-top:18px}.banora-analysis td,.banora-analysis th{text-align:left;padding:7px 4px;border-bottom:1px solid #dde5d7}.banora-analysis th{font-weight:600}.banora-analysis td button{padding:7px 9px}.banora-analysis [data-analysis-help],.banora-analysis [data-analysis-legend]{font-size:13px;color:#687b69}.banora-analysis [data-analysis-pv]{font-size:14px}.banora-analysis [data-analysis-status]{font-weight:600}.banora-analysis [hidden]{display:none!important}@media(max-width:450px){.banora-analysis{padding:12px}.banora-analysis [data-analysis-candidates]{font-size:12px}.banora-analysis td,.banora-analysis th{padding:6px 2px}.banora-analysis td button{padding:7px 5px}}
`;
const signed = (number: number) => `${number >= 0 ? '+' : ''}${number.toFixed(1)}`;
const probability = (number: number) => `${(number * 100).toFixed(1)}%`;
/** SSR-safe import; browser creation and analysis submission are explicit. */
export function mountAnalysis(container: HTMLElement, initial: AnalysisViewOptions): AnalysisView {
  if (!initial || typeof initial !== 'object')
    throw TypeError('Analysis view options are required');
  const borrowed = initial.session !== undefined;
  if (
    borrowed &&
    (initial.controller !== undefined ||
      initial.provider !== undefined ||
      initial.settings !== undefined)
  )
    throw TypeError('Supply an analysis session or controller/provider/settings, not both');
  if (!borrowed && (!initial.controller || !initial.provider || !initial.settings))
    throw TypeError('An analysis session or controller/provider/settings is required');
  let options = snapshot(initial);
  const session =
      initial.session ??
      new AnalysisSession(initial.controller!, initial.provider!, initial.settings!),
    source = () => session.controller;
  let state = session.getState(),
    disposed = false,
    selectedRank: number | null = null,
    pvStep = 0,
    inspected: Point | null = null;
  let lastResult = state.result,
    lastContext = state.context;
  let actionFailure: AnalysisFailure | undefined;
  const document = container.ownerDocument,
    root = document.createElement('section'),
    abort = new AbortController();
  root.className = 'banora-analysis';
  root.innerHTML =
    '<h2 data-analysis-title></h2><p data-analysis-status role="status"></p><p data-analysis-summary></p><nav data-analysis-controls><button type="button" data-analysis-request></button><button type="button" data-analysis-cancel></button><label><input type="checkbox" data-analysis-ownership/><span data-analysis-ownership-label></span></label></nav><div data-analysis-stack><div data-analysis-board></div></div><p data-analysis-legend></p><p data-analysis-point role="status"></p><table data-analysis-candidates><caption data-analysis-caption></caption><thead><tr><th scope="col" data-analysis-move></th><th scope="col" data-analysis-win></th><th scope="col" data-analysis-lead></th><th scope="col" data-analysis-loss></th><th scope="col" data-analysis-visits></th></tr></thead><tbody></tbody></table><p data-analysis-empty></p><nav data-analysis-pv-controls><button type="button" data-analysis-return></button><button type="button" data-analysis-previous></button><button type="button" data-analysis-next></button></nav><p data-analysis-pv role="status"></p><p data-analysis-help></p>';
  const style = document.createElement('style');
  style.textContent = stylesheet;
  root.prepend(style);
  const find = <T extends HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-analysis-${name}]`)!;
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlay.dataset.analysisOverlay = '';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('focusable', 'false');
  const initialPosition = state.context?.position ?? source().getState().position;
  let lastSgf = analysisDisplaySgf(analysisPreview(initialPosition, null, 0));
  const display = new RecordController({ sgf: lastSgf });
  let board: BoardView | undefined,
    unsubscribe: (() => void) | undefined,
    unsubscribeSource: (() => void) | undefined;
  const leases = new Set<{ deliver: ((completion: AnalysisCompletion) => void) | undefined }>();
  const live = () => {
    if (disposed) throw Error('Analysis view is disposed');
  };
  function select(rank: number) {
    if (disposed) return;
    const current = session.getState();
    if (!current.result?.candidates.some((candidate) => candidate.rank === rank)) return;
    state = current;
    selectedRank = rank;
    pvStep = 1;
    inspected = null;
    render(current);
  }
  function inspect(point: Point) {
    if (disposed || pvStep !== 0) return;
    const candidate = state.result?.candidates.find(
      (candidate) => candidate.move?.x === point.x && candidate.move.y === point.y,
    );
    if (candidate) select(candidate.rank);
    else {
      inspected = point;
      render(session.getState());
    }
  }
  const boardOptions = (): BoardOptions => ({
    theme: options.board.theme,
    coordinates: options.board.coordinates,
    crop: options.board.crop,
    transform: options.board.transform,
    touch: options.board.touch,
    stoneTextures: options.board.stoneTextures,
    labels: createBoardLabels({
      locale: options.locale,
      messages: { black: options.text.black, white: options.text.white },
    }),
    readOnly: true,
    onPoint: pvStep === 0 ? inspect : undefined,
  });
  function render(incoming: AnalysisState) {
    if (disposed) return;
    // A prior listener can change the source while a notification is queued.
    const current = session.getState();
    if (current !== state) actionFailure = undefined;
    state = current;
    if (state !== incoming) incoming = state;
    if (incoming.result !== lastResult || incoming.context !== lastContext) {
      selectedRank = null;
      pvStep = 0;
      inspected = null;
      lastResult = incoming.result;
      lastContext = incoming.context;
    }
    const position = incoming.context?.position ?? source().getState().position,
      result = incoming.result;
    const candidate =
      result?.candidates.find((candidate) => candidate.rank === selectedRank) ?? null;
    if (!candidate) {
      selectedRank = null;
      pvStep = 0;
    }
    const preview = analysisPreview(position, candidate, pvStep),
      sgf = analysisDisplaySgf(preview);
    const crop = options.board.crop;
    if (crop && (crop.x + crop.width > position.width || crop.y + crop.height > position.height))
      options = { ...options, board: { ...options.board, crop: null } };
    if (lastSgf !== sgf) {
      const loaded = display.loadSgf(sgf, { discardChanges: true });
      if (!loaded.ok) throw Error('Could not render analysis position');
      lastSgf = sgf;
    }
    board!.update(boardOptions());
    drawAnalysisOverlay(overlay, position, pvStep === 0 ? result : null, {
      crop: options.board.crop,
      transform: options.board.transform,
      ownership: options.showOwnership,
      selectedRank,
    });
    root.dataset.analysisStatus = incoming.status;
    root.dataset.analysisPvStep = String(pvStep);
    root.dataset.analysisRequestId = incoming.requestId ?? '';
    const text = options.text,
      coordinate = (move: Point | null) =>
        move === null ? text.pass : analysisCoordinate(move, position.height);
    root.lang = options.locale ?? 'en';
    root.setAttribute('aria-label', text.analysis);
    find('controls').setAttribute('aria-label', text.controls);
    find('pv-controls').setAttribute('aria-label', text.pvControls);
    find('ownership-label').textContent = text.ownership;
    for (const key of [
      'title',
      'request',
      'cancel',
      'legend',
      'caption',
      'move',
      'win',
      'lead',
      'visits',
      'return',
      'previous',
      'next',
      'help',
    ] as const)
      find(key).textContent = text[key];
    find('status').textContent = actionFailure
      ? analysisFailureMessage(actionFailure, text)
      : incoming.error
        ? analysisFailureMessage(incoming.error, text)
        : incoming.status === 'loading'
          ? text.loading
          : incoming.status === 'ready'
            ? text.ready
            : incoming.status === 'cancelled'
              ? text.cancelled
              : text.idle;
    find('summary').textContent = result
      ? formatUiMessage(text.summary, {
          win: probability(result.root.winProbabilityBlack),
          lead: signed(result.root.scoreLeadBlack),
          visits: result.root.visits,
        })
      : formatUiMessage(text.context, {
          provider: incoming.providerId,
          color: text[position.toPlay],
        });
    find<HTMLButtonElement>('request').disabled =
      incoming.status === 'loading' || !incoming.context;
    find<HTMLButtonElement>('cancel').disabled = incoming.status !== 'loading';
    find<HTMLInputElement>('ownership').checked = options.showOwnership;
    find<HTMLInputElement>('ownership').disabled = !result?.ownership || pvStep !== 0;
    find('legend').hidden = !result?.ownership || pvStep !== 0 || !options.showOwnership;
    find('point').textContent =
      inspected && result?.ownership && pvStep === 0
        ? formatUiMessage(text.point, {
            coordinate: coordinate(inspected),
            value: result.ownership[inspected.y * position.width + inspected.x]!.toFixed(3),
          })
        : '';
    find('loss').textContent = formatUiMessage(text.loss, { color: text[position.toPlay] });
    const body = find<HTMLTableElement>('candidates').tBodies[0]!,
      focus = document.activeElement;
    const focusedRank =
      focus && body.contains(focus) ? focus.getAttribute('data-analysis-select') : null;
    body.replaceChildren();
    for (const move of result?.candidates ?? []) {
      const row = document.createElement('tr'),
        cell = document.createElement('td'),
        button = document.createElement('button');
      button.type = 'button';
      button.dataset.analysisSelect = String(move.rank);
      button.textContent = `${move.rank + 1}. ${coordinate(move.move)}`;
      button.setAttribute(
        'aria-label',
        formatUiMessage(text.preview, { coordinate: coordinate(move.move) }),
      );
      button.setAttribute('aria-pressed', String(move.rank === selectedRank));
      cell.append(button);
      row.append(cell);
      for (const text of [
        probability(move.winProbabilityBlack),
        signed(move.scoreLeadBlack),
        move.scoreLoss.toFixed(1),
        String(move.visits),
      ]) {
        const value = document.createElement('td');
        value.textContent = text;
        row.append(value);
      }
      body.append(row);
    }
    if (focusedRank !== null)
      body
        .querySelector<HTMLButtonElement>(`[data-analysis-select="${focusedRank}"]`)
        ?.focus({ preventScroll: true });
    find('candidates').hidden = !result?.candidates.length;
    find('empty').textContent = result && !result.candidates.length ? text.empty : '';
    find<HTMLButtonElement>('return').disabled = selectedRank === null;
    find<HTMLButtonElement>('previous').disabled = pvStep === 0;
    find<HTMLButtonElement>('next').disabled = !candidate || pvStep >= preview.line.length;
    find('pv').textContent = candidate
      ? formatUiMessage(text.pv, {
          coordinate: coordinate(candidate.move),
          step: pvStep,
          length: preview.line.length,
          notice: candidate.principalVariation.length === 0 ? text.candidateOnly : '',
          line:
            preview.played
              .map(
                (move) =>
                  `${move.number}. ${move.color === 'black' ? 'B' : 'W'} ${coordinate(move.move)}`,
              )
              .join(' → ') || text.analyzed,
        })
      : text.viewing;
  }
  try {
    board = mountBoard(find('board'), { controller: display, ...boardOptions() });
    find('stack').append(overlay);
    unsubscribe = session.subscribe(render);
    // Unavailable contexts can remain identical while their source position changes.
    unsubscribeSource = source().subscribe(() => {
      if (!disposed && !session.getState().context) render(session.getState());
    });
    find('request').addEventListener(
      'click',
      () => {
        if (disposed) return;
        const lease: { deliver: ((completion: AnalysisCompletion) => void) | undefined } = {
          deliver: (completion) => {
            leases.delete(lease);
            if (disposed) return;
            if (
              !completion.ok &&
              ['busy', 'invalid-request', 'disposed'].includes(completion.reason)
            ) {
              actionFailure = completion;
              find('status').textContent = analysisFailureMessage(completion, options.text);
            }
            try {
              options.onComplete?.(completion);
            } catch {
              console.error('Banora analysis completion listener failed');
            }
          },
        };
        leases.add(lease);
        session.request(options.request).then((completion) => {
          const deliver = lease.deliver;
          lease.deliver = undefined;
          deliver?.(completion);
        });
      },
      { signal: abort.signal },
    );
    find('cancel').addEventListener(
      'click',
      () => {
        const cancelled = session.cancel();
        if (!cancelled.ok) {
          actionFailure = cancelled;
          find('status').textContent = analysisFailureMessage(cancelled, options.text);
        }
      },
      { signal: abort.signal },
    );
    find('ownership').addEventListener(
      'change',
      () => {
        options = { ...options, showOwnership: find<HTMLInputElement>('ownership').checked };
        render(session.getState());
      },
      { signal: abort.signal },
    );
    find('candidates').addEventListener(
      'click',
      (event) => {
        const target = (event.target as Element).closest<HTMLButtonElement>(
          '[data-analysis-select]',
        );
        if (target) select(Number(target.dataset.analysisSelect));
      },
      { signal: abort.signal },
    );
    find('return').addEventListener(
      'click',
      () => {
        selectedRank = null;
        pvStep = 0;
        inspected = null;
        render(session.getState());
      },
      { signal: abort.signal },
    );
    find('previous').addEventListener(
      'click',
      () => {
        if (pvStep > 0) pvStep--;
        render(session.getState());
      },
      { signal: abort.signal },
    );
    find('next').addEventListener(
      'click',
      () => {
        const candidate = state.result?.candidates.find(
          (candidate) => candidate.rank === selectedRank,
        );
        if (candidate && pvStep < (candidate.principalVariation.length || 1)) pvStep++;
        render(session.getState());
      },
      { signal: abort.signal },
    );
    container.append(root);
  } catch (error) {
    abort.abort();
    unsubscribe?.();
    unsubscribeSource?.();
    board?.dispose();
    display.dispose();
    if (!borrowed) session.dispose();
    root.remove();
    throw error;
  }
  return Object.freeze({
    session,
    update(next: Omit<AnalysisViewOptions, 'session' | 'controller' | 'provider' | 'settings'>) {
      live();
      if (['session', 'controller', 'provider', 'settings'].some((key) => Object.hasOwn(next, key)))
        throw TypeError('Remount to replace analysis ownership');
      validateInput(next);
      const proposed = snapshot({
          ...options,
          ...next,
          board: { ...options.board, ...next.board },
          request: { ...options.request, ...next.request },
        }),
        previous = options;
      options = proposed;
      try {
        board!.update(boardOptions());
      } catch (error) {
        options = previous;
        throw error;
      }
      render(session.getState());
    },
    exportSvg: (config?: DiagramOptions) => {
      live();
      return board!.exportSvg(config);
    },
    exportPng: (config?: DiagramOptions) => {
      if (disposed) return Promise.reject(Error('Analysis view is disposed'));
      return board!.exportPng(config);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      unsubscribe?.();
      unsubscribeSource?.();
      unsubscribe = undefined;
      unsubscribeSource = undefined;
      for (const lease of leases) lease.deliver = undefined;
      leases.clear();
      board!.dispose();
      display.dispose();
      root.remove();
      if (!borrowed) session.dispose();
      // Retained closed handles must not retain a completed analysis payload.
      state = {
        status: 'idle',
        providerId: '',
        context: null,
        requestId: null,
        result: null,
        error: null,
      };
      lastResult = null;
      lastContext = null;
      actionFailure = undefined;
      lastSgf = '';
      options = snapshot({});
    },
  });
}
