import { localizeUi, setUiText } from '../ui-language.js';
import type { PreferenceKey, PreferenceStore, PreferenceStatus } from './preferences.js';

const controls = {
  locale: 'language',
  boardSize: 'board-size',
  theme: 'theme',
  moveNumbers: 'numbers',
  rotation: 'rotation',
  flipX: 'flip-x',
  touchMode: 'touch-mode',
  touchMagnifier: 'touch-magnifier',
  animation: 'animation',
  animationDuration: 'animation-duration',
} as const satisfies Partial<Record<PreferenceKey, string>>;

/** Restore inputs before mounting the board, without dispatching user actions. */
export function applyPreferenceInputs(preferences: PreferenceStore): void {
  for (const key of Object.keys(controls) as (keyof typeof controls)[]) {
    const input = document.getElementById(controls[key]) as HTMLInputElement | HTMLSelectElement;
    const value = preferences.get(key);
    if (typeof value === 'boolean') (input as HTMLInputElement).checked = value;
    else input.value = String(value);
  }
  const autosave = document.getElementById('draft-autosave') as HTMLInputElement | null;
  if (autosave) autosave.checked = preferences.get('autosave');
}

const statusText: Record<PreferenceStatus, string> = {
  ready: '',
  unavailable: 'Settings stay in this session only.',
  invalid: 'Saved settings are invalid. Reset to replace them.',
  newer: 'Saved settings need a newer Studio. Reset to replace them.',
};

export function mountPreferenceControls(
  host: HTMLElement,
  preferences: PreferenceStore,
  resetPresentation: () => void,
): () => void {
  host.innerHTML = `<button id="settings-reset" class="button" type="button">Reset saved settings</button>
    <span id="settings-status" class="muted small" role="status"></span>`;
  const abort = new AbortController();
  const { signal } = abort;
  let resetting = false;
  for (const key of Object.keys(controls) as (keyof typeof controls)[]) {
    const input = document.getElementById(controls[key]) as HTMLInputElement | HTMLSelectElement;
    input.addEventListener(
      'change',
      () => {
        if (resetting) return;
        const previous = preferences.get(key);
        const value =
          typeof previous === 'boolean'
            ? (input as HTMLInputElement).checked
            : typeof previous === 'number'
              ? Number(input.value)
              : input.value;
        preferences.set(key, value as typeof previous);
      },
      { signal },
    );
  }
  const unsubscribe = preferences.subscribe((status) =>
    setUiText(host.querySelector<HTMLElement>('#settings-status')!, statusText[status]),
  );
  host.querySelector('#settings-reset')!.addEventListener(
    'click',
    () => {
      resetting = true;
      try {
        preferences.reset();
        applyPreferenceInputs(preferences);
        // Existing handlers own view updates; do not replace the record/controller.
        for (const id of [...Object.values(controls), 'draft-autosave'])
          document.getElementById(id)?.dispatchEvent(new Event('change'));
        resetPresentation();
      } finally {
        resetting = false;
      }
    },
    { signal },
  );
  const disposeLanguage = localizeUi(host);
  return () => {
    abort.abort();
    unsubscribe();
    disposeLanguage();
    host.replaceChildren();
  };
}
