import { expect, spyOn, test } from 'bun:test';
import { RecordController } from '@0disoft/banora/controller';
import { DraftAutosave } from '../examples/studio/draft-session.js';
import { DraftError } from '../examples/studio/draft-store.js';
import type { StudioDraft } from '../examples/studio/draft-store.js';
import { StudioWorkspace } from '../examples/studio/workspace.js';
import { TestScheduler } from './test-scheduler.js';

for (const channel of ['workspace', 'controller'] as const)
  test(`${channel} listener failure cannot suppress a committed edit's autosave`, async () => {
    const workspace = new StudioWorkspace();
    const scheduler = new TestScheduler();
    const saved: StudioDraft[] = [];
    const logs = spyOn(console, 'error').mockImplementation(() => {});
    let armed = false;
    const listener = () => {
      if (armed) throw Error('Private observer failure');
    };
    const stop =
      channel === 'workspace'
        ? workspace.subscribe(listener)
        : workspace.controller.subscribe(listener);
    const autosave = new DraftAutosave(
      workspace.controller,
      () => workspace.active.filename,
      {
        save: async (draft) => {
          saved.push(draft);
        },
      },
      true,
      () => {},
      undefined,
      { now: () => 1234, createId: () => 'observer-test', scheduler },
    );
    try {
      armed = true;
      expect(workspace.controller.setComment('Must reach autosave').ok).toBe(true);
      scheduler.advance(500);
      await autosave.idle();
      expect(saved).toHaveLength(1);
      expect(saved[0]!.checkpoint.sgf).toContain('Must reach autosave');
      expect(autosave.getStatus()).toBe('saved');
      expect(logs.mock.calls).toEqual([
        [`Banora workspace ${channel === 'workspace' ? 'change' : 'state'} listener failed`],
      ]);
    } finally {
      stop();
      await autosave.close();
      workspace.dispose();
      logs.mockRestore();
    }
  });

test('debounce boundaries and status failures preserve actual saves and committed revisions', async () => {
  const controller = new RecordController({ size: 9 });
  const scheduler = new TestScheduler();
  const logs = spyOn(console, 'error').mockImplementation(() => {});
  const saved: StudioDraft[] = [];
  const statuses: string[] = [];
  const autosave = new DraftAutosave(
    controller,
    () => 'draft.sgf',
    {
      save: async (draft) => {
        saved.push(draft);
      },
    },
    true,
    (status) => {
      statuses.push(status);
      throw Error('private UI exception');
    },
    undefined,
    { now: () => 1234, createId: () => 'test-owner', scheduler },
  );
  try {
    controller.setComment('first');
    scheduler.advance(499);
    expect(saved).toHaveLength(0);
    controller.setComment('latest');
    scheduler.advance(499);
    expect(saved).toHaveLength(0);
    scheduler.advance(1);
    await autosave.idle();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ id: 'test-owner', updatedAt: 1234, revision: 1 });
    expect(saved[0]!.checkpoint.sgf).toContain('latest');
    expect(autosave.getStatus()).toBe('saved');
    expect(statuses).toEqual(['saving', 'saved']);
    controller.setComment('close flush');
    await autosave.close();
    expect(saved[1]!.revision).toBe(2);
    expect(saved[1]!.checkpoint.sgf).toContain('close flush');
    expect(scheduler.pending).toBe(0);
    scheduler.advance(501);
    expect(saved).toHaveLength(2);
    expect(
      logs.mock.calls.every(
        (call) => call.length === 1 && call[0] === 'Banora autosave status listener failed',
      ),
    ).toBe(true);
    expect(controller.getState().dirty).toBe(true);
  } finally {
    await autosave.close();
    logs.mockRestore();
    controller.dispose();
  }
});

for (const firstStatus of ['saved', 'quota'] as const)
  test(`autosave drains checkpoints queued after ${firstStatus} before completing close or retry`, async () => {
    const controller = new RecordController({ size: 5 });
    const calls: { draft: StudioDraft; expected: number }[] = [];
    let closing: Promise<void> | undefined;
    let release = () => {};
    const autosave = new DraftAutosave(
      controller,
      () => 'draft.sgf',
      {
        save(draft, expected) {
          calls.push({ draft, expected });
          if (calls.length === 2)
            return new Promise<void>((resolve) => {
              release = resolve;
            });
          return calls.length === 1 && firstStatus === 'quota'
            ? Promise.reject(new DraftError('quota'))
            : Promise.resolve();
        },
      },
      true,
      (status) => {
        if (status !== firstStatus || calls.length !== 1) return;
        queueMicrotask(() => {
          if (firstStatus === 'saved') {
            controller.setComment('latest before closing');
            closing = autosave.close();
          } else autosave.retry();
        });
      },
    );
    try {
      controller.setComment('first');
      let finished = false;
      const running = autosave.flush().then(() => {
        finished = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(calls).toHaveLength(2);
      expect(finished).toBe(false);
      release();
      await running;
      await closing;
      await autosave.idle();
      expect(calls).toHaveLength(2);
      expect(calls[1]!.expected).toBe(firstStatus === 'saved' ? 1 : 0);
      expect(calls[1]!.draft.revision).toBe(firstStatus === 'saved' ? 2 : 1);
      expect(calls[1]!.draft.id).toBe(calls[0]!.draft.id);
      expect(calls[1]!.draft.checkpoint.sgf).toContain(
        firstStatus === 'saved' ? 'latest before closing' : 'C[first]',
      );
      expect(autosave.getStatus()).toBe('saved');
    } finally {
      release();
      await autosave.close();
      controller.dispose();
    }
  });

test('rapid board switches preserve every queued draft and reuse each board revision', async () => {
  const workspace = new StudioWorkspace();
  const calls: { draft: StudioDraft; expected: number; resolve(): void }[] = [];
  const autosave = new DraftAutosave(
    workspace.controller,
    () => workspace.active.filename,
    {
      save: (draft, expected) =>
        new Promise<void>((resolve) => calls.push({ draft, expected, resolve })),
    },
    true,
    () => {},
    { ownerKey: () => workspace.active.draftOwner },
  );
  workspace.beforeSwitch(() => {
    void autosave.flush();
  });
  const first = workspace.active.id;
  workspace.controller.setComment('first');
  workspace.add(13);
  workspace.controller.setComment('second');
  workspace.add(9);
  workspace.controller.setComment('third');
  const running = autosave.flush();
  expect(calls).toHaveLength(1);
  calls[0]!.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(calls[1]!.draft.checkpoint.sgf).toContain('second');
  calls[1]!.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(calls[2]!.draft.checkpoint.sgf).toContain('third');
  calls[2]!.resolve();
  await running;
  workspace.select(first);
  workspace.controller.setComment('first revised');
  const revised = autosave.flush();
  expect(calls[3]!.draft.id).toBe(calls[0]!.draft.id);
  expect(calls[3]!.expected).toBe(1);
  calls[3]!.resolve();
  await revised;
  await autosave.close();
  workspace.dispose();
});

test('serial draft saves isolate replaced records and never report an old completion as current', async () => {
  const controller = new RecordController({ size: 5 });
  const calls: { draft: StudioDraft; expected: number; resolve(): void }[] = [];
  const statuses: string[] = [];
  const autosave = new DraftAutosave(
    controller,
    () => 'draft.sgf',
    {
      save(draft, expected) {
        return new Promise<void>((resolve) => calls.push({ draft, expected, resolve }));
      },
    },
    true,
    (value) => statuses.push(value),
  );
  controller.setComment('old');
  const old = autosave.flush();
  expect(calls).toHaveLength(1);
  controller.loadSgf('(;SZ[9]C[new])', { discardChanges: true });
  const newer = autosave.flush();
  expect(calls).toHaveLength(1);
  calls[0]!.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(calls).toHaveLength(2);
  expect(calls[1]!.draft.id).not.toBe(calls[0]!.draft.id);
  expect(calls[1]!.expected).toBe(0);
  expect(autosave.getStatus()).toBe('saving');
  calls[1]!.resolve();
  await Promise.all([old, newer]);
  expect(autosave.getStatus()).toBe('saved');
  expect(controller.getState().dirty).toBe(false);
  await autosave.close();
  expect(calls).toHaveLength(2);
  controller.dispose();
});
test('queued saves advance actual revisions, and disabling prevents queued work or false success', async () => {
  const controller = new RecordController({ size: 5 });
  const calls: { draft: StudioDraft; expected: number; resolve(): void }[] = [];
  const autosave = new DraftAutosave(
    controller,
    () => 'draft.sgf',
    {
      save(draft, expected) {
        return new Promise<void>((resolve) => calls.push({ draft, expected, resolve }));
      },
    },
    true,
    () => {},
  );
  controller.setComment('first');
  const running = autosave.flush();
  controller.setComment('second');
  void autosave.flush();
  calls[0]!.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(calls[1]!.expected).toBe(1);
  expect(calls[1]!.draft.revision).toBe(2);
  expect(calls[1]!.draft.checkpoint.sgf).toContain('C[second]');
  controller.setComment('third');
  void autosave.flush();
  autosave.setEnabled(false);
  calls[1]!.resolve();
  await running;
  expect(calls).toHaveLength(2);
  expect(autosave.getStatus()).toBe('off');
  expect(controller.getState().dirty).toBe(true);
  await autosave.close();
  controller.dispose();
});
test('draft failures are actionable and retry is explicit; unchanged initialization stays ephemeral', async () => {
  const controller = new RecordController({ size: 5 });
  let count = 0;
  const autosave = new DraftAutosave(
    controller,
    () => 'draft.sgf',
    {
      save() {
        count++;
        return count === 1 ? Promise.reject(new DraftError('quota')) : Promise.resolve();
      },
    },
    true,
    () => {},
  );
  await autosave.flush();
  expect(count).toBe(0);
  controller.setComment('unsaved');
  await autosave.flush();
  expect(autosave.getStatus()).toBe('quota');
  await autosave.flush();
  expect(count).toBe(1);
  autosave.retry();
  await autosave.idle();
  expect(autosave.getStatus()).toBe('saved');
  expect(controller.getState().dirty).toBe(true);
  await autosave.close();
  expect(count).toBe(2);
  controller.dispose();
});
