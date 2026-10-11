import { expect, test } from 'bun:test';
import {
  PreferenceStore,
  defaultPreferences,
  PREFERENCE_PREFIX,
  PREFERENCE_SCHEMA_VERSION,
} from '../examples/studio/preferences.js';
const fixture = () => {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    },
  };
};
const encode = (value: unknown) =>
  JSON.stringify({ schemaVersion: PREFERENCE_SCHEMA_VERSION, value });
test('validated legacy preferences migrate only after a successful new write', () => {
  const { values, storage } = fixture();
  values.set('banora.studio.locale', 'ja');
  values.set('banora.studio.board-size', 'large');
  values.set('banora.studio.drafts-enabled', 'false');
  const prefs = new PreferenceStore(storage, defaultPreferences('ko-KR'));
  expect(prefs.get('locale')).toBe('ja');
  expect(prefs.get('boardSize')).toBe('large');
  expect(prefs.get('autosave')).toBe(false);
  expect(values.has('banora.studio.locale')).toBe(false);
  expect(values.get(PREFERENCE_PREFIX + 'autosave')).toBe(encode(false));
  const denied = fixture();
  denied.values.set('banora.studio.locale', 'zh');
  const unavailable = new PreferenceStore(
    {
      ...denied.storage,
      setItem() {
        throw Error('Denied');
      },
    },
    defaultPreferences('en'),
  );
  expect(unavailable.get('locale')).toBe('zh');
  expect(denied.values.get('banora.studio.locale')).toBe('zh');
  expect(unavailable.getStatus()).toBe('unavailable');
});
test('unknown or invalid versions stay intact until explicit reset and autosave fails closed', () => {
  for (const text of [
    'bad',
    encode('invalid'),
    JSON.stringify({ schemaVersion: 'banora.studio-preference/v2', value: false }),
    'x'.repeat(4097),
    JSON.stringify({ schemaVersion: 'banora.studio-preference/v2', value: '한'.repeat(2000) }),
  ]) {
    const { values, storage } = fixture();
    values.set(PREFERENCE_PREFIX + 'autosave', text);
    const prefs = new PreferenceStore(storage, defaultPreferences('en'));
    expect(prefs.get('autosave')).toBe(false);
    expect(prefs.set('autosave', true)).toBe(false);
    expect(prefs.get('autosave')).toBe(true);
    expect(values.get(PREFERENCE_PREFIX + 'autosave')).toBe(text);
    expect(prefs.reset()).toBe(true);
    expect(values.get(PREFERENCE_PREFIX + 'autosave')).toBe(encode(true));
  }
});
test('independent tabs change only their fields and reset does not clear document data', () => {
  const { values, storage } = fixture();
  const defaults = defaultPreferences('zh-CN');
  const first = new PreferenceStore(storage, defaults),
    second = new PreferenceStore(storage, defaults);
  first.set('locale', 'ja');
  second.set('theme', 'flat');
  second.set('autosave', false);
  const reopened = new PreferenceStore(storage, defaults);
  expect(reopened.get('locale')).toBe('ja');
  expect(reopened.get('theme')).toBe('flat');
  expect(reopened.get('autosave')).toBe(false);
  values.set('host-document', 'retained');
  values.set(PREFERENCE_PREFIX + 'futureField', 'retained');
  first.reset();
  expect(values.get('host-document')).toBe('retained');
  expect(values.get(PREFERENCE_PREFIX + 'futureField')).toBe('retained');
  expect(new PreferenceStore(storage, defaults).get('locale')).toBe('zh');
});
test('unavailable storage and invalid patches leave usable bounded session preferences', () => {
  const prefs = new PreferenceStore(undefined, defaultPreferences('ja-JP'));
  expect(prefs.get('locale')).toBe('ja');
  expect(prefs.get('autosave')).toBe(false);
  expect(prefs.set('theme', 'flat')).toBe(false);
  expect(prefs.get('theme')).toBe('flat');
  expect(prefs.set('playbackInterval', 499)).toBe(false);
  expect(prefs.get('playbackInterval')).toBe(1000);
  expect(prefs.getStatus()).toBe('unavailable');
  const blocked = new PreferenceStore(
    {
      getItem() {
        throw Error('Denied');
      },
      setItem() {},
      removeItem() {},
    },
    defaultPreferences('en'),
  );
  expect(blocked.get('autosave')).toBe(false);
});

test('the envelope bound measures UTF-8 bytes while preserving oversized future data', () => {
  const { values, storage } = fixture();
  const text = JSON.stringify({
    schemaVersion: 'banora.studio-preference/v2',
    value: '한'.repeat(2000),
  });
  values.set(PREFERENCE_PREFIX + 'theme', text);
  const prefs = new PreferenceStore(storage, defaultPreferences('en'));
  expect(prefs.getStatus()).toBe('invalid');
  expect(prefs.get('theme')).toBe('wood');
  expect(prefs.set('theme', 'flat')).toBe(false);
  expect(values.get(PREFERENCE_PREFIX + 'theme')).toBe(text);
});
