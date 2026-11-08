import type { ScoreSummary } from '@0disoft/banora/scoring';

/** SGF RE uses ordinary decimal notation, including for tiny manual adjustments. */
export function scoringResult(summary: Pick<ScoreSummary, 'winner' | 'margin'>): string {
  if (
    !['black', 'white', 'draw'].includes(summary.winner) ||
    !Number.isFinite(summary.margin) ||
    summary.margin < 0
  )
    throw new TypeError('Invalid scoring result');
  if (summary.winner === 'draw') return '0';
  const text = String(summary.margin);
  const [coefficient, exponent] = text.split('e');
  let decimal = text;
  if (exponent !== undefined) {
    const [integer, fraction = ''] = coefficient!.split('.');
    const digits = integer! + fraction;
    const point = integer!.length + Number(exponent);
    decimal =
      point <= 0
        ? `0.${'0'.repeat(-point)}${digits}`
        : point >= digits.length
          ? digits + '0'.repeat(point - digits.length)
          : `${digits.slice(0, point)}.${digits.slice(point)}`;
  }
  return `${summary.winner === 'black' ? 'B' : 'W'}+${decimal}`;
}
