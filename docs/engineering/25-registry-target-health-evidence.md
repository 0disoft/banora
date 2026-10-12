# Registry Rollback-target Health

Status: the real previous five-package release passed fresh registry downloads
and independent installed-consumer health while current `dev` remained unchanged.

## Gap and Ownership

Post-publication `registry-check` correctly requires the selected tag to match
every tested package version. It cannot test a previous version before moving
that tag. The [actual previous-version preflight](24-package-readme-correction.md#actual-previous-version-preflight)
already binds the original `0.1.0-dev.0` candidate against current `dev.1`, but it
does not download/install packages or mutate a tag. Rollback needs fresh target
installed-consumer health before any separately authorized channel operation.

The separate `registry-target-check` reuses source/hash-bound preflight and the
existing fresh registry-health pipeline. It reads only public npm metadata and
tarballs with isolated empty npm config, fixed canonical URLs, deadlines and
length/hash limits. After complete preflight, reviewed target bytes are downloaded
and checked with SHA256/SHA512 before test execution in independent installations.
Only an exclusive copy receives those fresh bytes; originals remain preserved.

All five tags must match the explicit expected current version before downloading
and after consumer execution. Target deprecation is checked again in both health
observations, so changes after preflight fail. The target receipt explicitly
separates current and tested versions. The ordinary publication-health gate remains
unchanged and rejects mismatched channels; a target check never weakens it.

The command rejects execute, stage, forward and unbound requests. It adds no
publisher permission, tag mutation, workflow, SDK export, package version or data
migration. Tested archive execution still requires reviewed provenance; unsigned
hashes do not authenticate an unknown bundle. No host-data rollback follows from
testing package bytes, and observations cannot lock the registry.

## Local Verification

Related channel/release/CI tests passed 31 tests / 500 assertions, alongside
typecheck and lint. The target fixture tests preserve old source bytes and current
tags, exercise complete-family download/check ordering, verify exclusive copies,
reject late tag/deprecation changes and retain ordinary health behavior. CLI
discovery and invalid target options use the existing fixed JSON envelope without
an npm executable in PATH. Tests use explicitly authored hash/provider fixtures
and mock consumer callbacks; they are not real npm or installed-package evidence.

Full local `check` passed 241 tests / 3,458 assertions, SDK/native builds, TypeScript
and Svelte checks, lint/format, module boundaries, 133 documents / 590 relative
links, installed SDK/classic/declarations and 298 installed Node CLI checks.
Whitespace and file/permission signals also passed.

## Actual Previous Registry Version Execution

With clean committed tool source `e54abfc8ac9fa39455f9f1ed0cc75303ac1608bc`, the
new command ran on the independently retained original published candidate:

```sh
bun run release registry-target-check \
  --bundle .artifacts/downloads/38211207226-channel-plan \
  --manifest-sha256 d40ad9ba0cee77a917b06ad8c18d4a22205f2a0944c6994de4491814f7fb6332 \
  --source-commit 41e0e897a250674d71ed89e5a41c4fb8429072bc \
  --tag dev --expected-current-version 0.1.0-dev.1
```

It completed at `2026-10-12T15:24:52.091Z` (October 13 in Korea), using the actual
published `0.1.0-dev.0` SDK, CLI, React, Vue and Svelte packages. Original source is
`41e0e897a250674d71ed89e5a41c4fb8429072bc`, tree
`60e50bd3984b8346caf7cbca6664a5e2d5a6d3bc`. Its original manifest still has 149
retained files, nine preparation gates and the unchanged hash above.

The two full-family preflight observations verified current `dev.1`, original
target identity/integrity/inventory, no deprecation and reviewed local bytes.
All five previous tarballs were then downloaded afresh from canonical public npm
URLs with no credentials or redirects. Length, SHA256 and SHA512 matched reviewed
bytes before any package test execution. Original manifests were preserved;
independent installations used fresh verified bytes in an exclusive restored copy.

Real `registry-sdk`, `registry-cli` and `registry-adapters` checks all completed,
covering public SDK/classic/types, actual installed Node CLI behavior and native
framework types/SSR consumers. These were not mock callbacks, a source rebuild or
reuse of the last goal turn's CLI-only installation. The complete family was
queried again after those checks, with `dev` still `0.1.0-dev.1` and target
deprecation absent. The successful receipt explicitly reports target `0.1.0-dev.0`
and expected current `0.1.0-dev.1`.

The ignored exclusive receipt `.artifacts/registry-target-health-e54abfc-dev0.json`
has SHA256 `9707b209102c23c7f128b60b080eb77659330e5f87131ea3e0ae4851cbd3c9c5`.
It stores the bounded command result and actual tool source/time, without provider
logs, credentials or authored records. Byte-bound original preparation/publication
evidence remains in [release history](18-release-tooling-execution-evidence.md).

## Remaining Boundaries

This closes fresh previous-version installed health before mutation. It is not a
tag switch, live channel rollback, arbitrary host compatibility or host-data
migration. A future mutation still needs independently authorized tag authority,
immediate fresh preflight and complete-family post-change verification. No npm
trusted-publisher connection or GitHub environment was changed. Default npm
installation still selects old `latest` and requires a separate release decision;
this tool does not repair those immutable historical README files.

Existing main `check` and file signals cover isolated private-tool changes. There
is no extra job, schedule, browser installation or dependency audit. SDK and
ops-change procedures apply. Physical-device and screen-reader checks remain
explicitly waived/unperformed; they do not gate this terminal tool.

Owning contracts: [release](../ops/release.md#check-a-registry-rollback-target-before-moving-tags),
[rollback](../ops/rollback.md#registry-and-data-boundaries) and
[VALIDATION](../../VALIDATION.md). Public API, DB and repository hygiene are unchanged.
