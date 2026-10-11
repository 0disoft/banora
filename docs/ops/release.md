# Release

Status: local artifact preparation implemented; registry publication and hosted
deployment are not configured or established by a successful preparation.

## Hosted Candidate Preparation

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
workflow behavior nor npm/GitHub permissions. No publishing workflow is currently
installed. Existing npm packages do not authorize new Banora packages. Follow
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
- Root SECURITY.md is absent. The already-prepared 93-line policy candidate/diff
  still needs explicit owner approval and a verified private reporting channel.

Public GitHub source plus a GitHub Pages demo and npm packages is a proposed
destination, pending the owner's choice. It is not selected or deployed merely
because its tooling is available. If selected, Pages requires its publishing
source and workflow/artifact deployment to be configured; see
[GitHub's custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
For subsequent npm automation, prefer a package-configured trusted publisher
with short-lived OIDC authority after account/package ownership is established;
see [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
Neither provider configuration nor extra CI write authority has been applied.

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

The next actionable handoff is the existing policy approval/private-channel
decision, publication destination/visibility approval,
and package-specific publishing authority. Local npm login is not a prerequisite
for the proposed Actions OIDC route. Never request credentials in a public
issue or invent an address/account to close a readiness row. No full local suite
needs repeating while these external prerequisites remain unchanged.

See [VALIDATION](../../VALIDATION.md), the [operational contract](00-operational-contract.md)
and [ADR 0022](../adr/0022-retained-release-artifacts.md).
