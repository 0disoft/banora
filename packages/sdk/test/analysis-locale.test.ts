import { expect, test } from 'bun:test';
import { createAnalysisMessages, analysisFailureMessage } from '../src/analysis-locale.js';
import { SUPPORTED_LOCALES, createUiMessages, formatUiMessage } from '../src/locale.js';
import type { AnalysisFailureReason } from '../src/analysis-types.js';

test('analysis catalogs cover twelve locales, templates and every failure reason', () => {
  const english = createAnalysisMessages();
  const reasons = {
    'invalid-context': true,
    'unsupported-history': true,
    'invalid-request': true,
    'invalid-result': true,
    provider: true,
    unsupported: true,
    cancelled: true,
    stale: true,
    disposed: true,
    busy: true,
    limit: true,
  } satisfies Record<AnalysisFailureReason, true>;
  for (const locale of SUPPORTED_LOCALES) {
    const messages = createAnalysisMessages({ locale });
    expect(Object.isFrozen(messages)).toBe(true);
    expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort());
    expect(messages.pass).toBe(createUiMessages({ locale }).pass);
    for (const [key, text] of Object.entries(messages)) {
      expect(text.length).toBeGreaterThan(0);
      expect([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()).toEqual(
        [...english[key as keyof typeof english].matchAll(/\{(\w+)\}/g)]
          .map((match) => match[1])
          .sort(),
      );
    }
    for (const reason of Object.keys(reasons) as AnalysisFailureReason[]) {
      const failure = { ok: false as const, reason, message: '$& private transport detail' };
      expect(analysisFailureMessage(failure, messages)).not.toContain('private');
      if (locale !== 'en')
        expect(analysisFailureMessage(failure, messages)).not.toBe(
          analysisFailureMessage(failure, english),
        );
      expect(analysisFailureMessage({ ...failure, messageSource: 'provider' }, messages)).toBe(
        failure.message,
      );
    }
    expect(
      formatUiMessage(messages.context, { provider: '$&<b>', color: messages.black }),
    ).toContain('$&<b>');
  }
  expect(createAnalysisMessages({ locale: 'ko' }).request).toBe('현재 위치 분석하기');
});

test('analysis overrides retain literal text and enforce the shared bounds and ownership policy', () => {
  const overrides = { request: '$&<img> literal' };
  const messages = createAnalysisMessages({ locale: 'ko', messages: overrides });
  overrides.request = 'changed';
  expect(messages.request).toBe('$&<img> literal');
  expect(
    createAnalysisMessages({ messages: { errorProvider: 'x'.repeat(4096) } }).errorProvider.length,
  ).toBe(4096);
  for (const value of [
    null,
    [],
    1,
    { request: 2 },
    { request: null },
    { request: 'x'.repeat(4097) },
    { unknown: 'x' },
    JSON.parse('{"__proto__":"x"}'),
  ])
    expect(() => createAnalysisMessages({ messages: value as never })).toThrow(TypeError);
  for (const locale of ['de', 'ja-JP', '', null, 1])
    expect(() => createAnalysisMessages({ locale: locale as never })).toThrow(TypeError);
});
