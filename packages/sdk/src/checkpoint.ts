import { prepareRecordCheckpoint } from './checkpoint-validation.js';
import type { RecordCheckpointResult } from './checkpoint-validation.js';
import type { SgfLimits } from './sgf.js';

export { CHECKPOINT_SCHEMA } from './checkpoint-validation.js';
export type { RecordCheckpoint, RecordCheckpointResult } from './checkpoint-validation.js';

/** Check untrusted recovery data without storage access or controller mutation. */
export function parseRecordCheckpoint(
  input: unknown,
  limits: Partial<SgfLimits> = {},
): RecordCheckpointResult {
  const prepared = prepareRecordCheckpoint(input, limits);
  if (!prepared.ok) return prepared;
  return {
    ok: true,
    value: prepared.value,
    record: prepared.record,
    baseline: prepared.baseline,
    node: prepared.node,
  };
}
