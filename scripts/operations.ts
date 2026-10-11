import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { RecordController } from '@0disoft/banora/controller';
import { parseRecordCheckpoint } from '@0disoft/banora/checkpoint';
import { recordNodeAt, serializeSgf } from '@0disoft/banora/sgf';
import { getRuleProfile } from '@0disoft/banora/rules';
import { DRAFT_BACKUP_BYTES, isDraftEntry } from '../examples/studio/draft-store.js';

type Action = 'recovery-check' | 'drill-recovery';
type FailureCode = 'usage' | 'read' | 'limit' | 'json' | 'checkpoint' | 'mismatch' | 'drill';
class OperationsError extends Error {
  constructor(readonly code: FailureCode) {
    super(code);
  }
}
const help = {
  schemaVersion: 'banora.ops/v1',
  ok: true,
  commands: [
    {
      name: 'recovery-check',
      flags: ['--input'],
      input: 'Checkpoint or Studio backup JSON; - reads stdin.',
    },
    {
      name: 'drill-recovery',
      flags: [],
      input: 'Repository-authored study fixture; no user data.',
    },
  ],
  privacy:
    'No record content, filenames, paths or raw errors are emitted. Nothing is written or uploaded.',
  limits: { inputBytes: DRAFT_BACKUP_BYTES },
  exitCodes: { success: 0, usageOrRead: 2, invalidRecovery: 3 },
};
function failure(action: Action, code: FailureCode) {
  return { schemaVersion: 'banora.ops/v1' as const, ok: false as const, action, error: { code } };
}

/** Restore into a disposable controller; never modify the source backup or a live editor. */
export function verifyRecovery(input: unknown) {
  let editor: RecordController | undefined;
  try {
    const studio = isDraftEntry(input) && 'checkpoint' in input;
    const parsed = parseRecordCheckpoint(studio ? input.checkpoint : input);
    if (!parsed.ok) return failure('recovery-check', 'checkpoint');
    editor = new RecordController();
    if (!editor.loadCheckpoint(parsed.value).ok) return failure('recovery-check', 'checkpoint');
    const actual = editor.createCheckpoint();
    const state = editor.getState();
    const working = serializeSgf(parsed.record),
      baseline = serializeSgf(parsed.baseline);
    if (
      actual.sgf !== working ||
      actual.baselineSgf !== baseline ||
      actual.selection.gameIndex !== parsed.value.selection.gameIndex ||
      actual.selection.path.length !== parsed.value.selection.path.length ||
      !actual.selection.path.every(
        (index, offset) => index === parsed.value.selection.path[offset],
      ) ||
      actual.rules.ko !== parsed.value.rules.ko ||
      actual.rules.suicide !== parsed.value.rules.suicide ||
      actual.rules.passStones !== parsed.value.rules.passStones ||
      state.dirty !== (working !== baseline) ||
      state.canUndo ||
      state.canRedo
    )
      return failure('recovery-check', 'mismatch');
    return {
      schemaVersion: 'banora.ops/v1' as const,
      ok: true as const,
      action: 'recovery-check' as const,
      format: studio ? ('studio-draft' as const) : ('checkpoint' as const),
      dirty: state.dirty,
      checks: [
        'working-record',
        'export-baseline',
        'selection',
        'rules',
        'dirty',
        'new-session-history',
      ],
    };
  } catch {
    return failure('recovery-check', 'checkpoint');
  } finally {
    editor?.dispose();
  }
}

/** Rehearse validation, dirty guards, replacement and new-session Undo using authored data. */
export function drillRecovery(sgf: string) {
  let source: RecordController | undefined, target: RecordController | undefined;
  try {
    source = new RecordController({ sgf, rules: getRuleProfile('aga-area').play });
    const branch = recordNodeAt(source.getState().record, { gameIndex: 0, path: [0, 0, 0, 0, 1] });
    if (
      !branch ||
      !source.goTo(branch.id).ok ||
      !source.setComment('Recovery drill note').ok ||
      !source.setMarker({ x: 2, y: 4 }, 'triangle').ok
    )
      throw new OperationsError('drill');
    const checkpoint = JSON.parse(JSON.stringify(source.createCheckpoint()));
    const checked = verifyRecovery(checkpoint);
    if (!checked.ok || !checked.dirty) throw new OperationsError('drill');
    target = new RecordController({ size: 9 });
    if (!target.setComment('Unsaved drill work').ok) throw new OperationsError('drill');
    const held = target.getState();
    const invalid = target.loadCheckpoint(
      { ...checkpoint, schemaVersion: 'banora.checkpoint/future' },
      { discardChanges: true },
    );
    if (invalid.ok || invalid.reason !== 'invalid-checkpoint' || target.getState() !== held)
      throw new OperationsError('drill');
    const corrupt = target.loadCheckpoint(
      { ...checkpoint, sgf: 'Malformed drill record' },
      { discardChanges: true },
    );
    if (corrupt.ok || corrupt.reason !== 'invalid-checkpoint' || target.getState() !== held)
      throw new OperationsError('drill');
    const guarded = target.loadCheckpoint(checkpoint);
    if (guarded.ok || guarded.reason !== 'unsaved-changes' || target.getState() !== held)
      throw new OperationsError('drill');
    if (
      !target.loadCheckpoint(checkpoint, { discardChanges: true }).ok ||
      JSON.stringify(target.createCheckpoint()) !== JSON.stringify(checkpoint) ||
      target.getState().canUndo ||
      !target.getState().dirty
    )
      throw new OperationsError('drill');
    if (
      !target.setComment('Post-restore drill edit').ok ||
      !target.undo().ok ||
      JSON.stringify(target.createCheckpoint()) !== JSON.stringify(checkpoint)
    )
      throw new OperationsError('drill');
    return {
      schemaVersion: 'banora.ops/v1' as const,
      ok: true as const,
      action: 'drill-recovery' as const,
      checks: [
        ...checked.checks,
        'future-version-preserved',
        'corrupt-backup-preserved',
        'dirty-replacement-guard',
        'explicit-replacement',
        'post-restore-undo',
      ],
      scope:
        'Authored in-memory checkpoint drill; no browser storage, download, disk durability or release rollback claim.',
    };
  } catch {
    return failure('drill-recovery', 'drill');
  } finally {
    source?.dispose();
    target?.dispose();
  }
}

export async function readRecovery(path: string): Promise<unknown> {
  if (path === '-' && process.stdin.isTTY) throw new OperationsError('usage');
  const stream = path === '-' ? process.stdin : createReadStream(path);
  const chunks: Buffer[] = [];
  let bytes = 0;
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > DRAFT_BACKUP_BYTES) throw new OperationsError('limit');
      chunks.push(buffer);
    }
  } catch (error) {
    throw error instanceof OperationsError ? error : new OperationsError('read');
  }
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true })
        .decode(Buffer.concat(chunks))
        .replace(/^\uFEFF/, ''),
    );
  } catch {
    throw new OperationsError('json');
  }
}

if (import.meta.main) {
  const [action, ...args] = process.argv.slice(2);
  let result: unknown;
  try {
    if ((!action || action === '--help') && !args.length) result = help;
    else if (action === 'drill-recovery' && !args.length)
      result = drillRecovery(
        await readFile(new URL('../examples/fixtures/study.sgf', import.meta.url), 'utf8'),
      );
    else if (
      action === 'recovery-check' &&
      args.length === 2 &&
      args[0] === '--input' &&
      args[1] &&
      !args[1].startsWith('--')
    )
      result = verifyRecovery(await readRecovery(args[1]));
    else throw new OperationsError('usage');
    if ((result as { ok: boolean }).ok === false) process.exitCode = 3;
  } catch (error) {
    process.exitCode = 2;
    result = failure(
      action === 'drill-recovery' ? 'drill-recovery' : 'recovery-check',
      error instanceof OperationsError ? error.code : 'read',
    );
  }
  process.stdout.write(JSON.stringify(result) + '\n');
}
