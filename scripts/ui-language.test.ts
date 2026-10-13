import { expect, test } from 'bun:test';
import { SUPPORTED_LOCALES } from '../packages/sdk/src/locale.js';
import { uiCatalogs, uiPatterns } from '../examples/ui-catalogs.js';
import { translateUi } from '../examples/ui-language.js';

test('all twelve Studio catalogs cover the same owned UI and dynamic placeholders', () => {
  expect(Object.keys(uiCatalogs).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  const keys = Object.keys(uiCatalogs.en).sort();
  for (const locale of SUPPORTED_LOCALES) {
    expect(Object.keys(uiCatalogs[locale]).sort()).toEqual(keys);
    expect(Object.values(uiCatalogs[locale]).every((value) => value.trim().length > 0)).toBe(true);
    if (locale === 'en') continue;
    const patterns = uiPatterns[locale];
    for (const key of Object.keys(uiPatterns.ko) as (keyof typeof patterns)[]) {
      expect(patterns[key].match(/\{\w+\}/g)?.sort() ?? []).toEqual(
        uiPatterns.ko[key].match(/\{\w+\}/g)?.sort() ?? [],
      );
    }
  }
});

test('new locales translate dynamic counters and results while preserving literal authored values', () => {
  const name = '<tag>$& {number}.sgf';
  const detail = 'unsafe-input: /private/path <tag>$&';
  for (const locale of SUPPORTED_LOCALES) {
    expect(translateUi(`Opened ${name}.`, locale)).toContain(name);
    expect(translateUi(`Export failed: ${detail}`, locale)).toContain(detail);
    expect(translateUi('An authored comment with Black and White', locale)).toBe(
      'An authored comment with Black and White',
    );
    if (locale === 'en') continue;
    expect(translateUi('Move 12', locale)).not.toBe('Move 12');
    expect(translateUi('Board 3', locale)).not.toBe('Board 3');
    expect(translateUi('2 strokes on this node', locale)).not.toBe('2 strokes on this node');
    expect(
      translateUi(
        'Provisional: Black +5.5 · 2 dead stones · 3 seki stones · 4 neutral points',
        locale,
      ),
    ).not.toContain('dead stones');
    expect(
      translateUi('Choose the second point for this arrow. Escape cancels.', locale),
    ).not.toContain('Choose the second');
  }
  expect(() => translateUi('Open SGF', '__proto__' as never)).toThrow('Unsupported UI locale');
});
