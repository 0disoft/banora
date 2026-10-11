# Rollback

Status: verified artifact restaging implemented; no live deployment or registry
rollback command is configured.

## Decision and Local Procedure

Stop promotion on broken open/edit/export/recovery, private-data exposure, failed
health checks or artifact mismatch. Preserve current source, failed artifacts and
the user's backup before trying another version. The SDK maintainer owns package
diagnosis; the host operator owns deployment, access and user-data recovery.
Do not restore a known vulnerable version simply because its functional checks pass.

The manual publication workflow's separate read-only `health` job executes fresh
registry-byte verification and independent SDK/CLI/framework consumers after an
explicit successful upload. If it fails, packages may already be published;
preserve both publication and health receipts, inspect exact registry versions/
integrity/channels, and stop further promotion. A failed health job does not
automatically unpublish or change tags. Use the independently authorized registry/
host procedure below; repeat read-only `release registry-check` only with the
reviewed source/hash/channel and corresponding check dependencies available.

1. Select a previously prepared, maintainer-reviewed bundle from retained storage.
   Confirm its recorded source/tree, tools and intended version. Hashes alone do
   not authenticate it. If none exists, stop and prepare a forward fix.
2. Run `bun run release verify --bundle DIR`. Failure leaves originals unchanged;
   recover the reviewed copy from independent storage rather than modifying its
   manifest to match damaged files.
3. Run `bun run release restore --bundle DIR`. This copies verified files exclusively
   into a new `.artifacts/restores/<commit-prefix>-<unique-id>/` directory. It
   verifies both source and destination after copying and returns the restaged path.
   It neither replaces an existing bundle nor switches an application's version.
4. Verify the returned directory. Run relevant installed-consumer scripts with
   `--release-bundle DIR` against its exact bytes. Compatibility with the current
   starter/template or host must be checked explicitly when restoring older SDKs.
5. A separately authorized host task may switch its deployment/package selection
   to the reviewed copy after staging and health checks. Record the selected source,
   target, operator and result. Rehearse against an actual prior version before
   claiming a working remote rollback.

Candidate manifests cannot be restored. Corrupt/future/extra-file/linked bundles
are rejected. Interrupted copying may leave an incomplete restaging directory;
it is not a deployment and must not be promoted. Original files remain available.
No active pointer is invented to substitute for a real host rollback.

## Registry and Data Boundaries

For a future authorized npm release, a maintainer may move a channel using
`npm dist-tag add <package>@<reviewed-previous-version> <channel>`, then inspect
the tag and test a fresh install. Tags affect subsequent installs; existing
lockfiles/installations do not automatically roll back. Coordinate the SDK and
adapters' compatible versions. See [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/).
Do not delete published versions as a routine rollback; name/version combinations
cannot be republished, as documented by [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/).
Neither operation is executed by the local tooling.

Banora has no hosted database to roll back. Studio drafts/preferences/checkpoints
are separate versioned data. Preserve unsupported future records instead of
downgrading or deleting them. Validate a portable backup with
`bun run ops recovery-check --input FILE` and use the explicit user recovery flow.
Do not copy a browser profile or overwrite IndexedDB to force an older reader.
Host schema migrations, backups and measured recovery objectives belong to the host;
an artifact restore proves neither their reversibility nor disk durability.

See [release](release.md), [backup/restore](backup-and-restore.md) and
[VALIDATION](../../VALIDATION.md) for the distinct checks and coverage limits.
