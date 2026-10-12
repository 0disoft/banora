# Registry Rollback-target Health

Status: private target-health tool implemented and locally verified. Actual old
registry downloads and installed consumers require separate execution evidence.

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

Existing main `check` and file signals cover isolated private-tool changes. There
is no extra job, schedule, browser installation or dependency audit. SDK and
ops-change procedures apply. Physical-device and screen-reader checks remain
explicitly waived/unperformed; they do not gate this terminal tool.

Owning contracts: [release](../ops/release.md#check-a-registry-rollback-target-before-moving-tags),
[rollback](../ops/rollback.md#registry-and-data-boundaries) and
[VALIDATION](../../VALIDATION.md). Public API, DB and repository hygiene are unchanged.
