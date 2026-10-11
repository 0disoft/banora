# Operational Contract

Status: local SDK/reference-consumer procedures implemented; no hosted service or
published release is established by this contract.

## Ownership and Critical Work

SDK maintainers own package correctness, compatibility, repository verification,
issue triage and release artifacts. The integrating application operator owns its
users, permissions, secrets, storage, retention, deployment and service incidents.
A user's local Studio browser/profile owns its drafts and downloaded files. There
is no SDK account database, background server, on-call team or automatic cloud
backup of browser-authored records. Temporary hosted release artifacts have
separate maintainer-owned retention, as documented in [release](release.md).
This repository is maintained by a solo operator. Release handoff must identify
the primary maintainer and an account/artifact recovery procedure; a second person
is not a prerequisite. Record a backup maintainer or escalation contact only if
one actually exists, without inventing availability or a private contact.

Critical SDK journeys are open/navigate/edit/export/reopen with authored properties
preserved; isolated terminal requests with protected input files; guarded recovery
of working record, export baseline, selection and rules; and optional external
analysis cancellation without blocking local editing. Analysis is an optional
dependency tier: disconnect it and keep record work available during failures.

## Executable Local Procedures

From a reviewed checkout, use `bun run setup`, then `bun run build` before running
operations that import built public SDK artifacts. `bun run doctor` checks tools
and dependencies without editing. `bun run ops --help` discovers bounded recovery
commands. `bun run ops recovery-check --input backup.banora.json` validates a raw
checkpoint or Studio backup by restoring into an isolated controller and comparing
working/baseline SGF, selected location, rules, dirty state and new-session history.
`--input -` accepts piped JSON. `bun run ops drill-recovery` rehearses the same
path, invalid/future input, dirty guards, explicit replacement and new-session Undo
against the committed study fixture. Neither command writes/uploads authored data
or opens browser storage. JSON results exclude content, names, paths and raw errors.

Use [incident response](incident-response.md), [configuration](config-and-env.md),
[secrets](secrets.md), [backup/restore](backup-and-restore.md),
[data migration](data-migrations.md) and
[diagnostics](observability.md) for action-specific procedures. Release and rollback
preparation use [release](release.md) and [rollback](rollback.md): clean-source,
retained-artifact checks and isolated restaging. They do not establish a working
publication channel or a host's deployment pointer. Remaining remote/access gates
are tracked by the [active readiness review](../engineering/12-readiness-review.md).

## Recovery and Release Gates

No service availability SLO, contractual RTO or RPO is claimed for a local SDK.
Studio recovery reaches its last completed IndexedDB transaction; the 500ms quiet
interval is a scheduling delay, not a durability/loss guarantee. Portable recovery
reaches the saved checkpoint's contents, not edits made after it.
Browser storage can be cleared; Undo before recovery is not included in a checkpoint.
Host operators set measured RTO/RPO for their storage and rehearse actual restoration.

Stop a release for authored-data loss, broken export/recovery, leaked private data,
unvalidated or mismatched artifacts, failing relevant checks or missing required
support/security/publication access. A package under development is not a supported
registry release. No local green result proves branch protection, hosted CI, public
feedback access, upload, disk durability or remote rollback. The supported evidence
matrix is in [VALIDATION](../../VALIDATION.md).
