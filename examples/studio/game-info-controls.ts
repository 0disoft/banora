import type { ControllerState, GameInfo, GameInfoPatch, RecordController } from '@0disoft/banora';
import { localizeUi, setUiFailure, setUiText } from '../ui-language.js';
import './game-info-controls.css';

const fields = {
  blackPlayer: 'Black player',
  whitePlayer: 'White player',
  gameName: 'Game name',
  date: 'Date',
  komi: 'Komi',
  result: 'Result',
} as const;

/** Only explicitly changed fields are patched; opening never repairs imported metadata. */
export function mountGameInfoControls(host: HTMLElement, controller: RecordController): () => void {
  const root = document.createElement('div');
  root.className = 'game-info-controls';
  root.innerHTML =
    '<button id="game-info-open" class="button" type="button">Game information</button>';
  const dialog = document.createElement('dialog');
  dialog.id = 'game-info-dialog';
  dialog.setAttribute('aria-labelledby', 'game-info-title');
  dialog.innerHTML = `<form id="game-info-form"><h2 id="game-info-title">Game information</h2>
    <div class="game-info-fields"></div>
    <p>Only changed fields are saved. Leave a field blank to remove it.</p>
    <p class="small muted">DT: 2026-01-01 · RE: B+3.5 / W+R / 0</p>
    <p id="game-info-status" role="status"></p>
    <div class="dialog-actions"><button id="game-info-cancel" class="button" type="button">Cancel</button>
    <button id="game-info-save" class="button primary" type="submit">Apply changes</button></div></form>`;
  const inputs = new Map<keyof typeof fields, HTMLInputElement>();
  for (const [field, label] of Object.entries(fields) as [keyof typeof fields, string][]) {
    const wrapper = document.createElement('label');
    const caption = document.createElement('span');
    setUiText(caption, label);
    const input = document.createElement('input');
    input.id = `game-info-${field}`;
    input.name = field;
    input.type = 'text';
    input.maxLength = 65_536;
    if (field === 'komi') input.inputMode = 'decimal';
    wrapper.append(caption, input);
    dialog.querySelector('.game-info-fields')!.append(wrapper);
    inputs.set(field, input);
  }
  host.append(root);
  document.body.append(dialog);
  const disposeButtonLanguage = localizeUi(root);
  const disposeDialogLanguage = localizeUi(dialog);
  const status = dialog.querySelector<HTMLElement>('#game-info-status')!;
  const abort = new AbortController();
  const { signal } = abort;
  let bound: { state: ControllerState; info: GameInfo } | undefined;
  let applying = false;
  function close() {
    bound = undefined;
    dialog.close();
  }
  root.querySelector('button')!.addEventListener(
    'click',
    () => {
      const state = controller.getState();
      bound = { state, info: controller.getGameInfo() };
      for (const [field, input] of inputs) input.value = bound.info[field] ?? '';
      setUiText(status, '');
      if (!dialog.open) dialog.showModal();
    },
    { signal },
  );
  dialog.querySelector('#game-info-cancel')!.addEventListener('click', close, { signal });
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
      if (!dialog.open) bound = undefined;
    },
    { signal },
  );
  const unsubscribe = controller.subscribe((state) => {
    if (!bound || applying) return;
    const previous = bound.state;
    if (
      state.recordGeneration !== previous.recordGeneration ||
      state.record !== previous.record ||
      state.gameIndex !== previous.gameIndex ||
      state.node.id !== previous.node.id
    )
      close();
  });
  dialog.querySelector('form')!.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      if (!dialog.open || !bound) return;
      const patch: GameInfoPatch = Object.fromEntries(
        [...inputs]
          .filter(([field, input]) => input.value !== (bound!.info[field] ?? ''))
          .map(([field, input]) => [field, input.value]),
      );
      applying = true;
      try {
        const result = controller.setGameInfo(patch);
        if (result.ok) close();
        else if (result.reason === 'invalid-edit')
          setUiText(status, 'Check the date, komi, and result formats.');
        else setUiFailure(status, result.reason);
      } finally {
        applying = false;
      }
    },
    { signal },
  );
  return () => {
    close();
    abort.abort();
    unsubscribe();
    disposeButtonLanguage();
    disposeDialogLanguage();
    dialog.remove();
    root.remove();
  };
}
