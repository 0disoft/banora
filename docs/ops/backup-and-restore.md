# Backup and Restore

Status: SDK checkpoints, Studio local drafts and isolated operational recovery
checks implemented; no cloud/disk-durability guarantee.

## What Is Preserved

The [recovery contract](../sdk/recovery.md) owns exact schemas/limits. A portable
checkpoint contains working SGF, acknowledged export baseline, selected game/path
and explicit rules. Studio `.banora.json` wraps it with metadata. Restore recomputes
dirty state and clears prior Undo/Redo/export tickets. Collections and unknown
supported SGF properties remain; selected replay history is rebuilt. Deleted
baseline content is retained and private. Images, preferences, old Undo entries
and provider sessions are excluded.

Autosave writes interacted-with work after 500ms quiet time, serializing writes
and checking revisions. IndexedDB metadata/payload commit together, with 20 drafts
and no silent eviction. It neither marks SGF exported nor replaces another tab's
owner. Recovery reaches the last committed transaction; interrupted debounce,
cleared/closing storage or OS failure may lose later work. Device/browser RTO/RPO
needs actual measurements; a timer is not a service guarantee.

## Preserve, Verify, Restore

1. Use **Local drafts → Download backup** for current work, or select a saved draft
   and **Back up draft**. Save important checkpoints/SGF at task completion and
   before updates/destructive changes in host-controlled storage. A click alone
   does not establish that the OS saved the file.
2. In a built reviewed checkout run
   `bun run ops recovery-check --input backup.banora.json`, or pipe JSON with
   `--input -`. Raw checkpoints and Studio backups are accepted, up to 64 MiB
   UTF-8 JSON; CLI automation separately has an 8 MiB per-input bound. The check
   parses and restores into an isolated controller, compares canonical working/
   baseline documents, selection, rules, dirty state and new-session history.
   It emits no content/filename/path, edits no backup and opens no IndexedDB.
   Exit 0 passes these checks; 2 is usage/read/size/JSON failure, 3 invalid recovery/
   mismatch. It does not authenticate provenance or disk durability.
3. Use Studio **Open backup**, or refresh/select and **Restore draft**. Invalid/future
   schemas and missing selections are rejected; dirty replacement offers Export /
   Discard / Cancel. Preserve originals rather than coercing unknown versions.
4. Inspect restored position/comments/rules and dirty status. Undo applies only to
   new edits. Export/reopen SGF; keep originals until that consumer path succeeds.
   Restore creates a new writing session; another tab retains its separate owner.
5. Explicitly delete obsolete drafts after checking a backup. Changed revisions need
   Refresh before confirmation; active deletion turns autosave off. Settings reset
   removes only owned preferences. Global storage clear and artifact cleanup are
   not draft retention/deletion tools.

For quota/full storage, back up before deleting selected drafts; no other session
is silently evicted. For blocked storage, close other Studio tabs and retry.
Corrupt/future entries remain preservable by backup, and SGF editing/export stays
usable. There is no SDK account deletion; hosts own tenant retention/access/deletion.

## Rehearsal and Limits

`bun run ops drill-recovery` uses the committed study fixture to verify serialization/
restore, future/invalid preservation, dirty guards, explicit replacement and new Undo.
Actual file/stdin tests verify UTF-8, fixed failures and unchanged input bytes.
Existing production browser fixtures separately cover IndexedDB transactions,
quotas/conflicts, backup download/restore, guards and reload. See [VALIDATION](../../VALIDATION.md).

Run this drill on checkpoint/storage contract changes and before release; rehearse
important downloaded files in their target consumer. Host operators own encrypted
off-device schedules, retention, provenance/integrity and restore timing.
Browser/profile loss, abrupt kill, physical disk failure, other browser engines
and remote recovery are not proven by an in-memory fixture.
