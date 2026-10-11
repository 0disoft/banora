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
