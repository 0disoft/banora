import { expect, test } from 'bun:test';
import { createPuzzleMessages } from '../src/puzzle-locale.js';
import { SUPPORTED_LOCALES, createUiMessages, formatUiMessage } from '../src/locale.js';

test('puzzle catalogs cover twelve locales and preserve progress placeholders', () => {
  const english = createPuzzleMessages();
  for (const locale of SUPPORTED_LOCALES) {
    const messages = createPuzzleMessages({ locale });
    expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort());
    expect(Object.isFrozen(messages)).toBe(true);
    const ui = createUiMessages({ locale });
    expect(messages.black).toBe(ui.black);
    expect(messages.white).toBe(ui.white);
    expect(messages.pass).toBe(ui.pass);
    for (const text of Object.values(messages)) expect(text.length).toBeGreaterThan(0);
    for (const placeholder of ['color', 'status', 'attempts', 'moves'])
      expect(messages.progress).toContain(`{${placeholder}}`);
    const progress = formatUiMessage(messages.progress, {
      color: '$&<b>',
      status: messages.active,
      attempts: 7,
      moves: 3,
    });
    expect(progress).toContain('$&<b>');
    expect(progress).toContain('7');
    expect(progress).toContain('3');
    expect(progress).not.toContain('{');
    if (locale !== 'en') {
      for (const key of [
        'hint',
        'restart',
        'help',
        'unlisted',
        'finished',
        'noHint',
        'busy',
        'disposed',
      ] as const)
        expect(messages[key]).not.toBe(english[key]);
    }
  }
  expect(createPuzzleMessages({ locale: 'ko' }).hint).toBe('다음 힌트 보기');
});

test('puzzle overrides are copied, bounded, literal and reject unknown properties', () => {
  const overrides = { hint: '$&<script>literal</script>' };
  const result = createPuzzleMessages({ locale: 'ko', messages: overrides });
  overrides.hint = 'changed';
  expect(result.hint).toBe('$&<script>literal</script>');
  expect(createPuzzleMessages({ messages: { hint: 'a'.repeat(4096) } }).hint.length).toBe(4096);
  for (const messages of [
    null,
    [],
    7,
    { hint: null },
    { hint: 7 },
    { hint: 'a'.repeat(4097) },
    { unknown: 'text' },
    JSON.parse('{"__proto__":"x"}'),
  ])
    expect(() => createPuzzleMessages({ messages: messages as never })).toThrow(TypeError);
  for (const locale of ['de', 'ko-KR', '', null, 1])
    expect(() => createPuzzleMessages({ locale: locale as never })).toThrow(TypeError);
  expect(createPuzzleMessages({ messages: { hint: '' } }).hint).toBe('');
});
