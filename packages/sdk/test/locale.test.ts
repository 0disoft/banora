import { test, expect } from 'bun:test';
import {
  SUPPORTED_LOCALES,
  createUiMessages,
  createBoardLabels,
  formatUiMessage,
  formatUiFailure,
} from '../src/locale.js';
import type { ControllerFailure } from '../src/controller.js';
import type { SgfDiagnostic } from '../src/sgf.js';
import type { ScoreFailure } from '../src/scoring.js';
import type { ShareFailure } from '../src/share.js';

test('failure explanations cover every controller, SGF, scoring and sharing reason in all locales', () => {
  const codes = {
    occupied: true,
    'out-of-bounds': true,
    'wrong-turn': true,
    suicide: true,
    ko: true,
    superko: true,
    'invalid-setup': true,
    'unsaved-changes': true,
    'node-not-found': true,
    'no-history': true,
    'invalid-annotation': true,
    'invalid-edit': true,
    import: true,
    'invalid-export': true,
    'invalid-checkpoint': true,
    'stale-preview': true,
    limit: true,
    'sgf-syntax': true,
    'sgf-limit': true,
    'sgf-encoding': true,
    'sgf-unsupported': true,
    'sgf-property': true,
    'score-invalid-profile': true,
    'score-invalid-position': true,
    'score-invalid-options': true,
    'score-invalid-selection': true,
    'score-profile-mismatch': true,
    'share-invalid-url': true,
    'share-invalid-payload': true,
    'share-unsupported-version': true,
    'share-too-large': true,
    'share-invalid-record': true,
    'share-invalid-target': true,
    texture: true,
    'io-read': true,
    'io-write': true,
    'io-diagram': true,
  } satisfies Record<
    | ControllerFailure
    | `sgf-${SgfDiagnostic['code']}`
    | `score-${ScoreFailure}`
    | `share-${ShareFailure}`
    | 'texture'
    | 'io-read'
    | 'io-write'
    | 'io-diagram',
    true
  >;
  for (const locale of SUPPORTED_LOCALES) {
    const fallback = formatUiFailure('unknown', { locale });
    for (const code of Object.keys(codes)) {
      const text = formatUiFailure(code, { locale });
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toBe(fallback);
      if (locale !== 'en') expect(text).not.toBe(formatUiFailure(code));
    }
  }
  expect(formatUiFailure('occupied')).toBe('There is already a stone at this intersection.');
  expect(formatUiFailure('occupied', { locale: 'ko' })).toBe('이미 돌이 놓인 자리입니다.');
  expect(formatUiFailure('sgf-syntax', { locale: 'ko' })).toBe(
    'SGF 파일의 문법이 올바르지 않습니다.',
  );
});

test('unknown failure text is never echoed and unsupported locales reject', () => {
  for (const code of ['__proto__', 'constructor', '<tag>private $& details'])
    expect(formatUiFailure(code, { locale: 'ko' })).toBe('작업을 완료할 수 없습니다.');
  for (const locale of ['invalid', '__proto__', ['ko']])
    expect(() => formatUiFailure('occupied', { locale } as never)).toThrow(TypeError);
  expect(() => formatUiFailure(null as never)).toThrow(TypeError);
});

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
  for (const locale of SUPPORTED_LOCALES.filter((locale) => locale !== 'en')) {
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
