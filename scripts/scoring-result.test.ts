import { expect, test } from 'bun:test';
import { scoringResult } from '../examples/scoring-result.js';
import { RecordController } from '../packages/sdk/src/controller.js';

test('scoring results serialize winners, draws and exponent-form margins as valid RE', () => {
  const source = new RecordController();
  try {
    for (const [winner, margin, expected] of [
      ['black', 3.5, 'B+3.5'],
      ['white', 7, 'W+7'],
      ['draw', 0, '0'],
      ['white', 1e-7, 'W+0.0000001'],
      ['black', 1e21, 'B+1000000000000000000000'],
      ['black', Number.MIN_VALUE, 'B+0.' + '0'.repeat(323) + '5'],
    ] as const) {
      expect(scoringResult({ winner, margin })).toBe(expected);
      expect(source.setGameInfo({ result: expected }).ok).toBe(true);
      expect(source.getGameInfo().result).toBe(expected);
    }
    for (const margin of [NaN, Infinity, -Infinity, -1])
      expect(() => scoringResult({ winner: 'black', margin })).toThrow(TypeError);
  } finally {
    source.dispose();
  }
});
