import { pass, play } from './core.js';
import type { Color, Point, Position } from './core.js';
import type { AnalysisCandidate } from './analysis-types.js';
import { createSgfNode, pointToSgf, serializeSgf } from './sgf.js';
export interface AnalysisPreview {
  readonly position: Position;
  readonly line: readonly (Point | null)[];
  readonly played: readonly {
    readonly move: Point | null;
    readonly color: Color;
    readonly number: number;
  }[];
}
/** Only validated candidates enter the view. Reuse core legality, never edit the source. */
export function analysisPreview(
  position: Position,
  candidate: AnalysisCandidate | null,
  step: number,
): AnalysisPreview {
  const line = candidate
    ? candidate.principalVariation.length
      ? candidate.principalVariation
      : Object.freeze([candidate.move])
    : Object.freeze([]);
  if (!Number.isInteger(step) || step < 0 || step > line.length)
    throw RangeError('Invalid analysis PV step');
  const played: AnalysisPreview['played'][number][] = [];
  for (let index = 0; index < step; index++) {
    const move = line[index]!,
      color = position.toPlay,
      result = move === null ? pass(position) : play(position, move);
    if (!result.ok) throw Error('Analysis preview is no longer legal');
    played.push(Object.freeze({ move, color, number: index + 1 }));
    position = result.position;
  }
  return Object.freeze({ position, line, played: Object.freeze(played) });
}
export function analysisDisplaySgf(preview: AnalysisPreview): string {
  const { position, played } = preview,
    properties: Record<string, string[]> = {
      SZ: [`${position.width}:${position.height}`],
      PL: [position.toPlay === 'black' ? 'B' : 'W'],
    };
  for (let index = 0; index < position.board.length; index++) {
    const stone = position.board[index];
    if (stone)
      (properties[stone === 'black' ? 'AB' : 'AW'] ??= []).push(
        pointToSgf({ x: index % position.width, y: Math.floor(index / position.width) }),
      );
  }
  const labels = new Map<string, string>();
  for (const step of played)
    if (step.move && position.board[step.move.y * position.width + step.move.x] === step.color)
      labels.set(pointToSgf(step.move), String(step.number));
  if (labels.size) properties.LB = [...labels].map(([point, label]) => `${point}:${label}`);
  return serializeSgf({ games: [createSgfNode('analysis-display', properties)] });
}
const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
export function analysisCoordinate(move: Point | null, height: number): string {
  return move === null ? 'Pass' : `${letters[move.x] ?? String(move.x + 1)}${height - move.y}`;
}
