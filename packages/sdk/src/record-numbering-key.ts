import type { SgfRecord } from './sgf.js';

// Keys contain no record/node/history references. Only validated C-only commits
// inherit a key; every other immutable record starts a separate numbering epoch.
const keys = new WeakMap<SgfRecord, object>();
export function recordNumberingKey(record: SgfRecord): object {
  let key = keys.get(record);
  if (!key) {
    key = Object.freeze({});
    keys.set(record, key);
  }
  return key;
}

export function inheritCommentNumbering(before: SgfRecord, after: SgfRecord): void {
  keys.set(after, recordNumberingKey(before));
}
