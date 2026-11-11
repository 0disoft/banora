import type { Position, RulePolicy } from './core.js';
import { DEFAULT_SGF_LIMITS, parseSgf, recordNodeAt } from './sgf.js';
import type { RecordLocator, SgfDiagnostic, SgfLimits, SgfNode, SgfRecord } from './sgf.js';
import { initialRecordPosition, applyRecordNode } from './record-runtime.js';
import { freezeSchema, matches } from './json-schema.js';

export interface RecordCheckpoint {
  readonly schemaVersion: 'banora.checkpoint/v1';
  readonly sgf: string;
  readonly baselineSgf: string;
  readonly selection: RecordLocator;
  readonly rules: RulePolicy;
}

/** Discovery only; SGF semantics and selected-path replay are also validated. */
export const CHECKPOINT_SCHEMA = freezeSchema({
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'sgf', 'baselineSgf', 'selection', 'rules'],
  properties: {
    schemaVersion: { const: 'banora.checkpoint/v1' },
    sgf: { type: 'string', maxLength: DEFAULT_SGF_LIMITS.maxBytes },
    baselineSgf: { type: 'string', maxLength: DEFAULT_SGF_LIMITS.maxBytes },
    selection: {
      type: 'object',
      additionalProperties: false,
      required: ['gameIndex', 'path'],
      properties: {
        gameIndex: { type: 'integer', minimum: 0, maximum: DEFAULT_SGF_LIMITS.maxNodes - 1 },
        path: {
          type: 'array',
          maxItems: DEFAULT_SGF_LIMITS.maxNodes - 1,
          items: { type: 'integer', minimum: 0, maximum: DEFAULT_SGF_LIMITS.maxNodes - 1 },
        },
      },
    },
    rules: {
      type: 'object',
      additionalProperties: false,
      required: ['suicide', 'ko', 'passStones'],
      properties: {
        suicide: { enum: ['forbid', 'allow'] },
        ko: { enum: ['simple', 'none', 'positional-superko', 'situational-superko'] },
        passStones: { type: 'boolean' },
      },
    },
  },
} as const);

export type RecordCheckpointResult =
  | {
      readonly ok: true;
      readonly value: RecordCheckpoint;
      readonly record: SgfRecord;
      readonly baseline: SgfRecord;
      readonly node: SgfNode;
    }
  | { readonly ok: false; readonly diagnostics: readonly SgfDiagnostic[] };

type PreparedCheckpointResult =
  | (Extract<RecordCheckpointResult, { ok: true }> & {
      readonly positions: ReadonlyMap<string, Position>;
    })
  | Extract<RecordCheckpointResult, { ok: false }>;

/** Internal validation plus a bounded replay window, adopted only after approval. */
export function prepareRecordCheckpoint(
  input: unknown,
  limits: Partial<SgfLimits> = {},
  positionLimit = 0,
): PreparedCheckpointResult {
  const fail = (message: string): Extract<RecordCheckpointResult, { ok: false }> => ({
    ok: false,
    diagnostics: [{ code: 'property', message }],
  });
  if (!matches(input, CHECKPOINT_SCHEMA))
    return fail('Unsupported or malformed record checkpoint.');
  const data = input as RecordCheckpoint;
  const record = parseSgf(data.sgf, limits);
  if (!record.ok) return record;
  const baseline = data.baselineSgf === data.sgf ? record : parseSgf(data.baselineSgf, limits);
  if (!baseline.ok) return baseline;
  const node = recordNodeAt(record.record, data.selection);
  if (!node) return fail('Checkpoint selection was not found.');
  // Resolve the selected replay before a controller commits any replacement.
  // Recorded moves retain SGF replay semantics, distinct from new legal play.
  let current = record.record.games[data.selection.gameIndex]!;
  let position = initialRecordPosition(current, data.rules);
  const positions = new Map<string, Position>();
  const remember = () => {
    if (positionLimit === 0) return;
    positions.set(current.id, position);
    if (positions.size > positionLimit) positions.delete(positions.keys().next().value!);
  };
  try {
    position = applyRecordNode(position, current);
    remember();
    for (const index of data.selection.path) {
      current = current.children[index]!;
      position = applyRecordNode(position, current);
      remember();
    }
  } catch {
    return fail('Checkpoint selected path contains an invalid recorded transition.');
  }
  const value: RecordCheckpoint = Object.freeze({
    schemaVersion: 'banora.checkpoint/v1',
    sgf: data.sgf,
    baselineSgf: data.baselineSgf,
    selection: Object.freeze({
      gameIndex: data.selection.gameIndex,
      path: Object.freeze([...data.selection.path]),
    }),
    rules: Object.freeze({ ...data.rules }),
  });
  return { ok: true, value, record: record.record, baseline: baseline.record, node, positions };
}
