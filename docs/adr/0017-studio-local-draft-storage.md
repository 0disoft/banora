# ADR 0017: Studio Local Draft Storage

- Status: Accepted; storage and Studio integration with scoped production-browser evidence

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
not promise completion of writes at abrupt browser/process termination. Closing
recovery cancels its pending restore/backup read: late completions do not parse
backup JSON, replace records or publish messages into a later dialog operation.
A still-current restore whose working state changed retains its explicit stale-record
message. Underlying browser file reads may finish; cancellation gates their results.

Backups include baseline content and must be treated as private documents. Browser
data may be cleared externally and is not a substitute for a user-chosen file copy.
Corrupt/future entries remain inspectable/deletable; no migration fabricates missing
fields or silently discards content. Unsupported IndexedDB database versions fail.

## Current Evidence

Metadata bounds and storage-unavailable behavior have headless tests. Serialized
save fixtures cover new owners, latest feedback, queued revisions, disable/dispose
and explicit retry. Production Chrome checks real IndexedDB, page close/reopen,
dirty baseline/selected branch, new-session Undo, simultaneous tabs, quota rollback,
capacity/retry, stale deletion, corrupt/future entries and actual backup/SGF files.
English/Korean/Chinese/Japanese and 320px controls have scoped browser evidence.

Autosave defaults on after interaction and debounces changes for 500ms. Untouched
samples stay ephemeral. Visibility loss/disposal capture changes best-effort;
abrupt termination can lose a pending write. Restore creates a copy and retains
the original draft. Undo/presentation settings are not stored in draft payloads.
[ADR 0018](0018-versioned-studio-preferences.md) owns separate versioned preferences,
including autosave consent and safe legacy migration. Routine save status is
quiet for assistive technology; failures use a polite live announcement.

Delete requires confirm/cancel. Selection changes and both starting/applying a
list refresh reset the pending deletion and its prompt. A refreshed entry or
revision requires a new confirmation, including when another tab removed the
previous selection while listing was pending.
Deleting the active draft turns autosave off;
a deletion waiting for autosave completion is cancelled if recovery closes or is
disposed before removal is submitted. Autosave remains off until explicitly enabled.
Already-submitted storage transactions may still commit; closing is not a rollback.
Pending commits can require refreshing the draft revision. Current/selected drafts can
be backed up without changing the export baseline. Unknown versions can be saved
raw for preservation, but cannot replace the working record. Local storage is
origin-specific, unencrypted and provides no cross-device service.
