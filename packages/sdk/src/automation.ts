import { RecordController } from './controller.js';
import type { CommandResult, MarkerKind, ConnectionKind, ControllerState } from './controller.js';
import type { Point, SetupStone, Color } from './core.js';
import { play } from './core.js';
import { recordNodeAt, serializeSgf, pointFromSgf } from './sgf.js';
import type { RecordLocator } from './sgf.js';
import { createBoardSnapshot } from './board-state.js';
import type { BoardSnapshot } from './board-state.js';
import { scorePosition } from './scoring.js';
import type { ScoreOptions } from './scoring.js';
import { getRuleProfile } from './rules.js';
import type { RuleProfileId } from './rules.js';
import { isAutomationRequest } from './automation-schema.js';
export { AUTOMATION_SCHEMA } from './automation-schema.js';

export type AutomationOperation =
  | { op: 'play'; point: Point | null }
  | { op: 'previous' | 'undo' | 'redo' | 'clear-strokes' | 'legal-points' }
  | { op: 'next'; variation?: number }
  | { op: 'goto'; target: RecordLocator }
  | { op: 'comment'; text: string }
  | { op: 'marker'; point: Point; kind: MarkerKind | null; label?: string }
  | { op: 'setup'; stones: readonly SetupStone[]; toPlay?: Color }
  | { op: 'connection'; from: Point; to: Point; kind: ConnectionKind; present?: boolean }
  | { op: 'stroke'; points: readonly Point[]; color?: string; width?: number }
  | { op: 'remove-stroke'; id: string }
  | { op: 'remove-branch'; target?: RecordLocator }
  | { op: 'reorder-branch'; target: RecordLocator; index: number }
  | ({ op: 'score' } & ScoreOptions);
export type AutomationRequest =
  | {
      schemaVersion: 'banora.automation/v1';
      kind: 'record';
      sgf?: string;
      size?: number;
      profile?: RuleProfileId;
      stateKey?: string;
      selection?: RecordLocator;
      operations?: readonly AutomationOperation[];
      includeTree?: boolean;
    }
  | { schemaVersion: 'banora.automation/v1'; kind: 'snapshot'; state: BoardSnapshot };
export interface AutomationError {
  code: 'invalid-request' | 'invalid-input' | 'command-failed';
  message: string;
  operationIndex?: number;
  reason?: string;
}
const failure = (error: AutomationError) => ({
  schemaVersion: 'banora.automation/v1' as const,
  ok: false as const,
  error,
});
function locate(state: ControllerState): RecordLocator {
  let node = state.record.games[state.gameIndex]!;
  const path: number[] = [];
  for (const id of state.path.slice(1)) {
    const index = node.children.findIndex((child) => child.id === id);
    path.push(index);
    node = node.children[index]!;
  }
  return { gameIndex: state.gameIndex, path };
}
function snapshot(state: ControllerState, key: string) {
  const position = state.position,
    move = state.node.properties.B?.[0] ?? state.node.properties.W?.[0];
  return createBoardSnapshot({
    key,
    width: position.width,
    height: position.height,
    stones: position.board,
    toPlay: position.toPlay,
    captures: position.captures,
    moveNumber: position.moveNumber,
    lastMove:
      move && !(move === 'tt' && position.width <= 19 && position.height <= 19)
        ? pointFromSgf(move, position.width, position.height)
        : null,
    markers: state.markers,
    connections: state.connections,
    strokes: state.strokes,
  });
}
/** Execute a checked batch on an isolated record. Failure returns no partially edited document. */
export function executeAutomation(input: unknown) {
  if (!isAutomationRequest(input))
    return failure({
      code: 'invalid-request',
      message: 'Request does not match AUTOMATION_SCHEMA.',
    });
  const request = input as AutomationRequest;
  let controller: RecordController | undefined;
  let operationIndex: number | undefined;
  try {
    if (request.kind === 'snapshot')
      return {
        schemaVersion: 'banora.automation/v1' as const,
        ok: true as const,
        kind: 'snapshot' as const,
        snapshot: createBoardSnapshot(request.state),
      };
    controller = new RecordController({
      sgf: request.sgf,
      size: request.size,
      rules: request.profile ? getRuleProfile(request.profile).play : undefined,
    });
    const targetId = (target: RecordLocator) =>
      recordNodeAt(controller!.getState().record, target)?.id ?? '';
    if (request.selection) {
      const result = controller.goTo(targetId(request.selection));
      if (!result.ok)
        return failure({
          code: 'command-failed',
          message: 'Selection was not found.',
          reason: result.reason,
        });
    }
    const results: unknown[] = [];
    for (const [index, operation] of (request.operations ?? []).entries()) {
      operationIndex = index;
      let result: CommandResult;
      switch (operation.op) {
        case 'play':
          result = controller.play(operation.point);
          break;
        case 'previous':
          result = controller.previous();
          break;
        case 'next':
          result = controller.next(operation.variation);
          break;
        case 'goto':
          result = controller.goTo(targetId(operation.target));
          break;
        case 'comment':
          result = controller.setComment(operation.text);
          break;
        case 'marker':
          result = controller.setMarker(operation.point, operation.kind, operation.label);
          break;
        case 'setup':
          result = controller.setSetup(operation.stones, operation.toPlay);
          break;
        case 'connection':
          result = controller.setConnection(
            operation.from,
            operation.to,
            operation.kind,
            operation.present,
          );
          break;
        case 'stroke':
          result = controller.addStroke(operation.points, operation);
          break;
        case 'remove-stroke':
          result = controller.removeStroke(operation.id);
          break;
        case 'clear-strokes':
          result = controller.clearStrokes();
          break;
        case 'remove-branch':
          result = controller.removeBranch(
            operation.target ? targetId(operation.target) : undefined,
          );
          break;
        case 'reorder-branch':
          result = controller.reorderBranch(targetId(operation.target), operation.index);
          break;
        case 'undo':
          result = controller.undo();
          break;
        case 'redo':
          result = controller.redo();
          break;
        case 'score': {
          const score = scorePosition(controller.getState().position, operation);
          if (!score.ok)
            return failure({
              code: 'command-failed',
              message: score.message,
              operationIndex: index,
              reason: score.reason,
            });
          results.push({ operationIndex: index, op: operation.op, value: score.value });
          result = { ok: true };
          break;
        }
        case 'legal-points': {
          const position = controller.getState().position,
            points: Point[] = [];
          for (let y = 0; y < position.height; y++)
            for (let x = 0; x < position.width; x++)
              if (play(position, { x, y }).ok) points.push({ x, y });
          results.push({ operationIndex: index, op: operation.op, points, pass: true });
          result = { ok: true };
          break;
        }
      }
      if (!result.ok)
        return failure({
          code: 'command-failed',
          message: `Operation ${index} (${operation.op}) failed.`,
          operationIndex: index,
          reason: result.reason,
        });
    }
    operationIndex = undefined;
    const state = controller.getState();
    return {
      schemaVersion: 'banora.automation/v1' as const,
      ok: true as const,
      kind: 'record' as const,
      snapshot: snapshot(state, request.stateKey ?? 'local-record'),
      selection: locate(state),
      selected: { id: state.node.id, properties: state.node.properties },
      children: state.node.children.map((node, index) => ({
        index,
        id: node.id,
        properties: node.properties,
      })),
      rules: state.position.rules,
      passPrisoners: state.position.passPrisoners,
      consecutivePasses: state.position.consecutivePasses,
      history: { dirty: state.dirty, canUndo: state.canUndo, canRedo: state.canRedo },
      results,
      sgf: serializeSgf(state.record),
      ...(request.includeTree ? { games: state.record.games } : {}),
    };
  } catch (error) {
    return failure({
      code: 'invalid-input',
      message: error instanceof Error ? error.message : 'Invalid input.',
      ...(operationIndex === undefined ? {} : { operationIndex }),
    });
  } finally {
    controller?.dispose();
  }
}
export type AutomationResponse = ReturnType<typeof executeAutomation>;
