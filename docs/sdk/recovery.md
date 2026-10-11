# Record Recovery

- Status: Portable SDK/terminal checkpoints and Studio local drafts implemented
- Decision: [ADR 0016](../adr/0016-portable-record-recovery.md)

`@banora/sdk/checkpoint` and the root export provide `RecordCheckpoint`,
`RecordCheckpointResult`, immutable `CHECKPOINT_SCHEMA` and
`parseRecordCheckpoint(unknown, limits?)`. The parser returns either diagnostics
or owned immutable data plus the parsed working record, baseline record and
selected node. It validates shape, both SGFs, rules, locator and selected-path
replay without storage access or active-controller mutation.

```ts
import { RecordController } from '@banora/sdk/controller';

const editor = new RecordController({ sgf: '(;SZ[9];B[aa])' });
editor.next();
editor.setComment('Unfinished review');
const saved = JSON.stringify(editor.createCheckpoint());

// The host chooses where, when and whether to retain this document.
const resumed = new RecordController();
const result = resumed.loadCheckpoint(JSON.parse(saved));
if (!result.ok) throw new Error(result.reason);
// Selected move and comment are restored; dirty is still true.
```

A checkpoint has exactly `schemaVersion: "banora.checkpoint/v1"`, `sgf`,
`baselineSgf`, `selection: {gameIndex, path}` and
`rules: {suicide, ko, passStones}`. Locators use child indices, never session IDs.
Unknown fields, versions, invalid policy/SGF and missing selections fail.
The discovery envelope uses default SGF bounds; the controller additionally applies
its own parser limits to both documents. Broader host SGF limits do not expand the
checkpoint envelope. The schema bounds characters; parsers also enforce UTF-8 bytes.
Creating a checkpoint throws `RangeError` if a broader host record exceeds the
portable envelope; it leaves the document and ordinary SGF export available.

Creating a checkpoint changes no state, history or export baseline. Loading one
rejects a dirty replacement with `unsaved-changes` unless the host explicitly sets
`{discardChanges:true}`. Other invalid recovery returns `invalid-checkpoint` and
SGF diagnostics, leaving state, active edit groups and pending tickets intact.
Success clears Undo/Redo/tickets, increments `recordGeneration` and notifies once.
It also adopts the checkpoint's explicit rules, unlike ordinary SGF import which
retains the existing controller policy. Navigation rebuilds rule history from the
selected path; superko is not reduced to a stone-only snapshot.

Dirty is recomputed against the last acknowledged SGF export, not against the last
autosave. Cancelling an export or saving a newer draft never marks it clean. Undo
after recovery applies to new edits only. A browser download still cannot establish
that a file reached disk.

## Terminal Use

Set `includeCheckpoint:true` on a normal record request to receive a `checkpoint`
alongside SGF/snapshot. Store that field through a host script, then pass it as
`checkpoint` on the next `banora run` request. Do not combine checkpoint input with
`sgf`, `size`, `profile` or `selection`; navigate with `goto` after restore instead.
Subsequent operations use the restored baseline and policy. Checkpoints are opt-in
to avoid doubling every response's document payload. JSON requests retain the CLI's
8 MiB total input bound and explicit file-output protections.

## Host Responsibilities

Recovery data contains private authored content and the old baseline, including
material removed from the working record. Keep it out of support logs and share
links. Validate stored/imported data on every restore. Present storage failures
without disabling SGF export, and guard asynchronous completions with current
document/revision checks. Use separate owners or transactions for concurrent tabs.
Provide retention, deletion and explicit user-controlled backup/restore; storage
access, encryption and authorization remain host responsibilities.

## Studio Local Drafts

Studio autosaves interacted-with records and selected locations on this browser
after a 500ms quiet interval. Open **Local drafts** above the board or in its menu
to turn autosave off/on, refresh/select a draft, restore it or confirm deletion.
Restore retains the original and creates a new session copy, so two tabs never
take over each other's writing key. Dirty replacement offers Export / Discard /
Cancel, and recovered edits remain dirty until SGF export.

**Download backup** saves current work as `.banora.json`; **Back up draft** exports
the selected draft without replacing current work, including raw unknown versions
for preservation. **Open backup** validates the wrapper/checkpoint before asking
for replacement approval. Backups include working/original SGF, selection and rules,
not Undo or board images/preferences. JSON inputs/downloads are bounded to 64 MiB
to accommodate escaped content in two default-limit documents.

IndexedDB commits lightweight metadata and payloads atomically, checks revisions
and caps storage at 20 drafts. It never evicts another session to make room. Full,
denied, blocked or failed storage reports retry/delete/backup actions; editing and
SGF export remain usable. Deleting the active draft turns autosave off; changed
revisions require refreshing before deletion. Corrupt entries remain available
for explicit backup/deletion. [ADR 0017](../adr/0017-studio-local-draft-storage.md)
owns schema/time bounds and session ownership.

Autosave is local to this origin/browser and survives ordinary reopen. It provides
no upload, cloud backup or cross-device synchronization. Browser storage can be
cleared/unavailable; abrupt exit can lose a pending debounce/transaction window.
Keep important work in a downloaded file. Physical-device, non-Chromium, abrupt
process-kill and OS/disk-failure durability are unverified.
