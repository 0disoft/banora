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
import type { RecordCheckpoint } from './checkpoint.js';
import { isAutomationRequest } from './automation-schema.js';
import { searchRecord } from './record-search.js';
import type { RecordSearchOptions } from './record-search.js';
import { DiagnosticJournal, describeDiagnosticFailure } from './diagnostics.js';
import type {
  DiagnosticEnvironment,
  DiagnosticOperation,
  DiagnosticFailure,
} from './diagnostics.js';
export { AUTOMATION_SCHEMA } from './automation-schema.js';

export type AutomationOperation =
  | { op: 'play'; point: Point | null }
  | { op: 'previous' | 'undo' | 'redo' | 'clear-strokes' | 'legal-points' }
  | { op: 'next'; variation?: number }
  | { op: 'goto'; target: RecordLocator }
  | { op: 'comment'; text: string }
  | ({ op: 'search' } & RecordSearchOptions)
  | {
      op: 'comment-batch';
      changes: readonly { target: RecordLocator; text: string; expectedText?: string }[];
      previewOnly?: boolean;
      expectedSgf?: string;
    }
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
      checkpoint?: RecordCheckpoint;
      includeCheckpoint?: boolean;
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
  return runAutomation(input);
}

const diagnosticOperations = {
  play: 'edit',
  previous: 'navigate',
  next: 'navigate',
  goto: 'navigate',
  undo: 'edit',
  redo: 'edit',
  comment: 'edit',
  marker: 'edit',
  setup: 'edit',
  connection: 'edit',
  stroke: 'edit',
  'remove-stroke': 'edit',
  'clear-strokes': 'edit',
  'remove-branch': 'edit',
  'reorder-branch': 'edit',
  search: 'search',
  'comment-batch': 'batch',
  score: 'scoring',
  'legal-points': 'search',
} as const satisfies Record<AutomationOperation['op'], DiagnosticOperation>;

/** Run once on an isolated record; return only bounded, content-free operation evidence. */
export function diagnoseAutomation(input: unknown, environment: DiagnosticEnvironment = {}) {
  const journal = new DiagnosticJournal({ capacity: 256 });
  // Validate/copy the explicit environment before executing any request work.
  const projectedEnvironment = journal.createReport(environment).environment;
  const result = runAutomation(input, journal);
  return Object.freeze({
    schemaVersion: 'banora.automation-diagnostics/v1' as const,
    ok: result.ok,
    ...(!result.ok && result.error.operationIndex !== undefined
      ? { operationIndex: result.error.operationIndex }
      : {}),
    diagnostics: journal.createReport(projectedEnvironment),
  });
}
export type AutomationDiagnosticResponse = ReturnType<typeof diagnoseAutomation>;

function runAutomation(input: unknown, journal?: DiagnosticJournal) {
  let controller: RecordController | undefined;
  let operationIndex: number | undefined;
  let phase: DiagnosticOperation = 'import';
  const succeeded = () => journal?.record({ operation: phase, status: 'success' });
  const reject = (error: AutomationError, descriptor?: DiagnosticFailure) => {
    journal?.record({
      operation: phase,
      status: 'failure',
      failure:
        descriptor ??
        describeDiagnosticFailure(
          error.reason === undefined ? 'automation' : 'controller',
          error.reason ?? error.code,
        ),
    });
    return failure(error);
  };
  try {
    if (!isAutomationRequest(input))
      return reject({
        code: 'invalid-request',
        message: 'Request does not match AUTOMATION_SCHEMA.',
      });
    const request = input as AutomationRequest;
    if (request.kind === 'snapshot') {
      const response = {
        schemaVersion: 'banora.automation/v1' as const,
        ok: true as const,
        kind: 'snapshot' as const,
        snapshot: createBoardSnapshot(request.state),
      };
      succeeded();
      return response;
    }
    if (
      request.checkpoint &&
      (request.sgf !== undefined ||
        request.size !== undefined ||
        request.profile !== undefined ||
        request.selection !== undefined)
    )
      return reject({
        code: 'invalid-request',
        message: 'Checkpoint input cannot be combined with SGF, size, profile or selection.',
      });
    controller = new RecordController({
      sgf: request.sgf,
      size: request.size,
      rules: request.profile ? getRuleProfile(request.profile).play : undefined,
    });
    succeeded();
    if (request.checkpoint) {
      phase = 'restore';
      const restored = controller.loadCheckpoint(request.checkpoint);
      if (!restored.ok)
        return reject({
          code: 'invalid-input',
          message: 'Checkpoint could not be restored.',
          reason: restored.reason,
        });
      succeeded();
    }
    const targetId = (target: RecordLocator) =>
      recordNodeAt(controller!.getState().record, target)?.id ?? '';
    if (request.selection) {
      phase = 'navigate';
      const result = controller.goTo(targetId(request.selection));
      if (!result.ok)
        return reject({
          code: 'command-failed',
          message: 'Selection was not found.',
          reason: result.reason,
        });
      succeeded();
    }
    const results: unknown[] = [];
    let legalPointBudget = 8192;
    let recordToolBudget = 8;
    for (const [index, operation] of (request.operations ?? []).entries()) {
      operationIndex = index;
      phase = Object.hasOwn(diagnosticOperations, operation.op)
        ? diagnosticOperations[operation.op]
        : 'edit';
      if ((operation.op === 'search' || operation.op === 'comment-batch') && --recordToolBudget < 0)
        return reject({
          code: 'command-failed',
          message: 'Record tools exceed the per-request 8-call budget.',
          operationIndex: index,
          reason: 'limit',
        });
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
        case 'search': {
          const { op: _op, ...options } = operation;
          try {
            results.push({
              operationIndex: index,
              op: operation.op,
              value: searchRecord(controller.getState().record, options),
            });
            result = { ok: true };
          } catch (error) {
            if (!(error instanceof TypeError) && !(error instanceof RangeError)) throw error;
            return reject({
              code: 'command-failed',
              message: 'Record search rejected its options or work/output bounds.',
              operationIndex: index,
              reason: error instanceof RangeError ? 'limit' : 'invalid-edit',
            });
          }
          break;
        }
        case 'comment-batch': {
          if (
            operation.expectedSgf !== undefined &&
            operation.expectedSgf !== serializeSgf(controller.getState().record)
          ) {
            result = { ok: false, reason: 'stale-preview' };
            break;
          }
          const targets = new Map<string, RecordLocator>();
          const changes = operation.changes.map(({ target, ...change }) => {
            const nodeId = targetId(target);
            targets.set(nodeId, target);
            return { ...change, nodeId };
          });
          if (changes.some((change) => !change.nodeId)) {
            result = { ok: false, reason: 'node-not-found' };
            break;
          }
          const preview = controller.previewComments(changes);
          if (!preview.ok) {
            result = preview;
            break;
          }
          result = operation.previewOnly ? { ok: true } : controller.applyComments(preview.preview);
          if (result.ok)
            results.push({
              operationIndex: index,
              op: operation.op,
              value: {
                applied: !operation.previewOnly,
                edits: preview.preview.edits.map(({ nodeId, before, after }) => ({
                  target: targets.get(nodeId)!,
                  before,
                  after,
                })),
              },
            });
          break;
        }
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
            return reject(
              {
                code: 'command-failed',
                message: score.message,
                operationIndex: index,
                reason: score.reason,
              },
              describeDiagnosticFailure('scoring', score.reason),
            );
          results.push({ operationIndex: index, op: operation.op, value: score.value });
          result = { ok: true };
          break;
        }
        case 'legal-points': {
          const position = controller.getState().position,
            points: Point[] = [];
          legalPointBudget -= position.width * position.height;
          if (legalPointBudget < 0)
            return reject({
              code: 'command-failed',
              message: 'Legal-point queries exceed the per-request 8192-cell budget.',
              operationIndex: index,
              reason: 'limit',
            });
          for (let y = 0; y < position.height; y++)
            for (let x = 0; x < position.width; x++)
              if (play(position, { x, y }).ok) points.push({ x, y });
          results.push({ operationIndex: index, op: operation.op, points, pass: true });
          result = { ok: true };
          break;
        }
      }
      if (!result.ok)
        return reject({
          code: 'command-failed',
          message: `Operation ${index} (${operation.op}) failed.`,
          operationIndex: index,
          reason: result.reason,
        });
      succeeded();
    }
    operationIndex = undefined;
    phase = 'export';
    const state = controller.getState();
    const response = {
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
    succeeded();
    let checkpoint: RecordCheckpoint | undefined;
    if (request.includeCheckpoint) {
      phase = 'checkpoint';
      checkpoint = controller.createCheckpoint();
      succeeded();
    }
    return { ...response, ...(checkpoint ? { checkpoint } : {}) };
  } catch (error) {
    let message = 'Invalid input.';
    // Diagnostic execution never accesses an arbitrary exception's message, even an accessor.
    if (!journal) {
      try {
        if (error instanceof Error) message = error.message;
      } catch {
        /* Fixed fallback. */
      }
    }
    return reject({
      code: 'invalid-input',
      message,
      ...(operationIndex === undefined ? {} : { operationIndex }),
    });
  } finally {
    controller?.dispose();
  }
}
export type AutomationResponse = ReturnType<typeof executeAutomation>;
