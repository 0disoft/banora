# Incident Response

Status: executable local SDK/reference-consumer response; hosted service response
is the integrating operator's responsibility.

SDK maintainers triage reproducible package defects; a host operator coordinates
deployment, users, credentials and persistent data. Establish named incident/backup
owners and a private contact before distributing a service. This repository
provides no on-call SLA or account-management console.

| Trigger                                                                  | Priority and immediate containment                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Authored-data loss/corruption, privacy leak or host authorization bypass | Stop affected releases/writes/sharing; preserve source/backups privately; host controls incident access |
| Cannot complete import/export/recovery, repeated crashes                 | Keep original input and prior artifact; disable affected feature or revert the host artifact            |
| Analysis/provider failure                                                | Cancel/disconnect provider; local work stays available; no automatic paid/repeated request              |
| Quota/blocked/future draft storage                                       | Preserve current record/backup; follow recovery procedure; do not clear all origin storage              |
| Presentation/performance defect with working export                      | Record operation/code and minimized reproduction; schedule focused fix                                  |

## First Actions

1. Preserve original SGF, downloaded backup and known-good package/static artifact
   under restricted access. Pause edits that reproduce corruption. Studio **Download
   backup** includes work, baseline, rules and selection; SGF export is independent
   of draft storage.
2. Run `bun run doctor` for environment failures. Enable Studio Help diagnostics
   before a controlled reproduction, or run `banora diagnose --request request.json`
   against a privately reviewed request. No auto-upload occurs. See
   [diagnostics](observability.md) for exact privacy/scope and exit codes.
3. Validate a saved backup with `bun run ops recovery-check --input backup.banora.json`.
   It actually restores into an isolated controller and emits fixed checks/outcome.
   Keep corrupt/future originals; no command upgrades or overwrites them.
4. Use **Local drafts**, refresh/select and **Restore draft**/**Open backup**. Export,
   Discard or Cancel protects dirty work. Restore starts a new session copy;
   pre-recovery Undo is unavailable. Inspect the selected position/comments, export
   SGF and reopen before deleting an original. See [recovery](backup-and-restore.md).
5. Choose the relevant test/browser scope in [VALIDATION](../../VALIDATION.md).
   `bun run ops drill-recovery` checks in-memory fixture recovery, not browser,
   filesystem or hosted rollback durability. Keep builds serial, stop on failure
   and never report a fixture as a real outage drill.

## External Failure and Retry

Cancel analysis through its session; dispose/fail transport/provider on EOF,
connection failure or replacement. Late results cannot revive invalidated work.
SDK cancellation does not itself kill a host engine. The local process example
owns deadline/shutdown and bounded framing; hosts implement their own deadlines,
authentication, rate/concurrency limits and termination. Review whether a request
already produced a billable effect before retrying. Diagnostic `retryable` means
an explicit retry may help after state review, never an automatic replay loop.
Repeated failure disables the optional integration until the operator fixes it.

## Communication and Follow-Up

Keep a private timeline of trigger, artifact/versions, containment, backup checks,
remediation and restoration evidence. Public tickets contain reviewed operation
IDs/codes and minimized authored reproduction, never customer files, paths, raw
logs or credentials. Public Issues and
[private vulnerability reporting](https://github.com/0disoft/banora/security/advisories/new)
are enabled; see [secrets](secrets.md). Reporting availability does not establish
notification delivery or an on-call response SLA.

Add a meaningful regression, correct owning API/configuration/operational contracts
and verify the real user journey. Confirm host restoration and credential revocation
separately. Actual [Pages recovery](../engineering/20-draft-demo-backup-execution-evidence.md)
and [portable SDK/CLI recovery](../engineering/26-installed-consumer-recovery-evidence.md)
have executed evidence. They do not certify another application's storage or deployment.
