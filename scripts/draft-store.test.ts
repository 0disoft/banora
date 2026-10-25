import { expect, test } from 'bun:test';
import { DraftStore, isDraftEntry, safeDraftFilename } from '../examples/studio/draft-store.js';

test('draft metadata rejects unknown versions, unsafe names, invalid revisions and timestamps', () => {
  const entry = {
    schemaVersion: 'banora.studio-draft/v1',
    id: 'page-1',
    filename: '한국어.sgf',
    updatedAt: 0,
    revision: 1,
  };
  expect(isDraftEntry(entry)).toBe(true);
  for (const changes of [
    { schemaVersion: 'future' },
    { id: '../file' },
    { filename: '../a.sgf' },
    { filename: 'a\n.sgf' },
    { filename: '' },
    { filename: 'x'.repeat(101) },
    { updatedAt: -1 },
    { updatedAt: Infinity },
    { updatedAt: Number.MAX_SAFE_INTEGER },
    { revision: 0 },
    { revision: 1.5 },
  ])
    expect(isDraftEntry({ ...entry, ...changes })).toBe(false);
  expect(safeDraftFilename('')).toBe('untitled.sgf');
  expect(safeDraftFilename('C:\\private\nfile.sgf')).toBe('C--private-file.sgf');
});
test('unavailable draft storage rejects without browser access or data output', async () => {
  const store = new DraftStore(undefined);
  await expect(store.list()).rejects.toMatchObject({ code: 'unavailable' });
  store.close();
  await expect(store.get('page-1')).rejects.toMatchObject({ code: 'unavailable' });
});

test('forced connection closure permits an explicit reopen without stale events evicting it', async () => {
  const payload = { checkpoint: 'retained fixture' };
  const connections: { close(): void; onclose?: () => void; onversionchange?: () => void }[] = [];
  const factory = {
    open() {
      let closed = false;
      const db = {
        close() {
          closed = true;
        },
        onclose: undefined as (() => void) | undefined,
        onversionchange: undefined as (() => void) | undefined,
        transaction() {
          if (closed) throw new DOMException('Closed fixture connection', 'InvalidStateError');
          const transaction = {
            oncomplete: undefined as (() => void) | undefined,
            objectStore() {
              return {
                get() {
                  const request = {
                    result: payload,
                    onsuccess: undefined as (() => void) | undefined,
                  };
                  queueMicrotask(() => {
                    request.onsuccess?.();
                    transaction.oncomplete?.();
                  });
                  return request;
                },
              };
            },
          };
          return transaction;
        },
      };
      connections.push(db);
      const request = { result: db, onsuccess: undefined as (() => void) | undefined };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  } as unknown as IDBFactory;
  const store = new DraftStore(factory);
  try {
    expect(await store.get('retained')).toEqual(payload);
    expect(connections).toHaveLength(1);
    const first = connections[0]!;
    first.close();
    first.onclose?.();
    expect(connections).toHaveLength(1); // No automatic reopen or replayed operation.
    expect(await store.get('retained')).toEqual(payload);
    expect(connections).toHaveLength(2);
    first.onclose?.();
    expect(await store.get('retained')).toEqual(payload);
    expect(connections).toHaveLength(2);
    connections[1]!.onversionchange?.();
    expect(await store.get('retained')).toEqual(payload);
    expect(connections).toHaveLength(3);
  } finally {
    store.close();
  }
  await expect(store.get('retained')).rejects.toMatchObject({ code: 'unavailable' });
  expect(connections).toHaveLength(3);
});
