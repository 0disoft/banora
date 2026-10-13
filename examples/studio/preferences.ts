import type { BanoraLocale } from '@0disoft/banora/locale';

export interface StudioPreferences {
  locale: BanoraLocale;
  boardSize: 'small' | 'default' | 'large';
  theme: 'wood' | 'flat';
  moveNumbers: boolean;
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  touchMode: 'release' | 'confirm' | 'direct';
  touchMagnifier: boolean;
  animation: boolean;
  animationDuration: 80 | 160 | 320 | 1000;
  playbackInterval: number;
  autosave: boolean;
  sound: boolean;
}
export type PreferenceKey = keyof StudioPreferences;
export type PreferenceStatus = 'ready' | 'unavailable' | 'invalid' | 'newer';
export const PREFERENCE_SCHEMA_VERSION = 'banora.studio-preference/v1';
export const PREFERENCE_PREFIX = 'banora.studio.preferences.';
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const choices = (values: readonly unknown[]) => (value: unknown) => values.includes(value);
const boolean = (value: unknown) => typeof value === 'boolean';
const checks: Record<PreferenceKey, (value: unknown) => boolean> = {
  locale: choices(['en', 'ko', 'zh', 'ja']),
  boardSize: choices(['small', 'default', 'large']),
  theme: choices(['wood', 'flat']),
  moveNumbers: boolean,
  rotation: choices([0, 90, 180, 270]),
  flipX: boolean,
  touchMode: choices(['release', 'confirm', 'direct']),
  touchMagnifier: boolean,
  animation: boolean,
  animationDuration: choices([80, 160, 320, 1000]),
  playbackInterval: (value) =>
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 500 &&
    value <= 5000 &&
    value % 500 === 0,
  autosave: boolean,
  sound: boolean,
};
export const PREFERENCE_KEYS = Object.freeze(Object.keys(checks) as PreferenceKey[]);
const legacyKeys: Partial<Record<PreferenceKey, string>> = {
  locale: 'banora.studio.locale',
  boardSize: 'banora.studio.board-size',
  autosave: 'banora.studio.drafts-enabled',
};
export function defaultPreferences(browserLanguage: string): StudioPreferences {
  const language = browserLanguage.toLowerCase();
  return {
    locale: language.startsWith('ko')
      ? 'ko'
      : language.startsWith('zh')
        ? 'zh'
        : language.startsWith('ja')
          ? 'ja'
          : 'en',
    boardSize: 'default',
    theme: 'wood',
    moveNumbers: false,
    rotation: 0,
    flipX: false,
    touchMode: 'release',
    touchMagnifier: true,
    animation: false,
    animationDuration: 160,
    playbackInterval: 1000,
    autosave: true,
    sound: false,
  };
}
/** Scalar-only preferences; per-field writes cannot clobber another tab's other settings. */
export class PreferenceStore {
  #values: StudioPreferences;
  #issues = new Map<PreferenceKey, Exclude<PreferenceStatus, 'ready'>>();
  #listeners = new Set<(status: PreferenceStatus) => void>();
  constructor(
    private readonly storage: PreferenceStorage | undefined,
    private readonly defaults: StudioPreferences,
  ) {
    this.#values = { ...defaults };
    for (const key of PREFERENCE_KEYS) {
      let accepted = false;
      try {
        if (!storage) throw new Error('Unavailable');
        const text = storage.getItem(PREFERENCE_PREFIX + key);
        if (text !== null) {
          const parsed = this.#parse(key, text);
          if (parsed.ok) {
            this.#assign(key, parsed.value);
            accepted = true;
            this.#removeLegacy(key);
          } else {
            this.#issues.set(key, parsed.reason);
            if (key === 'autosave') this.#values.autosave = false;
          }
          continue;
        }
        const oldKey = legacyKeys[key];
        const oldValue = oldKey ? storage.getItem(oldKey) : null;
        if (oldValue === null) continue;
        const value =
          key === 'autosave'
            ? oldValue === 'true'
              ? true
              : oldValue === 'false'
                ? false
                : null
            : oldValue;
        if (!checks[key](value)) {
          this.#issues.set(key, 'invalid');
          if (key === 'autosave') this.#values.autosave = false;
          continue;
        }
        this.#assign(key, value);
        accepted = true;
        // Publish a validated new value before removing its legacy source.
        storage.setItem(PREFERENCE_PREFIX + key, this.#encode(value));
        this.#removeLegacy(key);
      } catch {
        this.#issues.set(key, 'unavailable');
        if (key === 'autosave' && !accepted) this.#values.autosave = false;
      }
    }
  }
  #assign(key: PreferenceKey, value: unknown): void {
    (this.#values as unknown as Record<string, unknown>)[key] = value;
  }
  #removeLegacy(key: PreferenceKey): void {
    const oldKey = legacyKeys[key];
    if (oldKey) {
      try {
        this.storage?.removeItem(oldKey);
      } catch {
        /* Validated new data already exists; retry cleanup on a later read/write. */
      }
    }
  }
  #encode(value: unknown): string {
    return JSON.stringify({ schemaVersion: PREFERENCE_SCHEMA_VERSION, value });
  }
  #parse(
    key: PreferenceKey,
    text: string,
  ): { ok: true; value: unknown } | { ok: false; reason: 'invalid' | 'newer' } {
    if (text.length > 4096 || new TextEncoder().encode(text).byteLength > 4096)
      return { ok: false, reason: 'invalid' };
    try {
      const data: unknown = JSON.parse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data))
        return { ok: false, reason: 'invalid' };
      const envelope = data as Record<string, unknown>;
      if (
        typeof envelope.schemaVersion === 'string' &&
        envelope.schemaVersion !== PREFERENCE_SCHEMA_VERSION
      )
        return { ok: false, reason: 'newer' };
      if (
        envelope.schemaVersion !== PREFERENCE_SCHEMA_VERSION ||
        Object.keys(envelope).length !== 2 ||
        !Object.hasOwn(envelope, 'value') ||
        !checks[key](envelope.value)
      )
        return { ok: false, reason: 'invalid' };
      return { ok: true, value: envelope.value };
    } catch {
      return { ok: false, reason: 'invalid' };
    }
  }
  get<K extends PreferenceKey>(key: K): StudioPreferences[K] {
    return this.#values[key];
  }
  getStatus(): PreferenceStatus {
    const issues = [...this.#issues.values()];
    return issues.includes('unavailable')
      ? 'unavailable'
      : issues.includes('newer')
        ? 'newer'
        : issues.includes('invalid')
          ? 'invalid'
          : 'ready';
  }
  subscribe(listener: (status: PreferenceStatus) => void): () => void {
    this.#listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.#listeners.delete(listener);
    };
  }
  #notify(): void {
    const status = this.getStatus();
    for (const listener of this.#listeners) listener(status);
  }
  #persist(key: PreferenceKey, value: unknown, replaceUnsupported = false): boolean {
    try {
      if (!this.storage) throw new Error('Unavailable');
      const existing = this.storage.getItem(PREFERENCE_PREFIX + key);
      if (existing !== null && !replaceUnsupported) {
        const parsed = this.#parse(key, existing);
        if (!parsed.ok) {
          this.#issues.set(key, parsed.reason);
          return false;
        }
      }
      this.storage.setItem(PREFERENCE_PREFIX + key, this.#encode(value));
      this.#removeLegacy(key);
      this.#issues.delete(key);
      return true;
    } catch {
      this.#issues.set(key, 'unavailable');
      return false;
    }
  }
  set<K extends PreferenceKey>(key: K, value: StudioPreferences[K]): boolean {
    if (!Object.hasOwn(checks, key) || !checks[key](value)) return false;
    this.#assign(key, value);
    const saved = this.#persist(key, value);
    this.#notify();
    return saved;
  }
  /** Explicit reset owns only known preference keys, never record/draft storage. */
  reset(): boolean {
    this.#values = { ...this.defaults };
    let saved = true;
    for (const key of PREFERENCE_KEYS)
      if (!this.#persist(key, this.#values[key], true)) saved = false;
    this.#notify();
    return saved;
  }
}
