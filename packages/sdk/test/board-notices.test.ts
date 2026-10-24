import { expect, test } from 'bun:test';
import { boardNotices, boardFailureLabelKeys } from '../src/board-notices.js';
import { boardNoticeCatalogs } from '../src/board-notice-locales.js';
import {
  SUPPORTED_LOCALES,
  createBoardLabels,
  formatUiFailure,
  formatUiMessage,
} from '../src/locale.js';
import { strokeLimits } from '../src/annotations.js';
import type { BoardLabels } from '../src/board-state.js';

test('board notices cover twelve locales and retain every literal placeholder', () => {
  const legacy: BoardLabels = { board: 'Board', black: 'Black' };
  expect(legacy.inkStarted).toBeUndefined();
  for (const locale of SUPPORTED_LOCALES) {
    const labels = createBoardLabels({ locale });
    expect(Object.isFrozen(labels)).toBe(true);
    expect(Object.keys(boardNoticeCatalogs[locale]).sort()).toEqual(
      Object.keys(boardNotices).sort(),
    );
    for (const [key, english] of Object.entries(boardNotices)) {
      const text = labels[key as keyof typeof boardNotices]!;
      expect(text.length).toBeGreaterThan(0);
      expect([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()).toEqual(
        [...english.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(),
      );
      if (locale !== 'en') expect(text).not.toBe(english);
    }
    for (const [reason, key] of Object.entries(boardFailureLabelKeys))
      expect(labels[key]).toBe(formatUiFailure(reason, { locale }));
    expect(labels.failureUnknown).toBe(formatUiFailure('unknown', { locale }));
    expect(formatUiMessage(labels.strokeLimit!, { limit: strokeLimits.pointsPerStroke })).toContain(
      '512',
    );
    expect(formatUiMessage(labels.confirmHint!, { coordinate: '$&<b>' })).toContain('$&<b>');
  }
});
