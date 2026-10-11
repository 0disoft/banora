# Release Tooling Execution Evidence

Status: historical, source-scoped execution records; not a completion or release claim.

The [active readiness review](12-readiness-review.md) owns the complete 72-question
worklist, current evidence summary and unresolved obligations. Earlier development
and product records belong to [readiness execution history](13-readiness-execution-evidence.md).
The records below preserve their original source, tools, check counts and limits.
Read their dates/source commits before using them as current-state evidence.
Actual prepared bundles and download receipts are recorded separately in
[release preparation evidence](15-release-preparation-evidence.md).

## Execution Evidence

The latest [publication access preflight](../ops/release.md#october-12-executed-access-preflight)
confirmed private GitHub visibility, terminal CI and no open bot update PR.
Local npm identity returns ENEEDAUTH; this does not test Actions OIDC publishing
permission. The repository Pages lookup returns 404.
The policy candidate/diff remains prepared but unapplied. Publication destination/
visibility and a real private reporting channel await owner decisions. The owner
has supplied an existing `@0disoft` package inventory; inspection of the local
`ssealed` release workflow confirms it is configured for token-free OIDC
publication. [ADR 0023](../adr/0023-existing-publisher-package-identity.md) now
applies that scope to local package metadata, imports and installed consumers.
The retained fdea584 bundle keeps its original development identities and cannot
be published under the new names. Banora package-specific publishing authority
remains unconfirmed. These are actual remaining prerequisites,
not another reason to rerun already-passing SDK suites or prepare unchanged bytes.

[Executed increments and their evidence](13-readiness-execution-evidence.md) retain
all implementation/check history separately from this current-state worklist.
Historical counts and next-step notes are scoped to their increment; they do not
replace the final current-state, requirement-by-requirement completion audit.

[Retained release evidence](15-release-preparation-evidence.md) separately records
the local artifact preparation exercise and its publication/rollback boundaries.

### October 12: Existing Publisher Package Identity

Local packaging now follows [ADR 0023](../adr/0023-existing-publisher-package-identity.md):
the common SDK is `@0disoft/banora`, with separate CLI/React/Vue/Svelte packages.
Imports, peer/workspace dependencies, build externalization, declaration consumers,
standalone installation checks and current SDK documentation use those identities.
All five package manifests declare public package access and the matching repository
directory. These are local metadata, not uploaded packages or OIDC settings.

Executed on Windows with Bun 1.4.2 and Node 24.14.0:

- Frozen setup and root check passed: lint/format/boundaries, SDK/adapter/CLI builds,
  root/Svelte types, 199 tests/2,783 assertions, installed SDK/classic/declarations
  and 297 installed CLI checks.
- Independent installed React/Vue/Svelte artifacts, peers, declarations and SSR
  rendering passed without resolving their SDK through the workspace.
- Independent starter install, strict types, production build and actual browser
  open/edit/download/reopen, invalid-input preservation, keyboard and emulated
  touch passed using the renamed SDK. Browser automation uses Playwright CLI.
- File/permission signals passed 355 files; this is not a complete security scan.
- The new verifier accepted the retained fdea584 bundle and all 149 file hashes.
  New release regressions preserve complete legacy identities through restaging,
  leave the original manifest unchanged and reject ten mixed-family combinations.

Hosted Linux/main CI, the complete Studio browser matrix and a new retained
candidate have not been rerun for this naming increment. Their previous results
describe pre-rename source. External publication, visibility and private-report
decisions remain pending; no registry upload or credential change occurred.

The subsequent [cb53a96 preparation](15-release-preparation-evidence.md#october-12-current-publisher-identities-prepared-and-restaged)
closes the current-candidate and complete local Chrome-suite gaps: all nine gates
passed against the 149 retained current-name files, and actual independently
restaged SDK/CLI consumers passed. The offline publication-plan command inspected
that candidate and emits its manifest hash, per-package archive hashes, SDK-first
argument arrays, prerelease-safe channel and expected package-specific OIDC
settings. It does not install a publisher workflow, contact a registry or assert
approval/authentication. Hosted execution for the renamed source subsequently
passed at ec13a69, as recorded below.

The subsequent local root check including the publication command passed 202
tests/2,816 assertions and 297 installed CLI checks. Eight focused release tests
passed 72 assertions, including the actual offline process with an empty executable
search path. File/permission signals passed 356 files. No new SDK/example behavior
was changed after preparing cb53a96, so its retained browser/archive evidence is
not replaced by another preparation just to include later operational documentation.

### October 12: Renamed Packages Passed on Hosted Linux Main

[Run 38172034065](https://github.com/0disoft/banora/actions/runs/38172034065) completed
successfully at `ec13a69c3fe6b8534cc3aed9de49226c05fcd78c` after a single batched
main push. Its one Ubuntu job took 3m58s with Bun 1.4.3, Node 24.21.0 and actual
Headless Chrome 155. Change selection chose `code` and the complete browser route.

Hosted logs confirm frozen setup, lint/format/boundaries/builds/types, 202 tests/
2,816 assertions, installed SDK/classic declarations and 297 installed CLI checks.
All three independently installed adapters passed types/SSR, the complete browser
suite passed, and the independently installed starter passed production open/edit/
download/reopen, keyboard and emulated-touch flows. File/permission signals passed
356 files; the dependency audit found no advisory in its 165-package scope.
The schedule-only step correctly skipped; the ordinary full route executed both
security gates. No publishing job, credentials, visibility or branch protection
was configured by this push. Physical-device, registry and policy approvals remain
separate gates. This result proves the renamed source, not a published SDK or demo.

### October 12: Manual Hosted Candidate Route

The separate [prepare-release workflow](../../.github/workflows/prepare-release.yml)
now configures manual main-only nine-gate preparation and 14-day retention of
the exact verified bundle, with unique run/attempt artifact identity and no
overwrite. It has read-only repository permissions and no registry/OIDC grant.
The ordinary CI planner checks release-only orchestration without unrelated
browser reruns, while mixed SDK/manifest changes retain their complete routes.

Local root check passed 203 tests/2,831 assertions and 297 installed CLI checks;
type, docs, format, boundary and 357-file permission signals passed. This source
does not change SDK/example artifacts. Actual hosted upload, artifact metadata
and downloaded-byte verification remain unproven until the manual route executes;
its configuration is not publication, permanent backup or deployed rollback.

The route subsequently executed successfully in
[run 38173047836](https://github.com/0disoft/banora/actions/runs/38173047836).
The resulting artifact ID/digest/expiry, exact source/tree and manifest hash were
verified from hosted output and API metadata. The actual download matched the
manifest receipt and all 149 file hashes, then passed installed SDK/classic/types
and 297 installed CLI checks on Windows using Linux-built tarballs. See
[retained release evidence](15-release-preparation-evidence.md#october-12-hosted-candidate-retained-and-downloaded)
for immutable identifiers and coverage limits. Ordinary scoped CI also passed
at ff9edb7 in 35s, correctly omitting unrelated extra browser/dependency gates.
Both Dependabot ecosystem jobs were verified successful at fed716a with no needed
updates; this does not establish an updated-lockfile PR or auto-merge.

### October 12: Reviewed-Byte Publication Tooling

The maintainer `release publish` command defaults to offline preview and requires
an exact manifest SHA-256/source/channel binding. Existing plan tarball arguments
were corrected to explicit `./` paths. The actual downloaded hosted SDK archive
passed npm `publish --dry-run --ignore-scripts --provenance=false`; npm reported
the expected current name/version and SHA-512 matching the preview. The dry run
warned about unauthenticated registry access, as expected; it did not upload or
test OIDC permission. Existing public-package metadata was read only to verify
the npm multi-field JSON shape used by preflight.

An explicit execution path now enforces the public manual main job/environment,
reviewed source identity and policy-file presence, uses isolated reviewed bytes
and npm configuration, prechecks every existing public identity/version, orders
SDK first and preserves confirmed progress on uncertain upload. Twelve scoped
release tests passed 109 assertions, including real preview processes and authored
registry simulations. Those simulations are not a live publish or permission test.
The publishing workflow and package-specific trusted publishers remain absent;
no SDK API, package version, database or actual registry state was changed by this work.
The complete local `check` also passed 207 tests / 2,868 assertions, quality,
boundaries, builds, root/Svelte types, 122 documents / 489 relative links, installed
SDK/classic declarations and 297 installed CLI checks. File/permission signals
passed on 358 files. Browser suites were not repeated for private release-tool
changes; the retained candidate's hosted browser evidence remains separately scoped.

### October 12: Manual Publication Workflow and Policy Boundary

The separate `publish.yml` workflow now defaults to a read-only preview. It binds
the successful main preparation run, source identity, run attempt, one unexpired
artifact ID and the reviewed manifest/file hashes without rebuilding. Explicit
execution additionally requires public source and a pre-existing `npm-release`
environment with actual required reviewers; then only its environment-gated
publishing job receives `id-token: write`. No provider settings or registry state
are configured by installing this workflow. Receipts preserve uncertain/confirmed
progress for 14 days, not permanent backup or verified registry-installed health.

The narrow permission exception binds the entire reviewed parsed workflow,
pathname/job/permission. Mutation regressions reject changed conditions, inputs,
environment, checkout, steps, foreign filenames and broader authority. Failed,
stale/foreign and expired/wrong/extra provider artifacts are rejected; a wait timer
does not satisfy reviewer protection. The collector accepted freshly read actual
metadata for preparation run 38173047836 and artifact 11714732515; this is metadata
validation, not execution from a matching new checkout or hosted publication.

Local `check` passed 210 tests / 2,939 assertions, quality/boundaries/builds,
root/Svelte types, 122 documents / 491 relative links, installed SDK/classic and
297 installed CLI checks. Focused CI/candidate tests passed six cases / 136
assertions; file/permission signals passed 361 files. SDK API, database, version,
dependencies and repository hygiene are unchanged. Ordinary CI selects private
release checks for these workflow/helper edits while mixed SDK changes retain
their broader gates. Hosted preparation/preview execution from this new source,
owner policy approval/private reporting, visibility/destination and per-package
trusted publishers remain separate gates; no actual `--execute` run was performed.

### October 12: Hosted Publication Preview Executed

The configured-only candidate download/preview gap is now closed by actual
[preparation 38175691497](https://github.com/0disoft/banora/actions/runs/38175691497)
and [publication preview 38176068080](https://github.com/0disoft/banora/actions/runs/38176068080)
at `52f7c3f`. All nine preparation gates passed, one 149-file candidate was retained,
and the read-only preview downloaded that exact artifact ID and verified the
reviewed manifest/file hashes. The publishing job was explicitly skipped. An
independent Windows download/verify/preview also passed; all five tarballs are
byte-identical to the earlier verified Windows-consumed ff9edb7 archives. See
[release evidence](15-release-preparation-evidence.md#october-12-hosted-publication-preview-from-exact-prepared-bytes)
for source/tree, manifest/archive hashes, expiry and evidence limits.

Ordinary scoped Linux CI at this source passed 210 tests / 2,939 assertions,
installed SDK/classic and 297 CLI checks in 41s, without unrelated extra gates.
The full release preparation separately executed those extra gates. No repository
visibility, environment/reviewer settings, npm trusted publishers, registry version,
private reporting route or root SECURITY.md was changed. Actual execution and
registry-installed health/rollback remain gated on the existing owner handoff.
This evidence update changes no SDK API, database, dependency, hygiene or runner;
docs/format/whitespace checks cover it. A later main commit requires a newly
reviewed matching candidate before execution; do not rerun unchanged full suites
or use synthetic accounts/contact values to substitute for missing owner decisions.

### October 12: Fresh Registry Health Tooling

`release registry-check` now binds reviewed prepared bytes, reads every public
identity/version/channel/integrity before download, fetches fresh bounded canonical
HTTPS tarballs and executes existing independent SDK/CLI/framework consumers only
after SHA-256/SHA-512 and length checks. It preserves original artifacts and
rechecks channels after installation. This read-only tool does not publish or
roll back a registry tag or application. Existing check deadlines/process cleanup
were extracted into one shared runner without changing preparation behavior.

An actual innocuous ancestor `.npmrc` reproduction showed npm inheriting parent
project configuration inside an isolated subdirectory. The shared npm runner now
forces an explicit working-directory prefix, refuses a local `.npmrc`, strips
static-token/config environment overrides and validates its temporary config parent.
Actual npm config regressions pass without creating credentials or private values.

Focused release/CI checks passed 20 tests / 262 assertions. Local `check` passed
215 tests / 3,027 assertions, quality/boundaries/builds, root/Svelte types, 122 docs /
492 relative links, installed SDK/classic and 297 installed CLI checks. File signals
passed 363 files. Fresh HTTP transport downloaded the existing public
`@0disoft/service-catalog-generator@1.0.2` archive (440,625 bytes) with matching
registry SHA-512; no downloaded package code was executed. HEAD did not provide
the required size measurement, so npm's read-only pack dry-run supplied its bound.
The transport implementation supports a missing content-length header while
enforcing the reviewed streaming length. This proves public transport, not Banora
publication or registry availability.

The retained `52f7c3f` Banora tarballs separately passed actual SDK/CLI/native
framework installations through the new orchestration with simulated metadata
and copied transport bytes. Simulation does not establish live npm distribution.
An actual Banora `registry-check` stopped at `registry-metadata`, with exit 1 and
zero downloaded packages; the registry result is not healthy or namespace authority.
No registry changes, package versions, SDK APIs, database, dependencies or hygiene
changed. Automatic workflow wiring and live post-publication/rollback evidence
remain separate; root policy/private reporting and provider/visibility decisions
are still pending. Browser suites were not repeated for private release tooling;
the earlier exact-source hosted preparation retains its own browser evidence.

### October 12: Independent Post-Publication Health Workflow

The manual workflow now has a separate read-only `health` job, selected only
after successful explicit publication. It retrieves the same comparison artifact,
installs the reviewed frozen consumer-check dependencies, downloads fresh registry
tarballs and runs `registry-check`. There is no package rebuild, OIDC permission,
static npm token, automatic upload retry or retagging in this job. Failed health
makes the workflow fail after upload; publication and health receipts remain
separate so a completed upload is not mistaken for tested installed consumers.

The whole-workflow policy was intentionally reviewed for this addition; focused
CI/candidate regressions passed six tests / 145 assertions, including read-only
permissions, dependency/condition guards and denial of extra OIDC authority.
Root type/lint, file/permission signals (363 files), docs and whitespace checks
passed. The preceding root check covers the private registry-health implementation
(215 tests / 3,027 assertions plus 297 installed CLI checks); SDK/browser sources
are unchanged. The new hosted job remains unexecuted until an authorized real
publication exists, so live distribution, provider authority and actual rollback
are still unproven. SDK API, DB, version, dependencies and hygiene are unchanged;
the manual release workflow and its policy/tests/runbooks are the changed runners.

The subsequent [hosted CI run 38177821097](https://github.com/0disoft/banora/actions/runs/38177821097)
completed successfully at `7701d3723474ebe66d0ef7cdbb73fba445f5e6d0` in one 29s
Linux job. It selected code-only private release verification and passed 215 tests /
3,036 assertions, installed SDK/classic, 297 installed CLI checks, 122 documents /
491 relative links and 363-file signals. Extra browser/adapter/starter/audit routes
were correctly omitted for this diff; actual retained adapter installation was
checked separately in the preceding integration. This validates the implemented
tooling and narrow CI path, not an executed publication or registry-health job.
