import type { KataGoQuery } from '@banora/sdk/katago';
/** Repository-authored illustrations, not computed or recorded engine predictions. */
export const analysisFixtures = Object.freeze([
  {
    id: 'capture',
    label: 'Black capture · 5×5',
    sgf: '(;SZ[5]KM[6.5]XX[analysis-preserve]C[Original capture illustration]AB[ab][ba][cb]AW[bb])',
    width: 5,
    height: 5,
    player: 'B',
    stones: [
      ['B', 'B5'],
      ['B', 'A4'],
      ['W', 'B4'],
      ['B', 'C4'],
    ],
    winrate: 0.72,
    scoreLead: 3.5,
    candidates: [
      { move: 'B3', winrate: 0.8, scoreLead: 4.5, pv: ['B3', 'E1', 'B2'] },
      { move: 'D2', winrate: 0.62, scoreLead: 1.5, pv: ['D2', 'E1', 'B3'] },
      { move: 'pass', winrate: 0.5, scoreLead: 0.5, pv: ['pass', 'E1', 'B3'] },
    ],
  },
  {
    id: 'white',
    label: 'White to play · 5×7',
    sgf: '(;SZ[5:7]KM[6.5]PL[W]XX[analysis-preserve]C[Original White illustration]AB[bb]AW[cb])',
    width: 5,
    height: 7,
    player: 'W',
    stones: [
      ['B', 'B6'],
      ['W', 'C6'],
    ],
    winrate: 0.35,
    scoreLead: -2.5,
    candidates: [
      { move: 'C4', winrate: 0.3, scoreLead: -3.5, pv: ['C4', 'B3', 'D4'] },
      { move: 'D2', winrate: 0.45, scoreLead: -1.5, pv: ['D2', 'A1', 'C4'] },
      { move: 'pass', winrate: 0.55, scoreLead: 0.5, pv: ['pass', 'A1', 'C4'] },
    ],
  },
]);
export function illustrativeKataGoResponse(query: KataGoQuery): unknown | null {
  const fixture = analysisFixtures.find(
    (fixture) =>
      fixture.width === query.boardXSize &&
      fixture.height === query.boardYSize &&
      fixture.player === query.initialPlayer &&
      query.moves.length === 0 &&
      query.komi === 6.5 &&
      JSON.stringify(fixture.stones) === JSON.stringify(query.initialStones),
  );
  if (!fixture) return null;
  const visits = Math.min(query.maxVisits, 100);
  return {
    id: query.id,
    turnNumber: 0,
    isDuringSearch: false,
    rootInfo: {
      currentPlayer: fixture.player,
      winrate: fixture.winrate,
      scoreLead: fixture.scoreLead,
      visits,
    },
    moveInfos: fixture.candidates.map((candidate, order) => ({
      ...candidate,
      order,
      visits: Math.max(0, Math.floor(visits * (order === 0 ? 0.7 : 0.15))),
      pv: candidate.pv.slice(0, query.analysisPVLen + 1),
    })),
    ...(query.includeOwnership
      ? {
          ownership: Array.from({ length: fixture.width * fixture.height }, (_, index) =>
            index % 5 === 0 ? -0.65 : index % 3 === 0 ? 0 : 0.8,
          ),
        }
      : {}),
  };
}
