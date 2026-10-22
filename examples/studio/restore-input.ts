import { parseRecordCheckpoint } from '@0disoft/banora/checkpoint';
import type { RecordCheckpoint } from '@0disoft/banora/checkpoint';
import { DraftError, isDraftEntry } from './draft-store.js';

/** Validate before approval and hand off owned data, not the mutable storage input. */
export function prepareDraftRestore(input: unknown): {
  readonly checkpoint: RecordCheckpoint;
  readonly filename: string;
} {
  if (!isDraftEntry(input) || !('checkpoint' in input)) throw new DraftError('invalid');
  const parsed = parseRecordCheckpoint(input.checkpoint);
  if (!parsed.ok) throw new DraftError('invalid');
  return { checkpoint: parsed.value, filename: input.filename };
}
