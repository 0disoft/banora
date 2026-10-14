# Release

Status: five `0.1.2` packages published on `latest` through protected GitHub OIDC,
with fresh registry-download/installed-consumer health and retained public
release recovery passed. Public source, GitHub Pages and private
vulnerability reporting are configured. Support remains scoped to executed evidence.

## Initial Default-Channel Release

The compatible `0.1.2` notice/failure localization patch passed hosted preparation
`38507482467`, protected publication and fresh installed-consumer health
`38507979327`. Its public `v0.1.2` release retains all reviewed archives and
receipts; independently downloaded assets and the 572-file recovered bundle match.
See the [execution record](../engineering/32-notice-localization-release.md).

The follow-up `0.1.1` is now published, covering the refreshed Studio,
variation/assessment additions and twelve-language catalogs. Its
[change and validation record](../engineering/31-studio-localization-release.md)
records successful hosted preparation, publication, independent registry health,
public release recovery and live deployment. Vue/Svelte propagation exceeded the
bounded confirmation window; each published archive was independently downloaded
and verified before resuming, with all five reused without upload in the final
successful [publication/health attempt](https://github.com/0disoft/banora/actions/runs/38435071736/attempts/3).
The initial-release executions below remain historical evidence for `0.1.0`.

Source versions intentionally advanced together to `0.1.0`, published on `latest`
through [run 38278289086](https://github.com/0disoft/banora/actions/runs/38278289086).
All five fresh registry archives passed independent installed-consumer checks.
This is the initial public 0.1 line
within the executed compatibility matrix, under [ADR 0025](../adr/0025-initial-default-channel-release.md).
Adapters/CLI accept compatible SDK patches through `>=0.1.0-dev.0 <0.2.0`;
framework/tool major ranges are unchanged. No SDK runtime or saved-data format
changes accompany this release. Future incompatible 0.x minors require migration
notes, updated peers and installed-consumer evidence.

Preparation `38277714049` passed nine gates and retained 149 files. The reviewed
source is `8ce352615329c2b773e36ec281d4e2c732a2d408`; manifest SHA256 is
`afe2c00d0b4d15394ac0b14d7ff762252d521aa77acd111bd3b38cd3a74f66ad`.
Actual unqualified npm installation selected all five `0.1.0` versions and executed
the SDK/CLI; default npm README data matched the reviewed instructions.
`dev` remains `0.1.0-dev.1`. See the [execution record](../engineering/27-initial-default-channel-release-evidence.md).
No tag-only mutation, new publisher connection, unpublish, support SLA or
automatic host update is implied.

The public [v0.1.0 release](https://github.com/0disoft/banora/releases/tag/v0.1.0)
retains the complete prepared archive and original manifest beyond Actions retention.
The actual tag resolves to the reviewed source. Both uploaded assets were downloaded
again, checked against independently retained hashes, and the extracted bundle's
149 payload files verified. Archive SHA256 is
`9135627c742fbceddd9839974d551b72c445a8a9e90f9e0390b30898336e2de9`.
For recovery, download the exact named archive/manifest to a fresh directory,
check both independently reviewed hashes before extraction, extract only into a
new empty directory, then run `bun run release verify --bundle DIR`. Retain the
originals if any check fails. Assets are mutable/deletable, same-provider storage;
keep an independent reviewed copy. No observed expiry or account-recovery claim follows.

## Documentation Development Prerelease

[Publication and health run 38264045296, attempt 6](https://github.com/0disoft/banora/actions/runs/38264045296/attempts/6)
confirmed all five `0.1.0-dev.1` packages at source
`932b5830b5fa0b281702f6025fd58810b945b426`, with fresh registry-download and
installed SDK/CLI/React/Vue/Svelte health. Preparation `38263371426` passed nine
gates; its 149-file manifest SHA256 is
`70060a2b9814ed75ef46abaa0575681c39ee640ae7ba2489742d3d4ac4b4126d`.
The correction ships usable npm READMEs without SDK implementation changes.
At that prerelease's completion, `dev` was `0.1.0-dev.1` and `latest` remained the
original `0.1.0-dev.0`, requiring explicit `@dev` selection for corrected instructions.
The later initial release above updates the default channel. Published prerelease
tarballs retain their immutable original README; this historical prerelease did
not itself promote `latest` or establish stable support. See the
[execution record](../engineering/24-package-readme-correction.md).

## Original Development Prerelease

[Publication and health run 38212158941](https://github.com/0disoft/banora/actions/runs/38212158941)
confirmed the SDK, CLI and React/Vue/Svelte packages against prepared source
`41e0e897a250674d71ed89e5a41c4fb8429072bc`. Preparation `38211207226` passed all
nine gates; its 149-file manifest SHA256 is
`d40ad9ba0cee77a917b06ad8c18d4a22205f2a0944c6994de4491814f7fb6332`.
The independent health job downloaded fresh registry tarballs, checked SHA256 and
SHA512 against reviewed bytes, installed SDK/CLI/native framework consumers and
rechecked the `dev` channel. Final verification reused confirmed versions without
reuploading them. The five temporary staged identities were rejected through 2FA.

Use `npm install @0disoft/banora@dev` on Node 24.x; optional CLI/adapters also use
`@dev`. Before the documentation prerelease on October 12, npm's `latest` and `dev` tags both resolved to
`0.1.0-dev.0`. This is a development prerelease even when installed through
`latest`; the publisher did not execute a retag command. No stable version or
support SLA is promised. Current documentation describes availability; published
tarballs retain their original README bytes and are never replaced under the same
name/version. Future artifact changes require a new version.

## Hosted Candidate Preparation

The earlier intentional `0.1.0-dev.1` release corrected the five published READMEs'
obsolete unpublished/local-build instructions, adds an SDK browser quick start and
replaces SDK/CLI links that escape the npm package. npm updates its package-page
README only on a new publication; see [npm's README guidance](https://docs.npmjs.com/about-package-readme-files/).
All five source package versions and lockfile workspace entries advance together,
with existing compatible SDK peer floors and dependency versions unchanged.
This is a documentation correction, not a new SDK feature or stable promotion.
Source readiness alone does not prove preparation or publication; the actual
verified results are recorded above. Keep `dev` as the reviewed destination and preserve the original
`0.1.0-dev.0` artifacts. See the [correction record](../engineering/24-package-readme-correction.md).

The manual-only [prepare-release workflow](../../.github/workflows/prepare-release.yml)
prepares the dispatched main commit on a GitHub-hosted Ubuntu runner. It accepts
no arbitrary source, path, registry or shell inputs. Only `0disoft/banora` main
can enter its one 20-minute job. It uses read-only repository permissions,
non-persistent checkout credentials and the existing frozen setup/tool policy;
it requests no OIDC token and does not publish packages, tags or a public demo.

After all nine preparation gates pass, the workflow records an offline
publication plan and retains only `.artifacts/releases/<source-commit>/` through
GitHub Actions artifacts. The artifact name includes source commit, run ID and
attempt; overwrite is disabled, missing files fail and retention is 14 days.
The parent directory is hidden, so inclusion is explicitly enabled for this
already-verified, closed file inventory, never for the whole workspace.
See [GitHub's artifact action](https://github.com/actions/upload-artifact).

The workflow exposes artifact ID, artifact archive digest and prepared manifest
SHA-256 as distinct outputs. Preserve all three with the successful run and source
commit. The upload archive digest is not the manifest hash. Downloaded contents
must pass `bun run release verify --bundle DIR` before use. Actions storage access
follows repository permissions; a private artifact is neither a public demo nor
an approved npm release. Expiring CI storage is not permanent retention: download
and independently preserve a reviewed candidate before its 14-day expiry.

After the workflow is on remote main, run it explicitly with
`gh workflow run prepare-release.yml --ref main`, then inspect its terminal result
and artifact metadata. Configuration alone does not establish a successful hosted
preparation or restore. An authorized publication flow must download and verify
those exact reviewed bytes rather than run preparation again to rebuild them.

## Prepare Reviewed Artifacts

Maintainers own source review, compatibility and artifact retention. Start in a
reviewed Banora checkout with `bun run setup` completed. Commit intended changes;
`bun run release prepare` requires an actual clean Git checkout and private
`banora-workspace` root. The five packages must use the same intentional version.
The selected source release version is `0.1.2`; there is no automatic bump.
This authorized patch is published for the transient-notice and localized
failure fixes, with preparation, publication and recovery recorded in the
[execution record](../engineering/32-notice-localization-release.md).

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

## Inspect a Publication Handoff

Run `bun run release publication-plan --bundle DIR --workflow publish.yml` on a
reviewed prepared bundle. Optionally add `--environment npm-release` to match an
intended GitHub environment, or `--tag next` for an explicitly selected channel.
The command emits the `banora.publication-plan/v1` JSON plan inside the existing
release-command envelope. It makes no network requests, starts no child commands,
reads no credentials and writes no configuration or artifacts.

The plan verifies all retained hashes, requires the current complete `@0disoft`
package family, records the manifest hash/source/version and lists SDK-first
package archives, hashes and npm argument arrays. Run those arrays only in a
separately authorized publication task from the verified bundle directory. They
disable lifecycle scripts, target the public npm registry and preserve the
reviewed tarballs. They are instructions, not executed operations.

Development versions default to `dev`; alpha/beta/rc versions use their matching
channel, other prereleases use `next`, and stable versions default to `latest`.
A prerelease cannot select `latest`. Unsafe workflow filenames, duplicate or
unknown options, unprepared/legacy bundles and damaged inventories fail with
the existing bounded release error envelope.

The proposed Trusted Publisher settings are GitHub user `0disoft`, repository
`banora`, the supplied workflow filename and optional environment, configured
separately for each package. Direct `npm publish` permission must be enabled.
`workflowFileExists` reports only local regular-file presence; it proves neither
workflow behavior nor npm/GitHub permissions. The guarded manual publisher is
described below. Existing npm packages do not authorize new Banora packages. Follow
[npm's trusted publishing instructions](https://docs.npmjs.com/trusted-publishers/)
for the actual package configuration, supported CLI and hosted runner.

Before executing a plan, approve source/version/destination, establish the private
reporting route, verify public-source provenance and each package's publication
authority. Inspect existing versions without treating registry failures as absence.
Stop on any conflicting version or partial failure; verify registry integrity and
fresh installed consumers before continuing or promoting a channel.

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

### Preview or Execute Reviewed Tarballs

`bun run release publish --bundle DIR --manifest-sha256 HASH --source-commit SHA --tag dev`
defaults to an offline preview. It verifies the complete prepared bundle, binds
its exact manifest hash and source to the supplied review values and computes
each tarball's npm-compatible SHA-512 integrity. The existing publication plan
uses explicit `./packages/*.tgz` arguments so npm reads local archives, as required
by [npm's package-spec documentation](https://docs.npmjs.com/cli/v11/commands/npm-publish/).
The preview runs no child commands, performs no registry requests and changes no
files or settings. A matching hash is a byte binding, not owner approval.

Only an explicitly authorized future invocation with `--execute` enters the
publication path. It requires this public repository's manual main `publish.yml`
job, `npm-release` environment, matching `GITHUB_SHA`, available OIDC context,
no static npm token environment and a regular root SECURITY.md. These process
checks do not replace actual npm/GitHub authorization or a verified private
reporting channel. npm 11.5.1 or later within major 11 is required. The reviewed
workflow provides `BANORA_REPOSITORY_PUBLIC=true` and
`BANORA_PUBLISH_ENVIRONMENT=npm-release` in its gated publishing job.

The publishing job's commit must equal the reviewed candidate's source, so
provenance cannot describe a different checkout. If main has advanced, prepare
and review a new candidate before approval; never silently rebuild an approved
candidate during publication.

Execution exclusively restages the verified bundle, preserves all original
manifest fields/inventories and uses empty isolated npm configuration with static
token/config environment overrides removed. npm's project prefix is forced to
the isolated working directory and its own `.npmrc` is refused, so ancestor
project settings cannot supply a token or override. Temporary config parents must
be regular directories within the repository. No package lifecycle scripts run.
Before the first upload it checks all five existing public package identities,
versions, SHA-512 values and the selected channel. Establish each new registry
identity and trusted publisher separately: any metadata failure, including 404,
stops rather than being interpreted as availability or authority. Matching already
published versions may resume only when both bytes and the selected channel match;
conflicting bytes or channel selection stop without upload or automatic retagging.

It then uploads SDK before CLI/adapters, without rebuilding, and checks each
registry version/integrity/channel before continuing. Commands use argument arrays
and force fresh npm metadata revalidation with `--prefer-online`, so a preflight
cache cannot hide the version just uploaded. Commands have fixed public registry
selection, with bounded deadlines/output and no raw
child logs in receipts. Any failed/timed-out upload or inconclusive post-check stops
later packages. After a successful upload only, a still-missing version allows
at most eighteen additional metadata reads with ten-second waits and a three-minute
confirmation budget; each request retains its existing 30-second timeout. The
elapsed budget is checked between reads, so a single in-flight read can finish
after it; the publishing job retains its 20-minute deadline. This replaces the
ten-second window that stopped normal uploads during the documentation prerelease.
Provider errors and byte/channel conflicts stop immediately. No upload is retried.
Failures return `publication-uncertain`, with confirmed package progress
and the attempted name/version. A failed npm process also supplies an allowlisted
`npmCode` (or `unknown`), without provider messages, paths or raw logs.
`lastCheck` identifies archive verification, the upload command or the specific
registry post-check; `npmExitStatus` is present only if the process returned.
Do not blindly retry: inspect registry state and
retain the reviewed bytes. A later approved run may resume confirmed matching
versions. Fresh registry-installed consumers have the separate command below;
actual execution and previous-version rollback remain required evidence after publication.

### Check Fresh Registry Downloads

After an authorized publication, run this read-only registry/installed-consumer
check from the corresponding source with root setup dependencies available:

```sh
bun run release registry-check --bundle DIR \
  --manifest-sha256 REVIEWED_MANIFEST_SHA256 \
  --source-commit REVIEWED_FULL_SHA --tag dev
```

This command requires the exact prepared current-family bundle/source/hash/channel
binding. It rejects `--execute`; it never publishes, changes tags or selects a
host deployment. Public metadata queries use isolated empty npm configuration and
no static npm token. All five names, versions, canonical registry tarball URLs,
SHA-512 integrity values and the selected channel must match before any download.
404, transport/auth errors, foreign URLs and conflicts stop as fixed JSON codes.

Each tarball is fetched afresh over credential-free HTTPS from the canonical npm
registry URL, with redirects denied, a 60s deadline and streaming capped at the
reviewed archive's exact length (at most 64 MiB). Both SHA-256 and SHA-512 plus
length/regular-file checks must match before code is executed. Partial downloads
remain isolated and never qualify as health evidence. The original reviewed
bundle is preserved; only its exclusive verified copy receives downloaded bytes.
There is no package rebuild or reliance on a previously cached npm tarball.

Existing `packed-consumer`, `packed-cli` and `packed-adapters` commands execute
serially against those downloaded tarballs, using their independent installations,
disabled lifecycle scripts, declarations, Node/classic runtime and native
framework type/SSR checks. Each retains the existing ten-minute process deadline
and process-tree cleanup. Child output is drained; the receipt lists completed
check names rather than inventing inner test counts. The channel is queried again
after installation, and both the original and copied manifests remain verified.

`registry-metadata`, `registry-channel`, `registry-integrity`, `registry-download`
and `registry-consumer` errors stop without registry mutation. Receipts retain
confirmed downloaded names and a failed consumer/final-confirmation label where
available, without raw provider messages, file paths or credentials. Downloading
and restaging write only isolated local files. A passing check establishes tested
registry bytes/consumers; it is not host health, live rollback or release approval.
Actual five-package development publication and independent registry health are
recorded in the [publication history](../engineering/18-release-tooling-execution-evidence.md).
They do not establish permission to move an existing tag or prior-version rollback.

`bun run release channel-plan` provides a read-only complete-family preflight for
a reviewed older bundle and explicit current version. It verifies source/hash,
registry identity/integrity/tags twice and distinguishes `no-change` from a
`rollback-plan`. It does not execute a tag command or weaken the publication gate;
see [registry rollback boundaries](rollback.md#registry-and-data-boundaries).

### Check a Registry Rollback Target Before Moving Tags

Use the separate read-only command when the reviewed target is older than the
currently selected package family:

```sh
bun run release registry-target-check --bundle REVIEWED_PREVIOUS_BUNDLE \
  --manifest-sha256 REVIEWED_PREVIOUS_MANIFEST_SHA256 \
  --source-commit REVIEWED_PREVIOUS_SOURCE_SHA --tag dev \
  --expected-current-version CURRENT_VERSION
```

The existing `registry-check` still requires the selected channel to match the
tested version. Target checking first performs the whole-family channel preflight,
including source/hash binding, two consistent observations, version inventories,
target deprecation, integrity and refusal of forward/stage/execute requests. It
then reuses bounded fresh registry downloads, both hashes, exclusive restaging and
independent installed SDK/CLI/framework checks for the reviewed target. All five
tags must remain at the explicit current version before downloads and after
installation. Target deprecation is checked again during those observations.

The existing health envelope's `operation` is `registry-target-check`, with explicit
`expectedCurrentVersion`, `targetVersion` and `preflightObservations: 2`. Its three
consumer check labels retain their existing meaning. Metadata/deprecation/tag
drift, changed bytes, download or consumer failures produce no successful receipt.
`registry-target` identifies a deprecated/malformed target observed after preflight;
late failures retain downloaded names and the final-confirmation label. Ordinary
post-publication health behavior and receipts are unchanged.

This command downloads and executes reviewed package test input. Use independently
reviewed source and hashes, not hashes supplied by an unknown author. It never changes a
tag, publishes a package, rebuilds an artifact or changes host data. Observations
are not a registry lock; repeat preflight immediately before a separately authorized
mutation. No new workflow, publisher permission or long-lived credential is added.

The [actual previous-version target check](../engineering/25-registry-target-health-evidence.md)
downloaded and installed all five original `dev.0` packages while `dev` remained
`dev.1`. This establishes fresh target health at that recorded time, not a tag
switch or permanent freshness guarantee.

### Manual Workflow and Approval Boundary

The [publish workflow](../../.github/workflows/publish.yml) accepts a preparation
run ID, source commit, manifest SHA-256, channel and an `execute` boolean that
defaults to false. Inputs enter quoted arguments through environment values;
they are not interpolated into shell source. Only this repository's main checkout
is eligible. Global publication concurrency queues runs without cancelling a
possibly partial upload.

The read-only preview job checks that the selected run completed successfully
through `prepare-release.yml`, on the same main commit and repository, with
exactly one unexpired candidate matching its run attempt. Provider reads have
bounded deadlines/output; the compressed artifact is limited to 128 MiB.
It downloads that immutable artifact ID with `actions: read`, runs the local
permission policy and verifies the entire bundle plus the reviewed manifest hash.
No rebuilding, registry request or OIDC permission is used in this job. The
Actions archive digest is metadata; the reviewed manifest and every file hash
are the independent byte-binding checks.

For `execute=true`, preflight additionally refuses private source and an absent
or unprotected `npm-release` environment. A real configured required reviewer
must be present in the read-only environment API response. A solo maintainer can
review their own dispatch when their environment permits it; this does not invent
a second operator. Create/configure this environment deliberately before execution,
and review GitHub's actual protection UI. The tool does not configure it or treat
a wait timer as approval. See [environment protection](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
and [environment API](https://docs.github.com/en/rest/deployments/environments#get-an-environment).

Configure a GitHub Actions trusted publisher separately for each of the five
Banora packages. Match user `0disoft`, repository `banora`, workflow filename
`publish.yml` (not its directory path) and environment `npm-release`. The current
workflow calls `npm publish`, so explicitly allow direct publishing in each
connection. New connections default to allowing only `npm stage publish`; that
default does not authorize this workflow. No `npm dist-tag` permission is needed
for the current publisher, which never retags an existing version.

Create these connections when the reviewed candidate and GitHub environment are
ready: a new connection must complete its first successful publish within two
days, or it expires. If it expires, recreate it deliberately; rerunning a preview
does not validate the connection. A renamed repository, changed workflow or wrong
environment also needs a matching connection, rather than a static-token fallback.
These are owner/provider configuration steps, not settings applied by this guide.
See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for allowed
actions, expiry and current setup requirements. Choosing staged publication would
require a separately reviewed staging/approval/health flow; this workflow does not
silently turn a staged package into a public release.

When staging initializes a missing package identity, npm creates a public
`0.0.0-stage` placeholder while retaining the real candidate privately. That staged
candidate reserves its version: direct publication of the same version is blocked.
For this direct-publishing workflow, reject only the matching temporary stage IDs
before execution, preserving the reviewed candidate bundle. Rejection requires
owner 2FA and must not unpublish the public placeholder or another release.
See [npm stage](https://docs.npmjs.com/cli/v11/commands/npm-stage/) for the shared
version index and rejection authentication requirement.

Only the subsequent environment-gated publishing job requests `id-token: write`.
It downloads the same candidate ID, runs the file/permission gate and executes
the guarded publisher with the same source/hash/channel. Checkout credentials
remain disabled and no static npm secret or broad write token is configured.
The JSON receipt is retained for 14 days even after an uncertain upload. Missing
receipts or failed post-checks are failures, not a release success.

A subsequent separate `health` job runs only after successful explicit publication.
It has `contents: read` and `actions: read`, without OIDC or npm write authority.
After frozen root setup it retrieves the same artifact ID for source/hash comparison
and invokes `registry-check` on fresh registry downloads. No source package rebuild
is performed. Success requires the independent SDK/CLI/framework consumers and
final channel confirmation; an upload receipt alone is insufficient. The health
receipt is retained for 14 days on success or failure. Failed health makes the
workflow fail after publication, preserves publication progress and requires
investigation/fix-forward or separately approved rollback. It does not retry
uploads, retag packages or claim a healthy host application.

The sole OIDC exception in `scripts/security.ts` binds the exact parsed workflow
SHA-256, pathname, job and permission. Any parsed workflow edit, including extra
steps, changed inputs, environment or trigger/conditions, fails closed until that
whole policy is intentionally reviewed again. This local drift check is not a
signature or a grant of provider authority. Other workflow write permissions
and secret injection remain rejected. Current major-range action versions are
retained; compatible upstream updates do not require YAML changes.

After committing the publisher workflow, prepare and review a candidate at that
same remote main SHA. Dispatch the read-only route with the reviewed values:

```sh
gh workflow run publish.yml --ref main \
  -f prepare_run_id=PREPARATION_RUN_ID \
  -f source_commit=REVIEWED_FULL_SHA \
  -f manifest_sha256=REVIEWED_MANIFEST_SHA256 \
  -f tag=dev -F execute=false
```

Placeholders above are operator-supplied receipts, not generated credentials or
an approval. Inspect the terminal preview result before an explicitly authorized
`execute=true` dispatch and subsequent environment review. Preview success does
not test trusted-publisher settings, npm uploads, fresh registry-installed
consumers or live rollback. First publication and destination decisions remain
the owner's external handoff below.

### Owner Decisions

The primary maintainer is `0disoft`. [Maintainer recovery](maintainer-recovery.md)
owns source backup, offline restore, independent artifact retention and private
provider account-recovery actions. Actual credential recovery is not implied by a release.

Before any publication, identify the primary maintainer, account/artifact recovery
procedure and a real private
security-report channel; establish registry scope access, credentials outside Git,
public feedback access, licensing/provenance and supported runtime evidence.
Hosted CI and a local green result are different evidence. Stop on failed checks,
authored-data loss, leaked data, mismatched bytes or missing publication authority.
Record approved source, manifest hash, version, destination, operator and recovery
bundle in the release record. Keep prereleases separate from the stable channel.

A solo maintainer can own this handoff; do not require a fictional backup person.
Any actual backup maintainer or escalation contact must be recorded explicitly.

For the approved registry publication, publish each reviewed retained
tarball rather than rebuilding it. Publish the SDK before dependent packages,
verify installed names/versions and the expected channel, then exercise independent
consumers. Partial publication stops promotion; preserve successful version records
and fix forward with a new version where necessary. npm accepts tarballs and does
not allow reusing a published name/version, as documented by
[npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/).

The selected demo host is GitHub Pages. Its production asset paths and actual
open/edit/export/reopen flow passed live checks at `9c35e23`; see
[demo deployment](demo-deployment.md) for the executed scope and update procedure.
Preparation, offline preview and restore do not publish packages, change registry
tags or migrate user data. Explicit npm publication has the separate gates above;
live registry health and remote rollback remain separate execution evidence.

## October 12: Executed Access Preflight

The reviewed local candidate is fdea584: five development-version packages,
149 retained files, nine successful preparation gates and verified copied SDK/CLI
consumers. The current remote main CI at fed716a is complete and successful.
Those gates establish preparation and tested consumers; they do not supply
publication authority or an operator's account.

Read-only checks after preparing that candidate found:

- GitHub still reports private visibility with Issues enabled. All observed CI
  runs are terminal, and no open bot update PR is present.
- `npm whoami --registry https://registry.npmjs.org/` returns `ENEEDAUTH`.
  This only establishes that the local CLI is unauthenticated. It does not test
  GitHub Actions trusted-publisher authority or require local login for OIDC
  publication. No login, token creation or publish operation was attempted.
- The public-registry lookup for `@banora/sdk` returns `E404`. This does not
  establish namespace availability/ownership or distinguish absence from restricted
  access; development package names are not a reservation or publication grant.
- The repository Pages lookup returns HTTP 404. No existing Pages deployment is
  established by that lookup; it does not prove that no other host exists.
- Root SECURITY.md was absent at that preflight. The owner subsequently approved
  the updated policy, now installed as [SECURITY.md](../../SECURITY.md). An actual
  private reporting channel remains unverified; policy presence does not close it.

Public GitHub source plus a GitHub Pages demo and npm packages is a proposed
destination, pending the owner's choice. It is not selected or deployed merely
because its tooling is available. If selected, Pages requires its publishing
source and workflow/artifact deployment to be configured; see
[GitHub's custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
For subsequent npm automation, prefer a package-configured trusted publisher
with short-lived OIDC authority after account/package ownership is established;
see [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
At that preflight, neither provider configuration nor extra CI write authority
had been applied. The subsequently installed manual workflow has the strictly
scoped OIDC permission described above; its external provider setup is still pending.

### Owner Package Inventory and Existing OIDC Workflow

The owner supplied an npm account inventory showing existing `@0disoft` packages
and several GitHub Actions publications. That inventory establishes the intended
publisher context; a publisher label alone does not identify its authentication
method or grant a new package's workflow authority.

The local `ssealed` release workflow was inspected separately. It requests
`id-token: write` on a GitHub-hosted runner and publishes its verified tarball
with `npm publish --access public --provenance`, without an npm token environment
variable. It is configured for OIDC publication. This inspection did not execute
that workflow or inspect npm's package settings.

The local packaging decision now uses the existing personal scope: `@0disoft/banora`,
`@0disoft/banora-cli`, `@0disoft/banora-react`, `@0disoft/banora-vue` and
`@0disoft/banora-svelte`; see [ADR 0023](../adr/0023-existing-publisher-package-identity.md).
Source imports, package metadata and current consumer instructions use those names.
The retained fdea584 candidate still contains the previous `@banora/*` names and
is not a candidate for publication under the new identities. Its manifest and
files remain unchanged and verifiable/restorable. Run legacy executable consumers
from that bundle's recorded source commit rather than current renamed consumers.
Existing `@0disoft` packages do not authorize publishing new Banora packages.
Each package still needs the matching repository/workflow trusted-publisher
configuration and verified publishing permission. npm documents that `npm whoami`
is not a trusted-publishing permission check in its
[trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

The owner subsequently approved public GitHub source, Pages and private GitHub
reporting; their actual configuration and live demo checks are recorded in
[demo deployment](demo-deployment.md). The `npm-release` environment now selects
only `main`, requires `0disoft` approval and permits self-review. Five package
identities were initialized using the reviewed candidate's staged tarballs;
their public `0.0.0-stage` placeholders are not SDK releases. Package-specific
trusted publishers and actual OIDC publication/health were subsequently verified
in the development release recorded above.
Temporary local CLI login is used only for initial registration; the subsequent
Actions publisher does not use it. Never request credentials in a public
issue or invent an address/account to close a readiness row. No full local suite
needs repeating while these external prerequisites remain unchanged.

See [VALIDATION](../../VALIDATION.md), the [operational contract](00-operational-contract.md)
and [ADR 0022](../adr/0022-retained-release-artifacts.md).
