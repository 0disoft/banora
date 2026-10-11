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
    { messages: null },
    { messages: { unknown: 'x' } },
    { messages: { play: 3 } },
  ])
    expect(() => createUiMessages(options as never)).toThrow(TypeError);
});
