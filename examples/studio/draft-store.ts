import type { RecordCheckpoint } from '@0disoft/banora/checkpoint';

export const DRAFT_DATABASE = 'banora.studio.drafts';
export const DRAFT_LIMIT = 20;
export const DRAFT_BACKUP_BYTES = 64 * 1024 * 1024;
export interface DraftEntry {
  readonly schemaVersion: 'banora.studio-draft/v1';
  readonly id: string;
  readonly filename: string;
  readonly updatedAt: number;
  readonly revision: number;
}
export interface StudioDraft extends DraftEntry {
  readonly checkpoint: RecordCheckpoint;
}
export type DraftErrorCode =
  | 'unavailable'
  | 'blocked'
  | 'quota'
  | 'full'
  | 'conflict'
  | 'invalid'
  | 'timeout'
  | 'failed';
export class DraftError extends Error {
  constructor(readonly code: DraftErrorCode) {
    super(`Draft storage: ${code}.`);
  }
}
export function safeDraftFilename(input: string): string {
  // oxlint-disable-next-line eslint/no-control-regex -- Remove unsafe filename/control characters from authored names.
  return input.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '-').slice(0, 100) || 'untitled.sgf';
}
export function isDraftEntry(input: unknown): input is DraftEntry {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const data = input as Record<string, unknown>;
  return (
    data.schemaVersion === 'banora.studio-draft/v1' &&
    typeof data.id === 'string' &&
    /^[\w-]{1,80}$/.test(data.id) &&
    typeof data.filename === 'string' &&
    data.filename.length > 0 &&
    data.filename.length <= 100 &&
    safeDraftFilename(data.filename) === data.filename &&
    Number.isSafeInteger(data.updatedAt) &&
    (data.updatedAt as number) >= 0 &&
    (data.updatedAt as number) <= 8_640_000_000_000_000 &&
    Number.isSafeInteger(data.revision) &&
    (data.revision as number) >= 1
  );
}
function storageError(error: unknown): DraftError {
  if (error instanceof DraftError) return error;
  const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
  return new DraftError(
    name === 'QuotaExceededError' ? 'quota' : name === 'SecurityError' ? 'unavailable' : 'failed',
  );
}
function guarded(fail: (error: DraftError) => void, action: () => void): () => void {
  return () => {
    try {
      action();
    } catch (error) {
      fail(storageError(error));
    }
  };
}
export interface DraftListing {
  readonly entries: readonly { id: string; entry: DraftEntry | null }[];
  readonly total: number;
}

/** Studio-owned local storage. Two stores keep listings independent of SGF payload size. */
export class DraftStore {
  #opening: Promise<IDBDatabase> | undefined;
  #closed = false;
  constructor(private readonly factory: IDBFactory | undefined = globalThis.indexedDB) {}
  #open(): Promise<IDBDatabase> {
    if (this.#closed || !this.factory) return Promise.reject(new DraftError('unavailable'));
    return (this.#opening ??= new Promise<IDBDatabase>((resolve, reject) => {
      let settled = false;
      const request = this.factory!.open(DRAFT_DATABASE, 1);
      const timer = setTimeout(() => fail(new DraftError('timeout')), 5000);
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(storageError(error));
      };
      request.onupgradeneeded = () => {
        if (settled || this.#closed) {
          request.transaction?.abort();
          return;
        }
        request.result.createObjectStore('entries', { keyPath: 'id' });
        request.result.createObjectStore('drafts', { keyPath: 'id' });
      };
      request.onblocked = () => fail(new DraftError('blocked'));
      request.onerror = () => fail(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (settled || this.#closed) {
          db.close();
          fail(new DraftError('unavailable'));
          return;
        }
        settled = true;
        clearTimeout(timer);
        const opening = this.#opening;
        const forget = () => {
          if (this.#opening === opening) this.#opening = undefined;
        };
        db.onclose = forget;
        db.onversionchange = () => {
          db.close();
          forget();
        };
        resolve(db);
      };
    }).catch((error) => {
      this.#opening = undefined;
      throw storageError(error);
    }));
  }
  async #transaction<T>(
    mode: IDBTransactionMode,
    action: (
      transaction: IDBTransaction,
      result: (value: T) => void,
      fail: (error: DraftError) => void,
    ) => void,
  ): Promise<T> {
    const db = await this.#open();
    if (this.#closed) throw new DraftError('unavailable');
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(['entries', 'drafts'], mode);
      let value: T;
      let failure: DraftError | undefined;
      const timer = setTimeout(() => {
        failure = new DraftError('timeout');
        transaction.abort();
      }, 10_000);
      transaction.oncomplete = () => {
        clearTimeout(timer);
        resolve(value);
      };
      transaction.onabort = () => {
        clearTimeout(timer);
        reject(failure ?? storageError(transaction.error));
      };
      transaction.onerror = (event) => {
        failure ??= storageError((event.target as IDBRequest).error ?? transaction.error);
      };
      try {
        action(
          transaction,
          (result) => {
            value = result;
          },
          (error) => {
            failure = error;
            transaction.abort();
          },
        );
      } catch (error) {
        failure = storageError(error);
        transaction.abort();
      }
    }).catch((error) => {
      throw storageError(error);
    });
  }
  list(): Promise<DraftListing> {
    return this.#transaction('readonly', (transaction, result) => {
      const store = transaction.objectStore('entries');
      const values = store.getAll(undefined, DRAFT_LIMIT + 1),
        keys = store.getAllKeys(undefined, DRAFT_LIMIT + 1),
        count = store.count();
      count.onsuccess = () =>
        result({
          total: count.result,
          entries: keys.result.flatMap((key, index) =>
            typeof key === 'string'
              ? [
                  {
                    id: key,
                    entry: isDraftEntry(values.result[index])
                      ? (values.result[index] as DraftEntry)
                      : null,
                  },
                ]
              : [],
          ),
        });
    });
  }
  get(id: string): Promise<unknown> {
    return this.#transaction('readonly', (transaction, result) => {
      const request = transaction.objectStore('drafts').get(id);
      request.onsuccess = () => result(request.result);
    });
  }
  /** Compare revisions inside the same serialized read/write transaction. */
  save(draft: StudioDraft, expectedRevision: number): Promise<void> {
    if (
      !isDraftEntry(draft) ||
      draft.revision !== expectedRevision + 1 ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0
    )
      return Promise.reject(new DraftError('invalid'));
    return this.#transaction('readwrite', (transaction, result, fail) => {
      const entries = transaction.objectStore('entries');
      const existing = entries.get(draft.id);
      existing.onsuccess = guarded(fail, () => {
        if (
          expectedRevision === 0
            ? existing.result !== undefined
            : !isDraftEntry(existing.result) || existing.result.revision !== expectedRevision
        ) {
          fail(new DraftError('conflict'));
          return;
        }
        const count = entries.count();
        count.onsuccess = guarded(fail, () => {
          if (expectedRevision === 0 && count.result >= DRAFT_LIMIT) {
            fail(new DraftError('full'));
            return;
          }
          const { checkpoint: _checkpoint, ...entry } = draft;
          entries.put(entry);
          transaction.objectStore('drafts').put(draft);
          result(undefined);
        });
      });
    });
  }
  /** A changed draft requires refreshing the list before explicit deletion. */
  remove(id: string, expectedRevision: number | null): Promise<void> {
    return this.#transaction('readwrite', (transaction, result, fail) => {
      const request = transaction.objectStore('entries').get(id);
      request.onsuccess = guarded(fail, () => {
        const entry = request.result;
        if (
          entry !== undefined &&
          (isDraftEntry(entry) ? entry.revision !== expectedRevision : expectedRevision !== null)
        ) {
          fail(new DraftError('conflict'));
          return;
        }
        transaction.objectStore('entries').delete(id);
        transaction.objectStore('drafts').delete(id);
        result(undefined);
      });
    });
  }
  close(): void {
    this.#closed = true;
    void this.#opening?.then(
      (db) => db.close(),
      () => {},
    );
  }
}
