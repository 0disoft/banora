# Saved Data and Migration Procedure

Status: supported legacy-preference migration and current-format recovery checks
implemented; no hosted database or automatic unknown-version migration exists.

## Formats and Owners

| Data                | Current format                | Compatibility action                                                     |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| SGF                 | Go FF4 / UTF-8 export         | Preserve supported/unknown properties; reject unsupported encodings      |
| Portable checkpoint | `banora.checkpoint/v1`        | Validate/replay working and baseline SGF, rules and selected path        |
| Studio draft backup | `banora.studio-draft/v1`      | Validate wrapper and checkpoint before explicit guarded restoration      |
| IndexedDB drafts    | Database version 1            | Create entries/drafts stores; transactional writes and revision checks   |
| Scalar preferences  | `banora.studio-preference/v1` | Migrate only three validated legacy keys; preserve future/invalid values |
| Automation requests | `banora.automation/v1`        | Reject unknown versions/fields before executing isolated operations      |

Maintainers own these readers/writers and regression evidence. Hosts own their
database/schema migrations, backups, authorization and concurrent document versions.
Package SemVer, wire schema versions and browser database versions are distinct;
a package update does not silently authorize changing saved data.

## Before Updating or Recovering

Export owned SGF and a portable Studio backup before replacing a reader or a live
document. Keep the original file separately; use `bun run ops recovery-check --input FILE`
after setup/build to restore and compare in an isolated controller without writing
the source. Record the reader/source version and actual result. Future/corrupt
checkpoint or wrapper versions are preserved/rejected, never coerced by editing
the version label. Unknown IndexedDB versions are not deleted to force a downgrade.

Run `bun run migration-check` for the supported local migration/recovery matrix.
It rebuilds public SDK artifacts and executes checkpoint, preference, draft metadata
and operations regressions. These include invalid/future formats, retained source,
dirty replacement guards, baseline/selection/rules, cleared old history and real
serialized public-controller restoration. Tests use disposable controllers and
authored/in-memory stores, not a live user profile.

## Interrupted Preference Migration

Language, board display size and autosave legacy values are validated separately.
Publish each valid versioned field before removing its legacy key. A denied write
keeps that legacy source; reopening retries the remaining field without reverting
already published fields or unrelated data. If cleanup is interrupted after a new
write, the validated new envelope is authoritative and reopening retries cleanup.
Repeated reads are idempotent. A future envelope blocks fallback to a legacy value
and prevents ordinary writes from overwriting the preserved future data.

The focused checks inject interruption at a field write and legacy removal, reopen
the actual preference store, and verify every retained/migrated field and unrelated
document. This is restart logic evidence, not an OS power-loss/disk durability test.
Unavailable storage leaves session settings usable and unreadable autosave disabled;
explicit user reset is distinct from migration and does not delete authored drafts.

## Failure and Future Changes

On a failure, preserve the original and current work. Cancel replacement; repair
or use a compatible newer reader in isolation. Use forward fixes when no compatible
reader exists, and validate the recovered result before explicit replacement. Never
automatically downgrade saved data just to run an older package. Artifact restaging
in [rollback](rollback.md) does not migrate data or prove reader compatibility.

A future schema change must name source/target versions, invalid/future handling,
transaction/cancellation boundaries, resume strategy and recovery copy before
shipping. Add committed authored old/current/unsupported cases and actual round-trip
or migration execution, then update the owning public contract/ADR and this runner.
There is no hypothetical v2 converter or fake database job in this implementation.
Physical browser failures and actual database upgrade blocking require the separate
production browser recovery scenarios; headless metadata tests do not replace them.
