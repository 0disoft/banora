import { expect, test } from 'bun:test';
import { RecordController } from '@0disoft/banora/controller';
import { DraftAutosave } from '../examples/studio/draft-session.js';
import { DraftError } from '../examples/studio/draft-store.js';
import type { StudioDraft } from '../examples/studio/draft-store.js';

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
