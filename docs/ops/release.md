# Release

Status: local artifact preparation implemented; registry publication and hosted
deployment are not configured or established by a successful preparation.

## Prepare Reviewed Artifacts

Maintainers own source review, compatibility and artifact retention. Start in a
reviewed Banora checkout with `bun run setup` completed. Commit intended changes;
`bun run release prepare` requires an actual clean Git checkout and private
`banora-workspace` root. The five packages must use the same intentional version.
The current development version is `0.1.0-dev.0`; there is no automatic bump.

Preparation runs the root checks and private-file/dependency gates serially, builds
production examples and packages SDK, CLI, React, Vue and Svelte with lifecycle
scripts disabled. It retains the exact tarballs, browser SDK and built examples in
`.artifacts/releases/<full-source-commit>/`. The bounded `banora.release/v1`
manifest records Git commit/tree, actual Bun/Node versions and every file's byte
length/SHA-256. A candidate is not an approved release.

The runner then installs and exercises those retained tarballs in independent
SDK/CLI/framework consumers, serves the retained production examples for the full
browser suite, builds/runs the standalone starter using the retained SDK tarball,
and runs the isolated recovery drill. Only after all nine named gates succeed,
source remains unchanged and retained bytes still match does the manifest become
`prepared`. The starter's source template belongs to the checked source commit;
the starter itself is not a sixth distributed package.

Each check has a ten-minute deadline. Failures return a fixed JSON code and the
last named check on stderr, without copying raw child logs into a report. Rerun
that check locally using its root script, or its script with `--release-bundle DIR`,
to investigate. Do not post raw logs or authored files without reviewing them.
Timeout cleanup targets the child process tree and this runner's browser session.
No target service or user browser is stopped.

## Inspect and Resume

`bun run release verify --bundle DIR` checks a prepared bundle's closed manifest,
complete file inventory, bounds and hashes. It rejects added/removed/changed files
and symbolic links. Verification does not install or execute a supplied bundle.
`--release-bundle` on smoke runners is an explicit executable test input; use only
maintainer-reviewed provenance, even when hashes match. An unsigned manifest can
be replaced together with its files, so integrity is not authentication or proof
that an unknown author ran checks.

Preparing again at the same commit returns an intact prepared bundle with
`reused: true`; it does not repeat checks or claim a fresh dependency audit. A valid
candidate resumes checks against its existing bytes. A partial directory without
a valid manifest or a damaged bundle stops preparation. Preserve it for diagnosis;
do not silently overwrite it. After correcting source, prepare a new commit's
bundle. No byte-identical rebuild across tool/platform versions is promised.

Normal `bun run clean` preserves `.artifacts`. These local copies are not an
off-device backup; maintainers must independently retain reviewed source and
prepared artifacts before a real publication. No automatic pruning deletes the
last recovery copy. Restore procedures are in [rollback](rollback.md).

## Publication Handoff

Before any publication, designate the primary/backup maintainer and a real private
security-report channel; establish registry scope access, credentials outside Git,
public feedback access, licensing/provenance and supported runtime evidence.
Hosted CI and a local green result are different evidence. Stop on failed checks,
authored-data loss, leaked data, mismatched bytes or missing publication authority.
Record approved source, manifest hash, version, destination, operator and recovery
bundle in the release record. Keep prereleases separate from the stable channel.

If a future registry task authorizes publication, publish each reviewed retained
tarball rather than rebuilding it. Publish the SDK before dependent packages,
verify installed names/versions and the expected channel, then exercise independent
consumers. Partial publication stops promotion; preserve successful version records
and fix forward with a new version where necessary. npm accepts tarballs and does
not allow reusing a published name/version, as documented by
[npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/).

A demo host is not selected. Its operator must stage the retained examples and
matching browser SDK, check asset paths and open/edit/export/reopen, then switch its
own deployment pointer only after verification. No command here publishes packages,
uploads files, changes registry tags or migrates user data. Actual remote health,
rollback and access remain prerequisites for a future deployment task.

See [VALIDATION](../../VALIDATION.md), the [operational contract](00-operational-contract.md)
and [ADR 0022](../adr/0022-retained-release-artifacts.md).
