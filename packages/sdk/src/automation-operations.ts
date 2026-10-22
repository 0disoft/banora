import type { AutomationError, AutomationOperation } from './automation.js';
import type { RecordController, CommandResult } from './controller.js';
import { play } from './core.js';
import type { Point, Position } from './core.js';
import { recordNodeAt, serializeSgf } from './sgf.js';
import type { RecordLocator } from './sgf.js';
import { searchRecord } from './record-search.js';
import { scorePosition } from './scoring.js';
import { describeDiagnosticFailure } from './diagnostics.js';
import type { DiagnosticFailure } from './diagnostics.js';
import { AUTOMATION_LIMITS } from './automation-limits.js';

export interface OperationBudget {
  readonly recordToolCalls: number;
  readonly legalPointCells: number;
}
export type OperationExecution =
  | { readonly ok: true; readonly budget: OperationBudget; readonly output?: unknown }
  | {
      readonly ok: false;
      readonly error: AutomationError;
      readonly descriptor?: DiagnosticFailure;
    };

const targetId = (controller: RecordController, target: RecordLocator) =>
  recordNodeAt(controller.getState().record, target)?.id ?? '';

function failed(error: AutomationError, descriptor?: DiagnosticFailure): OperationExecution {
  return { ok: false, error, descriptor };
}
function completed(
  command: CommandResult,
  operation: AutomationOperation,
  index: number,
  budget: OperationBudget,
  output?: unknown,
): OperationExecution {
  if (!command.ok)
    return failed({
      code: 'command-failed',
      message: `Operation ${index} (${operation.op}) failed.`,
      operationIndex: index,
      reason: command.reason,
    });
  return { ok: true, budget, ...(output === undefined ? {} : { output }) };
}

function search(
  controller: RecordController,
  operation: Extract<AutomationOperation, { op: 'search' }>,
  index: number,
  budget: OperationBudget,
): OperationExecution {
  const { op: _op, ...options } = operation;
  try {
    const value = searchRecord(controller.getState().record, options);
    return { ok: true, budget, output: { operationIndex: index, op: operation.op, value } };
  } catch (error) {
    if (!(error instanceof TypeError) && !(error instanceof RangeError)) throw error;
    return failed({
      code: 'command-failed',
      message: 'Record search rejected its options or work/output bounds.',
      operationIndex: index,
      reason: error instanceof RangeError ? 'limit' : 'invalid-edit',
    });
  }
}

function commentBatch(
  controller: RecordController,
  operation: Extract<AutomationOperation, { op: 'comment-batch' }>,
  index: number,
  budget: OperationBudget,
): OperationExecution {
  if (
    operation.expectedSgf !== undefined &&
    operation.expectedSgf !== serializeSgf(controller.getState().record)
  )
    return completed({ ok: false, reason: 'stale-preview' }, operation, index, budget);
  const targets = new Map<string, RecordLocator>();
  const changes = operation.changes.map(({ target, ...change }) => {
    const nodeId = targetId(controller, target);
    targets.set(nodeId, target);
    return { ...change, nodeId };
  });
  if (changes.some((change) => !change.nodeId))
    return completed({ ok: false, reason: 'node-not-found' }, operation, index, budget);
  const preview = controller.previewComments(changes);
  if (!preview.ok) return completed(preview, operation, index, budget);
  const command = operation.previewOnly
    ? { ok: true as const }
    : controller.applyComments(preview.preview);
  if (!command.ok) return completed(command, operation, index, budget);
  const edits = preview.preview.edits.map(({ nodeId, before, after }) => {
    const target = targets.get(nodeId)!;
    return { target: { gameIndex: target.gameIndex, path: [...target.path] }, before, after };
  });
  return {
    ok: true,
    budget,
    output: {
      operationIndex: index,
      op: operation.op,
      value: { applied: !operation.previewOnly, edits },
    },
  };
}

function score(
  controller: RecordController,
  operation: Extract<AutomationOperation, { op: 'score' }>,
  index: number,
  budget: OperationBudget,
): OperationExecution {
  const result = scorePosition(controller.getState().position, operation);
  if (!result.ok)
    return failed(
      {
        code: 'command-failed',
        message: result.message,
        operationIndex: index,
        reason: result.reason,
      },
      describeDiagnosticFailure('scoring', result.reason),
    );
  return {
    ok: true,
    budget,
    output: { operationIndex: index, op: operation.op, value: result.value },
  };
}

/** Owned local buffers keep the scan linear without copying per accepted point. */
function legalPoints(position: Position): Point[] {
  const points: Point[] = [];
  for (let y = 0; y < position.height; y++)
    for (let x = 0; x < position.width; x++) if (play(position, { x, y }).ok) points.push({ x, y });
  return points;
}
function scanLegalPoints(
  controller: RecordController,
  index: number,
  budget: OperationBudget,
): OperationExecution {
  const position = controller.getState().position;
  const remaining = {
    ...budget,
    legalPointCells: budget.legalPointCells - position.width * position.height,
  };
  if (remaining.legalPointCells < 0)
    return failed({
      code: 'command-failed',
      message: `Legal-point queries exceed the per-request ${AUTOMATION_LIMITS.legalPointCells}-cell budget.`,
      operationIndex: index,
      reason: 'limit',
    });
  return {
    ok: true,
    budget: remaining,
    output: {
      operationIndex: index,
      op: 'legal-points',
      points: legalPoints(position),
      pass: true,
    },
  };
}

/** Budgets are request-owned values: neither inputs nor an earlier budget are mutated. */
export function executeOperation(
  controller: RecordController,
  operation: AutomationOperation,
  index: number,
  budget: OperationBudget,
): OperationExecution {
  const remaining =
    operation.op === 'search' || operation.op === 'comment-batch'
      ? { ...budget, recordToolCalls: budget.recordToolCalls - 1 }
      : budget;
  if (remaining.recordToolCalls < 0)
    return failed({
      code: 'command-failed',
      message: `Record tools exceed the per-request ${AUTOMATION_LIMITS.recordToolCalls}-call budget.`,
      operationIndex: index,
      reason: 'limit',
    });
  let command: CommandResult;
  switch (operation.op) {
    case 'search':
      return search(controller, operation, index, remaining);
    case 'comment-batch':
      return commentBatch(controller, operation, index, remaining);
    case 'score':
      return score(controller, operation, index, remaining);
    case 'legal-points':
      return scanLegalPoints(controller, index, remaining);
    case 'play':
      command = controller.play(operation.point);
      break;
    case 'previous':
      command = controller.previous();
      break;
    case 'next':
      command = controller.next(operation.variation);
      break;
    case 'goto':
      command = controller.goTo(targetId(controller, operation.target));
      break;
    case 'comment':
      command = controller.setComment(operation.text);
      break;
    case 'move-assessment':
      command = controller.setMoveAssessment(
        operation.value,
        operation.target ? targetId(controller, operation.target) : undefined,
      );
      break;
    case 'marker':
      command = controller.setMarker(operation.point, operation.kind, operation.label);
      break;
    case 'setup':
      command = controller.setSetup(operation.stones, operation.toPlay);
      break;
    case 'connection':
      command = controller.setConnection(
        operation.from,
        operation.to,
        operation.kind,
        operation.present,
      );
      break;
    case 'stroke':
      command = controller.addStroke(operation.points, operation);
      break;
    case 'remove-stroke':
      command = controller.removeStroke(operation.id);
      break;
    case 'clear-strokes':
      command = controller.clearStrokes();
      break;
    case 'remove-branch':
      command = controller.removeBranch(
        operation.target ? targetId(controller, operation.target) : undefined,
      );
      break;
    case 'reorder-branch':
      command = controller.reorderBranch(targetId(controller, operation.target), operation.index);
      break;
    case 'undo':
      command = controller.undo();
      break;
    case 'redo':
      command = controller.redo();
      break;
  }
  return completed(command, operation, index, remaining);
}
