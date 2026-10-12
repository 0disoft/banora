# Published Package README Correction

Status: all five `0.1.0-dev.1` packages published to `dev`; preparation, registry
integrity and independent installed-consumer health passed on October 12, 2026.

## Observed Defect

On October 12, 2026, credential-free public npm README reads for SDK, CLI, React,
Vue and Svelte still described the published `0.1.0-dev.0` packages as unpublished
and directed consumers to local workspace builds. Current repository README
corrections were not in those immutable tarballs. The SDK diagnostic link and two
CLI automation/diagnostic links also escaped the package's included files.
The original successful publication is recorded in
[release tooling evidence](18-release-tooling-execution-evidence.md).

[npm's README documentation](https://docs.npmjs.com/about-package-readme-files/)
requires a new package publication to update the package page. A Git README edit
does not repair already installed artifacts. Existing versions must not be
overwritten or replaced. The new prerelease corrects this actual onboarding defect;
it is not a duplicate release solely to manufacture rollback evidence.

## Candidate Scope

The five source package versions and Bun workspace lock entries are deliberately
`0.1.0-dev.1`. Dependency versions and the existing `>=0.1.0-dev.0 <1` SDK peer
floors stay unchanged. There are no public implementation, export, record-format,
storage-schema or controller-ownership changes relative to the original published
source. The CLI version report intentionally follows its package metadata.

The SDK README starts with published installation, a browser `mountViewer` example
and explicit owned/borrowed disposal. Documentation and Studio links use public
HTTPS destinations that remain usable from npm and installed packages. CLI and
native adapter READMEs retain the previously corrected published-install routes.
No account, credentials, runtime assets or framework dependency is added to SDK.

Local validation exposed an installed-CLI smoke assertion hardcoded to the initial
version. It now compares the executable's report with its installed package
metadata, so retained older candidates and future versions both remain testable.
The executable itself already used package metadata and needed no behavior change.

## Verification and Publication Boundary

Run existing local `check`, then prepare the clean committed candidate once with
the existing hosted nine-gate release workflow. Review the manifest/source/hash,
closed inventory and exact retained tarballs before dispatching the existing
protected publisher. Reuse these bytes for independent registry-download and
installed-consumer health; do not rebuild inside publication or call a successful
preview a completed release. The selected channel is `dev`, with no stable support
promise or manual `latest` promotion.

The existing main CI and release preparation/publish/health jobs are unchanged.
No job, schedule, permission or runner is added. Physical-device and screen-reader
testing was explicitly waived by the user and remains unperformed; automated
browser checks continue through the existing preparation gate.

Local final `check` passed: lint/format, module boundaries, SDK/native builds,
TypeScript and Svelte types, 239 tests / 3,367 assertions, 132 documents / 578
relative links, installed public SDK/classic/declarations and 297 installed Node
CLI checks. File/permission signals and whitespace checks also passed. The first
run stopped at the stale CLI version assertion; the corrected full run passed.

The owning contracts are [release](../ops/release.md),
[compatibility](../sdk/compatibility.md) and [VALIDATION](../../VALIDATION.md).
SDK and ops-change procedures apply. No API, DB or repository hygiene changes are
introduced. Browser automation also followed the Playwright procedure for public
npm-page inspection, without changing npm settings or requesting account MFA.

## Actual Hosted Results

Source `932b5830b5fa0b281702f6025fd58810b945b426`, tree
`16199dca4e8a76cc60effc0f3f2322e69a292a9f`, passed
[main CI 38263371846](https://github.com/0disoft/banora/actions/runs/38263371846)
and [preparation 38263371426](https://github.com/0disoft/banora/actions/runs/38263371426).
The retained candidate has 149 files, nine gates, Bun 1.4.3 / Node 24.21.0 and
manifest SHA256 `70060a2b9814ed75ef46abaa0575681c39ee640ae7ba2489742d3d4ac4b4126d`.
Artifact `11753652271` has Actions archive digest
`fda185403239bc6568af4160c5ce4e2de85a062956dcbac93513eec0c02fc22d`.
The downloaded manifest and complete inventory were independently verified.
All 98 retained browser-SDK files match the original published candidate byte
for byte. The updated installed-CLI test also passed 297 checks against that
original `0.1.0-dev.0` bundle, rather than assuming compatibility from new source.

[Publication 38264045296, attempt 6](https://github.com/0disoft/banora/actions/runs/38264045296/attempts/6)
passed protected publication and independent health. Attempts 1-5 each uploaded
one new package successfully but stopped at `registry-version`, with
`npmExitStatus: 0`, because metadata remained missing beyond the old ten-second
window. Those unsuccessful receipts are retained and not relabeled as successes.
Fresh public version/integrity/`dev` observations preceded each explicit resume.
No upload was repeated: the final attempt confirmed all five as `already-published`.
Environment approvals used the owner's delegated release authority and normal
required-reviewer endpoint; no protection or publisher setting was disabled.

Publication receipt artifact `11754139743` and health receipt `11755430317` were
downloaded and checked. The health receipt reports `registry-sdk`, `registry-cli`
and `registry-adapters`, using fresh canonical registry tarballs checked against
reviewed SHA256/SHA512, independent installed consumers and final channel checks.
All five are `0.1.0-dev.1` on `dev`, while `latest` remains `0.1.0-dev.0`.

Public signed-out npm pages for all five new versions display corrected published
installation, with no obsolete unpublished claim; SDK also shows Quick Start and
the public documentation links. The default SDK page still displays the old
`latest` version's README. This correction is available through explicit `@dev`
and version-page selection, not an implicit stable-channel promotion. Already
installed old README files are immutable and are not silently replaced.

## Publication Confirmation Follow-up

The private publisher now allows at most eighteen additional metadata reads,
ten-second waits and a three-minute elapsed confirmation budget after a successful
upload. Its existing per-request timeout and 20-minute job deadline remain.
Elapsed time is checked between reads; this is not cancellation of an in-flight
request. Failed uploads/provider reads and hash/channel conflicts still stop
immediately. Uploads are never retried. Regression coverage simulates seven stale
observations before success, permanently missing metadata and slow reads that
exhaust elapsed time without reaching the count cap. Tests use a private clock
and nonwaiting fixture, so no real polling or publication occurs in tests.
The new window is not yet proven by another live new-version upload; the completed
release used the previous tool. No duplicate version is published to test it.
Final focused release/channel/CI validation passed 29 tests / 412 assertions,
typecheck, lint/format, docs/relative links, boundaries, whitespace and
file/permission signals. This private change selects existing main `check` and
file signals, without a browser job or extra release preparation. No distributed
package bytes or package versions change in this follow-up.
The installed-CLI smoke also binds package identity/version to current source or
the verified retained manifest, separately from executable/installed metadata
agreement. Old reviewed candidates remain testable without weakening version
binding to a self-consistent but unintended package.
Both current-source and original retained CLI installations passed 298 checks
after that final binding assertion was added.

## Actual Previous-version Preflight

After the new cohort was visible, the existing read-only channel tool inspected
the original reviewed `41e0e897a250674d71ed89e5a41c4fb8429072bc` bundle with manifest
`d40ad9ba0cee77a917b06ad8c18d4a22205f2a0944c6994de4491814f7fb6332`, expecting current
`dev` to be `0.1.0-dev.1`. Two complete-family observations matched original target
integrity and current tags. It returned `rollback-plan`, five argument arrays and
`olderCommonVersions: ["0.1.0-dev.0"]`. No array was executed or tag changed.
The ignored receipt `.artifacts/channel-preflight-932b-dev1-to-dev0.json` has SHA256
`a80fb7bf010e4036d6e9eca55b0892fff713f63e3a2aa9092c50b5967c76ac3e`.
This now uses a real previous SDK release; actual channel mutation, freshly
installed target health immediately before mutation and host/data rollback remain
separate unperformed gates. Earlier [no-change evidence](23-channel-preflight-execution-evidence.md)
remains an accurate historical observation.
