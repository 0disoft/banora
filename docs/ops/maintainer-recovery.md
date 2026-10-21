# Maintainer Source and Account Recovery

Status: commands implemented; [actual source/tag and artifact restoration](../engineering/29-offline-maintainer-recovery-evidence.md)
passed. Provider account recovery and off-device durability remain unverified.

## Owner and Retention

The primary maintainer is `0disoft`, owner of
[0disoft/banora](https://github.com/0disoft/banora) and the five published packages.
This is a solo-maintainer project. No backup person, private contact or support
SLA is invented.

Retain every supported release's complete prepared archive and original manifest.
Public release assets and draft demo backups outlive their Actions artifacts, but
remain editable/deletable on the same GitHub account. Actions artifacts last 14
days and must not be the sole recovery copy. Keep independently reviewed source
and artifact copies outside that provider. Normal `clean` preserves `.artifacts`;
it is not a retention service. Prune only after reviewing support status and a
successful newer restore; do not automatically delete the last known-good copy.

Source backups include tracked history and refs/tags. They exclude working edits,
untracked/ignored files, `.git/config`, hooks, credentials, dependencies, browser
profiles and IndexedDB drafts. Tracked history is preserved rather than redacted;
review it before sharing. Same-device storage does not protect against device loss.

## Capture and Rehearse Without Provider Access

From a reviewed clean, complete checkout:

```sh
bun run release source-backup
bun run release source-recovery-check --backup BACKUP_DIRECTORY \
  --manifest-sha256 INDEPENDENTLY_REVIEWED_HASH --source-commit REVIEWED_FULL_SHA
```

Capture exclusively writes `source.bundle` and a closed manifest under
`.artifacts/releases/source-*`. JSON identifies the source/tree, bundle hash/size,
ref count/hash and manifest hash. Dirty/shallow sources stop; source and refs must
remain unchanged during capture. This uses [Git's offline bundle contract](https://git-scm.com/docs/git-bundle).
Capture alone is not a successful restore.
It captures locally available refs, not unseen provider refs. While provider access
is healthy, inspect the intended release tag and deliberately fetch it with
`git fetch origin refs/tags/REVIEWED_TAG:refs/tags/REVIEWED_TAG`; verify its commit
without forcing/replacing a conflicting local tag before capturing. This network
step is separate from offline capture/recovery.

Retain the reviewed hash and source separately. Restore accepts exactly those two
regular files, verifies their bytes/schema/identity and creates an exclusive local
mirror and detached checkout under `.artifacts/restores/source-*`. Git permits
only file protocols, uses an empty global configuration, disables system config/
hooks and remote lazy fetching. The actual mirror must pass full strict object
checking, bundle verification and exact ref/tree matching. The checkout must be
clean at the reviewed commit; originals are verified again. Its receipt records
actual completed stages, without remote URLs, credential settings or raw logs.
Extra/linked/changed inputs stop without replacing the active checkout or deleting
evidence.

Separately verify/restage the independently retained prepared release using
`release verify` and `release restore` from [rollback](rollback.md). Source recovery
installs no dependencies and executes no recovered code. Frozen setup/build still
need the declared tools and dependencies; a Git bundle is not an npm dependency
archive or evidence of a fully offline new-machine build.

Copy both source-backup files and the complete prepared release archive/manifest
to owner-controlled independent storage. Verify copied bytes and rehearse from
that directory. The repository does not provision the owner's off-device storage
or inspect secret stores.

## Privacy-Safe Failure Stages

After a source backup/recovery operation starts, the private release command's
existing `banora.release-command/v1` error object additionally includes `stage`:

```json
{"schemaVersion":"banora.release-command/v1","ok":false,"error":{"code":"check","stage":"recovery-objects"}}
```

Existing error codes and exit status 1 remain unchanged. Invalid arguments still
return `usage` without a stage because no operation has started. The fixed stage
identifies the active phase, not successful completion or a promise of recoverable
partial output. Abrupt process termination cannot guarantee a JSON response.

| Stage                            | Active work                                                    |
| -------------------------------- | -------------------------------------------------------------- |
| `backup-workspace`               | Check workspace identity                                       |
| `backup-setup`                   | Create exclusive scratch and isolated Git configuration        |
| `backup-source`                  | Check initial cleanliness, complete history, identity and refs |
| `backup-bundle`                  | Create and hash the source bundle                              |
| `backup-final-source`            | Recheck cleanliness, HEAD and refs after capture               |
| `backup-manifest`                | Exclusively write the success manifest                         |
| `recovery-workspace`             | Check workspace identity                                       |
| `recovery-input`                 | Verify the independently reviewed input files and identity     |
| `recovery-setup`                 | Create exclusive restore staging and isolated configuration    |
| `recovery-mirror`                | Clone the bundle into the offline mirror                       |
| `recovery-objects`               | Run full strict object checking                                |
| `recovery-bundle`                | Verify the bundle against the mirror                           |
| `recovery-identity`              | Match exact mirror refs and tree                               |
| `recovery-checkout`              | Materialize the reviewed detached checkout                     |
| `recovery-checkout-verification` | Check checkout identity, cleanliness and tracked count         |
| `recovery-original`              | Verify original input bytes and schema again                   |
| `recovery-receipt`               | Exclusively write the success receipt                          |

Git subprocess failures additionally include a fixed `reason`, retaining `check`
and the active stage:

| Reason        | Meaning                                                           |
| ------------- | ----------------------------------------------------------------- |
| `unavailable` | The operating system returned `ENOENT` when starting Git          |
| `timeout`     | The subprocess returned `ETIMEDOUT`                               |
| `exit`        | Git returned a positive nonzero exit status without a spawn error |
| `failed`      | Any other subprocess error, signal termination or missing status  |

For example, unavailable Git returns
`{"code":"check","stage":"backup-source","reason":"unavailable"}`.
These categories describe observed process results, not a complete root-cause
diagnosis: `ENOENT` can also mean a missing working directory. Unknown error codes
are never echoed. Filesystem, input-validation and argument errors omit `reason`.
No duration, exit number, signal name or operating-system error text is exposed.
The existing 60-second per-Git deadline and output limit remain unchanged.

Stages come only from these fixed implementation labels. JSON errors exclude
source/backup paths, command arguments, remote URLs, Git stdout/stderr, underlying
exception messages, causes and stack traces. Unknown filesystem/runtime exceptions
map to the existing `io` code; known release errors retain their codes. Originals,
partial staging and receipts follow the same preservation rules as before. No
extra Git command, log file, retry, cleanup or remote request is introduced.

## Lost Authentication or Compromised Access

Source/artifact recovery is separate from reclaiming a provider account. Stop
promotion, preserve reviewed copies and use provider recovery UIs privately.
Never submit passwords, recovery codes or security-key responses through Issues,
diagnostics or an agent chat.

- GitHub: follow its [account recovery procedure](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/recovering-your-account-if-you-lose-your-2fa-credentials).
  GitHub cannot restore a 2FA account when all recovery methods are lost. Establish
  redundant methods privately using [official configuration guidance](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication-recovery-methods).
- npm: follow its [2FA recovery procedure](https://docs.npmjs.com/recovering-your-2fa-enabled-account/).
  Recovery-code login starts a 72-hour security hold; publication and package
  setting changes are unavailable while read/install access remains available.
  Do not bypass the hold with a new token or publisher.
- Compromise: the actual credential owner revokes affected credentials, audits
  provider/package/environment access and re-establishes reviewed publishing
  authority. Follow [secret response](secrets.md#suspected-exposure). Restoring
  source does not revoke a credential.

Successful security-key authentication/OIDC publication does not prove privately
retained recovery codes or a redundant factor. Those and actual account recovery
remain unverified; do not inspect or copy them to close an SDK readiness row.
Source restoration changes no provider permissions, npm tags, live host or user
storage schema.
