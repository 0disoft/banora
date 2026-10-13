import { test, expect } from 'bun:test';
import { createUiMessages, createBoardLabels, formatUiMessage } from '../src/locale.js';

test('UI locales are explicit, immutable and safe literal template substitutions', () => {
  const english = createUiMessages();
  const korean = createUiMessages({ locale: 'ko' });
  expect(english.move).toBe('Move {number}');
  expect(formatUiMessage(korean.move, { number: 23 })).toBe('23수');
  expect(formatUiMessage(korean.selectNode, { label: '<tag>$&' })).toBe('<tag>$& 선택');
  expect(Object.isFrozen(korean)).toBe(true);
  expect(createBoardLabels({ locale: 'ko' }).black).toBe('흑');
  const overrides = { variations: 'Branches' };
  const customized = createUiMessages({ locale: 'ko', messages: overrides });
  overrides.variations = 'Mutated';
  expect(customized.variations).toBe('Branches');
  expect(customized.black).toBe('흑');
});

test('invalid locales/message bags reject before mounting or presentation updates', () => {
  for (const options of [
    { locale: 'invalid' },
    { locale: ['zh'] },
    { locale: '__proto__' },
    { messages: null },
    { messages: { unknown: 'x' } },
    { messages: { play: 3 } },
  ])
    expect(() => createUiMessages(options as never)).toThrow(TypeError);
});

test('Chinese templates preserve every placeholder and support literal overrides', () => {
  const english = createUiMessages();
  const chinese = createUiMessages({ locale: 'zh' });
  for (const key of Object.keys(english) as (keyof typeof english)[]) {
    expect(chinese[key].length).toBeGreaterThan(0);
    expect(chinese[key].match(/\{\w+\}/g)?.sort() ?? []).toEqual(
      english[key].match(/\{\w+\}/g)?.sort() ?? [],
    );
  }
  expect(formatUiMessage(chinese.move, { number: 23 })).toBe('第 23 手');
  expect(formatUiMessage(chinese.selectNode, { label: '<tag>$&' })).toBe('选择<tag>$&');
  expect(createBoardLabels({ locale: 'zh' }).black).toBe('黑');
  expect(Object.isFrozen(chinese)).toBe(true);
  expect(createUiMessages({ locale: 'zh', messages: { variations: 'Custom' } }).variations).toBe(
    'Custom',
  );
  expect(createUiMessages().move).toBe('Move {number}');
});

test('Japanese templates preserve placeholders, literal values and English defaults', () => {
  const english = createUiMessages();
  const japanese = createUiMessages({ locale: 'ja' });
  for (const key of Object.keys(english) as (keyof typeof english)[]) {
    expect(japanese[key].length).toBeGreaterThan(0);
    expect(japanese[key].match(/\{\w+\}/g)?.sort() ?? []).toEqual(
      english[key].match(/\{\w+\}/g)?.sort() ?? [],
    );
  }
  expect(formatUiMessage(japanese.move, { number: 23 })).toBe('23手目');
  expect(formatUiMessage(japanese.selectNode, { label: '<tag>$&' })).toBe('<tag>$&を選択');
  expect(createBoardLabels({ locale: 'ja' }).black).toBe('黒');
  expect(Object.isFrozen(japanese)).toBe(true);
  expect(createUiMessages({ locale: 'ja', messages: { variations: 'Custom' } }).variations).toBe(
    'Custom',
  );
  expect(createUiMessages().move).toBe('Move {number}');
});

test('comparison messages preserve placeholders in every locale and authored substitutions', () => {
  const english = createUiMessages();
  for (const locale of ['ko', 'zh', 'ja'] as const) {
    const ui = createUiMessages({ locale });
    for (const key of Object.keys(english) as (keyof typeof english)[])
      expect(ui[key].match(/\{\w+\}/g)?.sort() ?? []).toEqual(
        english[key].match(/\{\w+\}/g)?.sort() ?? [],
      );
    const authored = '<tag>$& {id}</tag>';
    expect(
      formatUiMessage(ui.comparisonRow, {
        game: '1',
        position: '2',
        caption: authored,
      }),
    ).toContain(authored);
    expect(
      formatUiMessage(ui.comparisonSummary, {
        count: 3,
        added: 1,
        removed: 1,
        replaced: 1,
      }),
    ).not.toContain('{');
    expect(ui.leftPosition).not.toBe(english.leftPosition);
    expect(ui.noComments).not.toBe(english.noComments);
  }
});
