import type { CommandResult, ControllerState, RecordController } from '@0disoft/banora';
import type { ScoreSummary } from '@0disoft/banora/scoring';
import { localizeUi, setUiFailure, setUiText } from './ui-language.js';
import { scoringResult } from './scoring-result.js';

interface Preview {
  readonly summary: ScoreSummary;
  readonly state: ControllerState;
}

/** Opt-in consumer workflow; a preview is never consent to overwrite a game result. */
export function mountScoringResultControls(
  host: HTMLElement,
  source: RecordController,
  current: () => Preview | undefined,
  onAction?: (result: CommandResult) => void,
): { refresh(): void; dispose(): void } {
  const root = document.createElement('div');
  root.className = 'score-controls';
  root.innerHTML =
    '<button id="score-save" class="button" type="button" disabled>Save result to record</button><span id="score-save-status" role="status"></span>';
  const dialog = document.createElement('dialog');
  dialog.id = 'score-save-dialog';
  dialog.setAttribute('aria-labelledby', 'score-save-title');
  dialog.innerHTML = `<h2 id="score-save-title">Save result to record?</h2>
    <dl><dt>Current result</dt><dd id="score-result-previous"></dd>
    <dt>New result</dt><dd><strong id="score-result-new"></strong></dd>
    <dt>Komi</dt><dd id="score-result-komi"></dd></dl>
    <p>Only the result (RE) is saved. Review the komi and scoring marks before confirming.</p>
    <p>Unmarked groups count as living. Mark dead or seki groups, finish dame, and agree on status before counting. B/W labels show surrounded empty points.</p>
    <p id="score-save-warning"></p><p id="score-save-error" role="status"></p>
    <div class="dialog-actions"><button id="score-save-cancel" class="button" type="button" autofocus>Cancel</button>
    <button id="score-save-confirm" class="button primary" type="button">Confirm result</button></div>`;
  host.append(root);
  document.body.append(dialog);
  const disposeRootLanguage = localizeUi(root);
  const disposeDialogLanguage = localizeUi(dialog);
  const find = <T extends HTMLElement>(id: string) => dialog.querySelector<T>(`#${id}`)!;
  const button = root.querySelector<HTMLButtonElement>('button')!;
  const status = root.querySelector<HTMLElement>('#score-save-status')!;
  const abort = new AbortController();
  const { signal } = abort;
  let pending: Preview | undefined;
  let applying = false;
  function close() {
    pending = undefined;
    dialog.close();
  }
  function refresh() {
    close();
    button.disabled = !current();
    setUiText(status, '');
  }
  button.addEventListener(
    'click',
    () => {
      const preview = current();
      if (!preview) return;
      pending = preview;
      const previous = source.getGameInfo().result;
      const previousResult = find('score-result-previous');
      // An earlier empty result may have owned a localized placeholder on this cell.
      delete previousResult.dataset.uiText;
      if (previous === undefined) setUiText(previousResult, 'not specified');
      else previousResult.textContent = previous;
      find('score-result-new').textContent = scoringResult(preview.summary);
      find('score-result-komi').textContent = String(preview.summary.white.komi);
      setUiText(find('score-save-error'), '');
      setUiText(
        find('score-save-warning'),
        preview.summary.warnings.includes('white-last-pass-required')
          ? 'AGA requires White to make the last pass.'
          : preview.summary.warnings.length
            ? 'This position has not ended with two alternating passes.'
            : 'Pass sequence complete. Confirm the marked status before using this result.',
      );
      if (!dialog.open) dialog.showModal();
    },
    { signal },
  );
  find('score-save-cancel').addEventListener('click', close, { signal });
  dialog.addEventListener(
    'cancel',
    (event) => {
      event.preventDefault();
      close();
    },
    { signal },
  );
  dialog.addEventListener(
    'close',
    () => {
      if (!dialog.open) pending = undefined;
    },
    { signal },
  );
  const unsubscribe = source.subscribe(() => {
    if (!applying) refresh();
  });
  find('score-save-confirm').addEventListener(
    'click',
    () => {
      if (!pending || !dialog.open) return;
      const preview = current(),
        state = source.getState(),
        approved = pending;
      if (
        !preview ||
        preview.summary !== approved.summary ||
        state.record !== approved.state.record ||
        state.recordGeneration !== approved.state.recordGeneration ||
        state.node.id !== approved.state.node.id ||
        state.gameIndex !== approved.state.gameIndex
      ) {
        refresh();
        return;
      }
      applying = true;
      try {
        const result = source.setGameInfo({ result: scoringResult(approved.summary) });
        if (result.ok) {
          close();
          setUiText(status, 'Result saved.');
        } else setUiFailure(find('score-save-error'), result.reason);
        onAction?.(result);
      } finally {
        applying = false;
      }
    },
    { signal },
  );
  return {
    refresh,
    dispose() {
      close();
      abort.abort();
      unsubscribe();
      disposeRootLanguage();
      disposeDialogLanguage();
      root.remove();
      dialog.remove();
    },
  };
}
