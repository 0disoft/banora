# Rollback

Status: verified package restaging and a manual retained-artifact Pages recovery
path implemented. Actual live Pages recovery passed; npm channel rollback
and consuming-host deployment/data recovery remain separate.

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

## Inspect a Retained Demo Artifact

The private `scripts/demo-recovery.ts` tool verifies the retained original Pages
artifact before a separately authorized recovery. It is not an SDK export or
deployment command. Choose a successful original manual main `pages.yml` run
with successful `build` and `deploy` jobs and a successful `Build static examples`
step. Recovered runs skip that step and cannot masquerade as original builds.

```sh
bun scripts/demo-recovery.ts candidate --run-id RUN_ID --artifact-id ARTIFACT_ID \
  --source-commit ORIGINAL_FULL_SHA --archive-digest sha256:REVIEWED_ZIP_SHA256
bun scripts/demo-recovery.ts archive --directory DOWNLOADED_DIRECTORY \
  --sha256 REVIEWED_ARTIFACT_TAR_SHA256
```

The first command queries read-only GitHub metadata and rejects foreign/failed/
expired/mismatched runs or artifacts. Both the archive identity and its reviewed
provider digest must match; no missing artifact implies a usable recovery copy.
Download exactly that artifact ID through the authorized Actions download tool.
Inspect the original `artifact.tar` SHA256 independently before approving recovery.
The second command accepts only a regular, unlinked directory containing exactly
that one regular tar file, bounded to 64 MiB. It checks the full tar bytes against
the independently reviewed hash without extraction, execution, rebuild or writes.
This payload check is required even if the downloader merely warns about a ZIP
digest mismatch. Corruption, extra files and links stop; originals are preserved.
JSON failures contain fixed codes and no provider logs, authored text or paths.
Neither successful inspection switches the live site.
New original runs also retain one `banora-demo-health` receipt. The candidate
validator allows that additional artifact only alongside a successful independent
health job, still requiring exactly one matching `github-pages` artifact.
Unknown, duplicate or incomplete artifact listings stop; older original runs
without the later health job remain eligible under their recorded review scope.

## Recover the Public Demo Without Rebuilding

The manual [Pages workflow](../../.github/workflows/pages.yml) accepts five recovery
inputs: original run ID, immutable artifact ID, original full source commit,
provider ZIP digest and independently reviewed original tar SHA256. Review all
five together before explicitly dispatching. Empty recovery inputs select a new
build; partial inputs stop before deployment. This is a real live-site operation,
not an offline preview. Do not dispatch to test parameter parsing.

```sh
gh workflow run pages.yml --ref main \
  -f recovery_run_id=REVIEWED_RUN_ID \
  -f recovery_artifact_id=REVIEWED_ARTIFACT_ID \
  -f recovery_source_commit=REVIEWED_FULL_SHA \
  -f recovery_archive_digest=sha256:REVIEWED_ZIP_SHA256 \
  -f recovery_tar_sha256=REVIEWED_TAR_SHA256
```

Recovery checks the original successful build/deploy metadata, downloads only
the immutable selected artifact, checks the independently approved tar bytes,
and uploads that unchanged tar to the recovery run. It does not extract, rebuild,
install old dependencies, execute artifact contents, retag npm or alter user
data. Normal and recovery jobs share queued Pages concurrency. Only the existing
`github-pages` deployment job has Pages/OIDC write authority; preparation remains
read-only. The checkout/provenance of the recovery workflow is current main;
the deployed bytes belong to the separately reviewed original source.

New original builds retain their Pages artifacts for 14 days and include public
`banora-build.json` with the build's commit/run ID. Recovery reuploads the exact
original tar, including its original receipt if present; it never replaces that
receipt with the recovery checkout. Older builds may lack the receipt. Verify the
successful deployment and actual live HTML/assets against the selected artifact,
then run the open/navigate/export flow. A green job alone is not live health.
Retention can expire or be deleted; retain an independent reviewed copy. This
manual path refuses unavailable original artifacts rather than silently rebuilding.

The [actual recovery record](../engineering/19-demo-recovery-execution-evidence.md)
includes original/candidate/recovery IDs and hashes, 46 exact live file checks
and a real Studio import/edit/export/reopen. The live site currently serves the
selected original bytes. Recovery uploads do not extend the eligibility of an
expired original candidate; keep original build artifacts and independent copies.

## Restore a Draft Demo Backup Without Original Actions Retention

For new healthy normal deployments, the separate `archive` job creates a
maintainer-only Draft Release with the exact original tar and its manifest. The
two assets do not depend on the original Actions artifact's retention. This is
same-provider storage, editable/deletable by maintainers, without a storage SLA.
Keep the approved manifest hash and an independent local copy separately.

Inspect the archive job's fixed JSON receipt for the release ID, source/run,
tar SHA256 and manifest SHA256. Check the draft and asset metadata independently.
Never publish the draft, overwrite its assets or substitute a hash after failure.
An uncertain capture stops; inspect its recorded created release ID before a
deliberate fresh build. No upload retry or asset cleanup is automatic.

```sh
bun scripts/demo-backup.ts plan --directory ORIGINAL_TAR_DIRECTORY \
  --sha256 REVIEWED_TAR_SHA256 --source-commit ORIGINAL_FULL_SHA --run-id ORIGINAL_RUN_ID
bun scripts/demo-backup.ts restore --release-id REVIEWED_DRAFT_RELEASE_ID \
  --manifest-sha256 REVIEWED_MANIFEST_SHA256
```

Plan is offline. Restore reads only release metadata/assets on the fixed own-repo
GitHub endpoint and verifies independently reviewed hashes, exact sizes, draft
ownership/tag/source and the embedded original build receipt. It writes unchanged
tar bytes exclusively to a new `.artifacts/demo-backups/backup-*` directory after
verification, without extraction, execution or a deployment. Altered/published/
missing/extra/foreign assets stop. Older originals without a build receipt are
not silently converted to this backup format.

To perform an authorized live restore, leave all five legacy Actions recovery
fields empty and supply only the reviewed draft identity and manifest hash:

```sh
gh workflow run pages.yml --ref main \
  -f recovery_backup_release_id=REVIEWED_DRAFT_RELEASE_ID \
  -f recovery_backup_manifest_sha256=REVIEWED_MANIFEST_SHA256
```

The isolated draft-fetch job needs Contents write to access maintainer-only
drafts, but its tool performs only release GET requests. Build/health remain
read-only; recovery does not request the original Actions artifact/run, install
dependencies or rebuild. The existing Pages deployment job deploys the
exact reuploaded tar; independent health checks its original live bytes. The
archive job skips recovery, preventing duplicate backup loops. Mixed or partial
selections stop before deployment. See [ADR 0024](../adr/0024-draft-release-demo-backups.md).
Actual hosted capture/restoration and independent 47-file health passed in the
[draft execution record](../engineering/20-draft-demo-backup-execution-evidence.md).
The original Actions artifact was still retained; this establishes a release-only
recovery route, without claiming observed expiry or provider/account recovery.

## Read-Only Live Demo Health

After deployment or recovery, check the exact selected tar against the public
site. The private commands emit one bounded JSON result without rebuilding,
publishing, extracting tar entries or changing any deployment:

```sh
bun scripts/demo-health.ts fingerprint --archive ORIGINAL_ARTIFACT_TAR
bun scripts/demo-health.ts check --directory DOWNLOADED_DIRECTORY \
  --sha256 REVIEWED_TAR_SHA256 --receipt .artifacts/demo-health-UNIQUE.json
```

Fingerprinting inventories the current Pages USTAR/GNU regular-file format: at
most 64 MiB, 512 files, portable relative paths and a Studio entrypoint. Links,
duplicates, malformed checksums/truncation and unsupported extended tar formats
stop. It never extracts files. The health command first verifies the original
tar hash and regular-file/directory bounds, then checks every public file's size
and SHA256. When the tar predates `banora-build.json`, that endpoint must return
404; a newer receipt must not remain after recovery.

HTTP requests go only to `https://0disoft.github.io/banora/`, without credentials
or redirects, with four concurrent file checks. Each read has a ten-second
deadline within a 120-second overall window. Content/transport failures allow
at most three reads per file with two-second waits; definitive auth/redirect/
size violations stop. No upload/deployment is retried. Receipts retain actual
completed-file and attempt counts with fixed failure codes, not provider messages
or file paths. Receipt creation is exclusive; existing reports remain unchanged.
An interrupted or unwritable report is not successful health evidence. Byte
checks do not execute a browser or certify user-data/device/host recovery.
The Pages workflow now executes this checker after successful deployment using
the exact deployed artifact ID and independently bound tar hash. A failed health
job never initiates another upload, retag, rebuild or automatic rollback.

## Registry and Data Boundaries

### Rehearse Portable Data Across an Installed Downgrade

Before choosing a previous SDK, run this authored-data drill with two independently
reviewed prepared bundles. Each manifest must match its explicit SHA256 and full
source commit; the target version must be older than the current version.

```sh
bun run release consumer-recovery-check \
  --current-bundle CURRENT_BUNDLE --current-manifest-sha256 CURRENT_MANIFEST_SHA256 \
  --current-source-commit CURRENT_FULL_SHA \
  --target-bundle PREVIOUS_BUNDLE --target-manifest-sha256 PREVIOUS_MANIFEST_SHA256 \
  --target-source-commit PREVIOUS_FULL_SHA
```

This private command verifies both complete inventories, exclusively copies their
exact SDK/CLI tarballs into separate `.artifacts/restores/consumer-recovery-*`
consumers, and installs with lifecycle scripts disabled and isolated empty npm
configuration. It checks both installed identities and the CLI's runtime version.
Review the bundles' provenance before running: unsigned hashes do not authenticate
their author, and executing installed packages is not a sandbox for arbitrary code.

An authored two-game collection contains alternate branches, setup stones, move
number overrides, two passes, multilingual comments, a label, an arrow, a freehand
stroke and an unknown property. The actual current SDK creates a dirty checkpoint.
Independent Node SDK/CLI processes pass that produced checkpoint through
current → previous → current, comparing the exact SGF, checkpoint, selected path,
position, rule policy, pass prisoners and dirty export baseline. Each reader also
reopens the exported SGF and restores the clean baseline. Restored Undo/Redo history
starts fresh. Unsupported future schema versions must be rejected without altering
the in-memory controller or saved authored checkpoint.

The original reviewed bundles are verified again after the drill. The successful
JSON receipt contains version/source/archive identities, actual completed stages,
checkpoint/state/probe hashes and explicit limits; it excludes fixture text,
process paths and provider logs. Invalid arguments, mismatched bytes or versions,
install failure and state mismatch stop. Failures preserve originals and exclusive
working copies; no cleanup or install retry runs automatically.

This rehearses Banora's portable record contract. It does not change npm tags,
deploy a host, open or downgrade browser IndexedDB, migrate a host database, or
test disk durability. Fixtures do not certify arbitrary user data, unknown future
formats, different releases or all host integrations. Combine it with fresh
registry target health and the host's actual deployment/storage recovery checks.

### Inspect the Channel Before Mutation

Before selecting a channel rollback, inspect the complete family against a reviewed
prepared bundle and an explicit expected current version:

```sh
bun run release channel-plan --bundle REVIEWED_BUNDLE \
  --manifest-sha256 REVIEWED_MANIFEST_SHA256 --source-commit REVIEWED_SOURCE_SHA \
  --tag dev --expected-current-version CURRENT_VERSION
```

This read-only preflight binds the original source/manifest and local archive
SHA256/SHA512, then reads all five target names, versions, version inventories,
canonical tarball URLs, integrity and selected tags twice. The observations must
agree and the local bundle is verified again afterward. Forward moves, deprecated
targets, stage placeholders, mixed tags, corrupt bytes and provider failures stop
without returning change commands. Equal current/target versions return
`no-change` with empty `changeArgv` arrays. Older common version metadata is not a
reviewed or installed-consumer-tested rollback candidate.

The plan neither authenticates nor invokes `npm dist-tag`, publish, install,
unpublish or migration. Public reads use the existing isolated empty npm-config
runner; only its local temporary config and ordinary npm read cache may be written.
`--execute` is rejected. Run fresh target-byte installed-consumer health separately:

```sh
bun run release registry-target-check --bundle REVIEWED_BUNDLE \
  --manifest-sha256 REVIEWED_MANIFEST_SHA256 --source-commit REVIEWED_SOURCE_SHA \
  --tag dev --expected-current-version CURRENT_VERSION
```

This uses the reviewed target's actual registry downloads and independent installed
SDK/CLI/framework checks while tags remain on the explicit current version.
Source/hash, original/copy inventories and both archive hashes remain bound.
The current family is checked before and after installation; target deprecation
and channel drift stop. It adds no publication or mutation permission. See the
[target-health contract](release.md#check-a-registry-rollback-target-before-moving-tags).

Recheck the entire channel immediately before any authorized mutation. Two reads
are not a compare-and-swap guarantee, distributed lock or transaction. Each npm
package's tag write is independent: stop on an uncertain/partial result and inspect
all five before deciding the next action. Never automatically retry a tag mutation.

For an OIDC tag workflow, npm requires explicit per-package **Allow npm dist-tag**,
independent of direct-publish permission, with npm 11.21.0+ in major 11 or 12.2.0+
in major 12. Existing trusted publisher configurations cannot be edited; changes
require replacing or separately adding a reviewed connection. This tool does not
change any connection or add a write-capable workflow. See
[npm's trusted-publisher/tag contract](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing).
An operator approval, matching workflow/environment and fresh post-change tags /
installed-family health remain required before calling a rollback successful.

For a future authorized npm release, a maintainer may move a channel using
`npm dist-tag add <package>@<reviewed-previous-version> <channel>`, then inspect
the tag and test a fresh install. Tags affect subsequent installs; existing
lockfiles/installations do not automatically roll back. Coordinate the SDK and
adapters' compatible versions. See [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/).
Do not delete published versions as a routine rollback; name/version combinations
cannot be republished, as documented by [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/).
Neither mutation is executed by the local tooling. The preflight above only
produces reviewable arguments for a separately authorized operation.

Banora has no hosted database to roll back. Studio drafts/preferences/checkpoints
are separate versioned data. Preserve unsupported future records instead of
downgrading or deleting them. Validate a portable backup with
`bun run ops recovery-check --input FILE` and use the explicit user recovery flow.
Do not copy a browser profile or overwrite IndexedDB to force an older reader.
Host schema migrations, backups and measured recovery objectives belong to the host;
an artifact restore proves neither their reversibility nor disk durability.

See [release](release.md), [backup/restore](backup-and-restore.md) and
[VALIDATION](../../VALIDATION.md) for the distinct checks and coverage limits.
