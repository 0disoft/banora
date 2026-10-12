# Published Package README Correction

Status: intentional `0.1.0-dev.1` source candidate; hosted preparation and actual
publication are separate gates, not established by this document.

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
introduced. Publication results must be recorded after actual verification.
