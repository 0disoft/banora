import type { ControllerState, RecordController } from '@0disoft/banora';
import { subscribeUiLanguage, translateUi } from '../ui-language.js';
import type { PreferenceStore } from './preferences.js';

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
  let noise: AudioBuffer | undefined;
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
    if (!noise) {
      noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.055), audio.sampleRate);
      const values = noise.getChannelData(0);
      for (let index = 0; index < values.length; index++)
        values[index] = (Math.random() * 2 - 1) * Math.exp(-index / (audio.sampleRate * 0.009));
    }
    const at = audio.currentTime;
    const source = audio.createBufferSource();
    source.buffer = noise;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2100;
    filter.Q.value = 0.7;
    const volume = audio.createGain();
    volume.gain.value = 0.38;
    source.connect(filter).connect(volume).connect(audio.destination);
    const body = audio.createOscillator();
    body.frequency.setValueAtTime(620, at);
    body.frequency.exponentialRampToValueAtTime(250, at + 0.04);
    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(0.045, at);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    body.connect(envelope).connect(audio.destination);
    for (const node of [source, body]) {
      sources.add(node);
      node.onended = () => {
        sources.delete(node);
        node.disconnect();
        if (node === source) {
          filter.disconnect();
          volume.disconnect();
        } else envelope.disconnect();
      };
      node.start(at);
      node.stop(at + 0.06);
    }
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
