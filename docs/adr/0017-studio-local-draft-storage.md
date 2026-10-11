# ADR 0017: Studio Local Draft Storage

- Status: Accepted; storage implementation, consumer integration/browser evidence pending

## Decision

Studio owns a version-1 IndexedDB database with working checkpoint payloads and
separate lightweight draft metadata. This avoids synchronous localStorage writes
and its typical size limits, and lets listing operate without cloning every SGF.
The SDK still owns no storage. No remote transmission or storage library is added.

Each page/session and record replacement gets a fresh owner ID. Explicit recovery
copies a stored checkpoint into the active session rather than taking over another
tab's draft. Revisions are compared within serialized read/write transactions;
stale writes/deletions fail with a conflict. Payload and metadata commits/deletions
share the same transaction. A save acknowledges only local storage, never SGF export.

Keep at most 20 drafts. Do not automatically expire or evict another tab's unsaved
document; a full/quota-denied store exposes deletion/backup/export actions instead.
Existing drafts can still update at the cap. Database open is bounded to 5 seconds
and transactions to 10 seconds; blocked/future-version/quota/unavailable failures
remain explicit. Do not delete or recreate a failed database implicitly.

## Consumer Requirements

Provide visible local-draft autosave control/status, explicit selection and guarded
restore, portable backup import/download and revision-checked deletion. Validate
stored checkpoints on restoration. Debounce writes, serialize a session's saves,
gate feedback by document revision and release pending UI work on disposal. Do
not promise completion of writes at abrupt browser/process termination.

Backups include baseline content and must be treated as private documents. Browser
data may be cleared externally and is not a substitute for a user-chosen file copy.
Corrupt/future entries remain inspectable/deletable; no migration fabricates missing
fields or silently discards content. Unsupported IndexedDB database versions fail.

## Current Evidence

Metadata bounds and storage-unavailable behavior have headless tests. Actual
IndexedDB atomicity, simultaneous pages, quota failures, interruption/recovery and
the mounted Studio workflow still require production-browser evidence in the next
consumer increment. This decision does not yet claim a shipped autosave UI.
