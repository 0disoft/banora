import type { ControllerState, RecordController } from '@0disoft/banora';
import { subscribeUiLanguage, translateUi } from '../ui-language.js';
import type { PreferenceStore } from './preferences.js';
import { createWoodImpact } from './wood-impact.js';

/** One forward recorded/edited placement, excluding imports, tabs, passes and refreshes. */
export function isPlacementStep(previous: ControllerState, next: ControllerState): boolean {
  const move = next.node.properties.B?.[0] ?? next.node.properties.W?.[0];
  return (
    previous.recordGeneration === next.recordGeneration &&
    next.path.length === previous.path.length + 1 &&
    previous.path.every((id, index) => id === next.path[index]) &&
    !!move &&
    next.position.board.some((stone, index) => stone !== previous.position.board[index])
  );
}

/** A short local wood/stone click; no audio file, network, or eager autoplay context. */
export function mountPlacementSound(
  button: HTMLButtonElement,
  controller: RecordController,
  preferences: PreferenceStore,
): { silently<T>(action: () => T): T; dispose(): void } {
  const available = typeof AudioContext !== 'undefined';
  let context: AudioContext | undefined;
  let impact: AudioBuffer | undefined;
  let enabled = preferences.get('sound');
  let epoch = 0;
  let silent = 0;
  let disposed = false;
  let previous = controller.getState();
  const sources = new Set<AudioScheduledSourceNode>();
  const abort = new AbortController();
  function render() {
    button.disabled = !available;
    button.setAttribute('aria-pressed', String(available && enabled));
    const label = translateUi(available ? 'Placement sound' : 'Sound unavailable');
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  function stop() {
    epoch++;
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    }
    sources.clear();
  }
  function ready(): AudioContext | undefined {
    if (!available || !enabled || disposed) return;
    try {
      context ??= new AudioContext();
      if (context.state === 'suspended') void context.resume().catch(() => {});
      return context;
    } catch {
      return undefined;
    }
  }
  function click(audio: AudioContext) {
    if (!impact) {
      const samples = createWoodImpact(audio.sampleRate);
      impact = audio.createBuffer(1, samples.length, audio.sampleRate);
      impact.getChannelData(0).set(samples);
    }
    const at = audio.currentTime;
    const source = audio.createBufferSource();
    source.buffer = impact;
    const volume = audio.createGain();
    volume.gain.value = 0.68;
    source.connect(volume).connect(audio.destination);
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
      source.disconnect();
      volume.disconnect();
    };
    source.start(at);
    source.stop(at + impact.duration + 0.002);
  }
  const disposePreferences = preferences.subscribe(() => {
    const next = preferences.get('sound');
    if (next !== enabled) stop();
    enabled = next;
    render();
  });
  const unsubscribe = controller.subscribe((state) => {
    const placement = isPlacementStep(previous, state);
    if (previous.recordGeneration !== state.recordGeneration) stop();
    previous = state;
    if (!placement || silent || !enabled || document.hidden) return;
    const audio = ready();
    if (!audio) return;
    const token = epoch;
    void audio
      .resume()
      .then(() => {
        if (
          !disposed &&
          enabled &&
          token === epoch &&
          !document.hidden &&
          audio.state === 'running'
        )
          click(audio);
      })
      .catch(() => {});
  });
  button.addEventListener(
    'click',
    () => {
      preferences.set('sound', !enabled);
      ready();
    },
    { signal: abort.signal },
  );
  for (const event of ['pointerdown', 'keydown'])
    document.addEventListener(
      event,
      () => {
        ready();
      },
      { capture: true, signal: abort.signal },
    );
  const disposeLanguage = subscribeUiLanguage(render);
  render();
  return {
    silently(action) {
      silent++;
      try {
        return action();
      } finally {
        silent--;
      }
    },
    dispose() {
      disposed = true;
      stop();
      unsubscribe();
      disposePreferences();
      disposeLanguage();
      abort.abort();
      if (context) void context.close().catch(() => {});
    },
  };
}
