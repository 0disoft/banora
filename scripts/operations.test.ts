import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RecordController } from '@0disoft/banora/controller';
import { verifyRecovery, drillRecovery } from './operations.js';

test('recovery checks round-trip collections, dirty baselines, branch selection and policy without outputting authored data', () => {
  const controller = new RecordController({
    sgf: '(;SZ[5]XG[Retained sample];B[aa](;W[bb])(;W[cc]C[Sample note]))(;SZ[9])',
    rules: { ko: 'situational-superko', suicide: 'allow', passStones: true },
  });
  try {
    controller.next();
    controller.next(1);
    controller.setComment('Edited sample note');
    const checkpoint = JSON.parse(JSON.stringify(controller.createCheckpoint()));
    const before = JSON.stringify(checkpoint);
    const state = controller.getState();
    const checked = verifyRecovery(checkpoint);
    expect(checked.ok).toBe(true);
    if (!checked.ok) throw Error('Fixture restore failed');
    expect(checked.dirty).toBe(true);
    expect(checked.format).toBe('checkpoint');
    expect(checked.checks).toHaveLength(6);
    expect(JSON.stringify(checked)).not.toMatch(
      /Sample|Retained|Edited|sgf|baselineSgf|path|filename|updatedAt/,
    );
    expect(JSON.stringify(checkpoint)).toBe(before);
    expect(controller.getState()).toBe(state);
    const wrapper = {
      schemaVersion: 'banora.studio-draft/v1',
      id: 'sample-draft',
      filename: 'sample.sgf',
      revision: 1,
      updatedAt: 0,
      checkpoint,
    };
    const studio = verifyRecovery(wrapper);
    expect(studio.ok).toBe(true);
    if (studio.ok) expect(studio.format).toBe('studio-draft');
    expect(JSON.stringify(studio)).not.toContain('sample-draft');
    expect(verifyRecovery({ ...wrapper, schemaVersion: 'banora.studio-draft/future' }).ok).toBe(
      false,
    );
    expect(verifyRecovery({ ...checkpoint, schemaVersion: 'banora.checkpoint/future' }).ok).toBe(
      false,
    );
    expect(verifyRecovery({ ...checkpoint, selection: { gameIndex: 10, path: [] } }).ok).toBe(
      false,
    );
    expect(verifyRecovery({ ...checkpoint, sgf: 'Malformed sample' }).ok).toBe(false);
    const hostile = new Proxy(
      {},
      {
        get() {
          throw Error('Authored error');
        },
      },
    );
    expect(verifyRecovery(hostile).ok).toBe(false);
    expect(verifyRecovery(null).ok).toBe(false);
  } finally {
    controller.dispose();
  }
  const clean = new RecordController({ size: 9 });
  try {
    const checked = verifyRecovery(clean.createCheckpoint());
    expect(checked.ok && !checked.dirty).toBe(true);
  } finally {
    clean.dispose();
  }
});

test('the authored drill exercises guarded replacement and post-restore Undo', async () => {
  const report = drillRecovery(await readFile('examples/fixtures/study.sgf', 'utf8'));
  expect(report.ok).toBe(true);
  if (report.ok) expect(report.checks).toContain('post-restore-undo');
  expect(drillRecovery('Malformed sample').ok).toBe(false);
});

test('the actual operations command reads files/stdin, emits safe failures and leaves input bytes unchanged', async () => {
  const root = process.cwd();
  await mkdir(resolve(root, '.tmp'), { recursive: true });
  const directory = await mkdtemp(resolve(root, '.tmp/operations-'));
  const controller = new RecordController({ size: 9 });
  const checkpoint = JSON.stringify(controller.createCheckpoint());
  controller.dispose();
  const file = resolve(directory, 'sample-backup.json');
  await writeFile(file, checkpoint);
  const invoke = (args: string[], status: number, stdin?: string | Buffer) => {
    const result = Bun.spawnSync(
      [process.execPath, resolve(root, 'scripts/operations.ts'), ...args],
      {
        cwd: root,
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: stdin === undefined ? 'ignore' : Buffer.from(stdin),
      },
    );
    expect(result.exitCode).toBe(status);
    expect(result.stderr.toString()).toBe('');
    const output = result.stdout.toString();
    expect(output.trim().split('\n')).toHaveLength(1);
    expect(output).not.toContain(directory);
    return JSON.parse(output);
  };
  expect(invoke(['--help'], 0).commands[0].name).toBe('recovery-check');
  expect(invoke(['recovery-check', '--input', file], 0).format).toBe('checkpoint');
  expect(invoke(['recovery-check', '--input', '-'], 0, checkpoint).ok).toBe(true);
  expect(invoke(['recovery-check', '--input', '-'], 0, '\uFEFF' + checkpoint).ok).toBe(true);
  expect(invoke(['drill-recovery'], 0).checks).toContain('dirty-replacement-guard');
  expect(invoke(['recovery-check', '--input', '-'], 3, '{}').error.code).toBe('checkpoint');
  expect(invoke(['recovery-check', '--input', '-'], 2, 'Malformed sample').error.code).toBe('json');
  expect(invoke(['recovery-check', '--input', '-'], 2, Buffer.from([0xff])).error.code).toBe(
    'json',
  );
  expect(
    invoke(['recovery-check', '--input', resolve(directory, 'missing.json')], 2).error.code,
  ).toBe('read');
  expect(invoke(['recovery-check', '--input', file, '--force'], 2).error.code).toBe('usage');
  expect(invoke(['--help', '--input', file], 2).error.code).toBe('usage');
  expect(invoke(['drill-recovery', '--input', file], 2).error.code).toBe('usage');
  expect(await readFile(file, 'utf8')).toBe(checkpoint);
});
