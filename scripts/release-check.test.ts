import { expect, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { ReleaseCheckError, runReleaseCheck } from './release-check.js';

class CheckChild extends EventEmitter {
  pid: number | undefined = 123456;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  stdout = new PassThrough();
  stderr = new PassThrough();
  unrefs = 0;
  unref() {
    this.unrefs++;
  }
}
function fixture() {
  const child = new CheckChild();
  let kills = 0;
  const options = {
    start: () => child,
    confirmationMs: 5,
    terminate: () => {
      kills++;
    },
  };
  return { child, options, kills: () => kills };
}

test('failed termination cannot leave a release check waiting for close indefinitely', async () => {
  const { child, options, kills } = fixture();
  const cause = new Error('private process details');
  const error = await runReleaseCheck('.', [], 'isolated-timeout', 5, {
    ...options,
    terminate() {
      options.terminate();
      throw cause;
    },
  }).catch((error: unknown) => error);
  expect(error).toBeInstanceOf(ReleaseCheckError);
  expect(error).toMatchObject({ code: 'check', stage: 'termination-unconfirmed', cause });
  expect(JSON.stringify(error)).not.toContain('private');
  expect((error as Error).message).toBe('Release: check.');
  expect(kills()).toBe(1);
  expect(child.unrefs).toBe(1);
  expect(child.stdout.destroyed && child.stderr.destroyed).toBe(true);
  expect(child.listenerCount('close')).toBe(0);
  expect(child.listenerCount('exit')).toBe(0);
  child.emit('error', cause);
  child.stdout.emit('error', cause);
  child.emit('close', 0); // Late success cannot undo refusal.
});

test('an exited parent with inherited open pipes times out without claiming a running parent', async () => {
  const { child, options } = fixture();
  const pending = runReleaseCheck('.', [], 'inherited-pipes', 5, options);
  child.exitCode = 0;
  child.emit('exit', 0);
  await expect(pending).rejects.toMatchObject({ stage: 'timeout' });
  expect(child.unrefs).toBe(0);
  expect(child.stdout.destroyed && child.stderr.destroyed).toBe(true);
});

test('exit confirms forced stop even when close never arrives, and browser cleanup cannot mask failure', async () => {
  const { child, options } = fixture();
  const sessions: string[] = [];
  await expect(
    runReleaseCheck('.', [], 'browser-bundle', 5, {
      ...options,
      terminate() {
        child.signalCode = 'SIGKILL';
        child.emit('exit', null, 'SIGKILL');
      },
      closeBrowser(root, session) {
        expect(root).toBe('.');
        sessions.push(session);
        throw new Error('private cleanup');
      },
    }),
  ).rejects.toMatchObject({ stage: 'timeout' });
  expect(sessions).toEqual(['banora-smoke-123456']);
  expect(child.unrefs).toBe(0);
});

test('pre-abort never starts work; active cancellation stops once and preserves its private reason', async () => {
  const { child, options, kills } = fixture();
  const controller = new AbortController();
  const cause = new Error('private caller reason');
  controller.abort(cause);
  await expect(
    runReleaseCheck('.', [], 'pre-abort', 500, {
      ...options,
      signal: controller.signal,
      start() {
        throw new Error('must not start');
      },
    }),
  ).rejects.toMatchObject({ stage: 'cancelled', cause });
  const active = new AbortController();
  const pending = runReleaseCheck('.', [], 'cancel', 500, { ...options, signal: active.signal });
  active.abort(cause);
  child.signalCode = 'SIGKILL';
  child.emit('exit', null, 'SIGKILL');
  await expect(pending).rejects.toMatchObject({ stage: 'cancelled', cause });
  expect(kills()).toBe(1);
});

test('spawn and pipe errors preserve causes while normal completion clears cancellation ownership', async () => {
  const cause = new Error('private transport detail');
  await expect(
    runReleaseCheck('.', [], 'spawn', 500, {
      start() {
        throw cause;
      },
    }),
  ).rejects.toMatchObject({ stage: 'spawn', cause });
  const missing = fixture();
  missing.child.pid = undefined;
  const failed = runReleaseCheck('.', [], 'spawn-event', 500, missing.options);
  missing.child.emit('error', cause);
  await expect(failed).rejects.toMatchObject({ stage: 'spawn', cause });
  expect(missing.kills()).toBe(0);
  const pipe = fixture();
  const broken = runReleaseCheck('.', [], 'pipe-error', 500, {
    ...pipe.options,
    terminate() {
      pipe.child.signalCode = 'SIGKILL';
      pipe.child.emit('exit');
    },
  });
  pipe.child.stderr.emit('error', cause);
  await expect(broken).rejects.toMatchObject({ stage: 'execution', cause });
  const normal = fixture();
  const controller = new AbortController();
  const completed = runReleaseCheck('.', [], 'normal', 500, {
    ...normal.options,
    signal: controller.signal,
  });
  normal.child.emit('close', 0);
  await completed;
  controller.abort(cause);
  expect(normal.kills()).toBe(0);
});

test('existing required arguments still execute a successful real child', async () => {
  await runReleaseCheck(process.cwd(), ['-e', 'process.exit(0)'], 'success-fixture', 5000);
});
