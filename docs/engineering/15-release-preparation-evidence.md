# Retained Release Preparation Evidence

Status: scoped local tooling and clean-source preparation executed. This is not
publication, hosted rollback or all-72 completion.

## Implementation and Initial Checks

The repository `release` command prepares a clean commit's five packages and
production browser examples, verifies their inventory and restages reviewed
prepared bundles into a new isolated directory. Installed/browser smoke runners
can select exact retained bytes through `--release-bundle`. Normal cleanup preserves
the ignored `.artifacts` directory; documentation discovery excludes generated
retained artifacts. The [release](../ops/release.md), [rollback](../ops/rollback.md)
and [ADR 0022](../adr/0022-retained-release-artifacts.md) own behavior and limits.

On October 12, 2026, initial local validation passed root `check`: lint/format,
module boundaries, SDK/adapter/CLI builds, root/Svelte types, 193 tests with 2,707
assertions, 115 documents/407 relative links, public SDK/classic declarations and
installed Node CLI's 222 checks. Security file/permission signals passed 338 files;
this is not a complete security scan. Actual preparation on the dirty checkout
rejected with the fixed `source` error before starting checks or creating a bundle.

Four release tests exercise closed candidate/prepared schemas, bounds/traversal/
duplicates, altered/extra files, linked directories, exclusive source-preserving
restaging, actual Git state and failed/timed-out subprocess cleanup. Integrity
fixtures are authored non-executable test bytes, not claimed package evidence.

## Clean-Source Execution

Actual preparation on October 12 succeeded at commit
`2b8b67ed33c026db6d32ea1140f34bafe11de97b`, tree
`7d5b76e70fffdd214179fa5fa839ef3de1f6120b`, Bun 1.4.2/Node 24.14.0 on Windows x64.
It retained five `0.1.0-dev.0` tarballs and 149 total files, then completed `check`,
`security-files`, `security-deps`, `sdk-archive`, `cli-archive`, `adapter-archives`,
`browser-bundle`, `starter-archive` and `recovery-drill`. These are executed results,
not inferred from the manifest schema. The installed SDK/classic/CLI, independent
React/Vue/Svelte types/SSR, complete production browser and standalone starter used
the retained real artifacts. The root check included 193 tests/2,707 assertions;
dependency audit passed at preparation time. The browser exercised Studio recovery,
search/help, languages, navigation/edit/export/reopen, framework lifecycle and the
optional display/interaction consumers using the retained production files.

Actual prepared-bundle verification succeeded. Restoration created a distinct
directory and verified both its 149 files and the preserved original. A second
clean-source prepare returned `reused: true` without executing gates again, as
documented. These ignored local files are runtime output, not committed design
evidence or a public distribution. The source remains identified separately from
later documentation commits.

The actual restaged bundle passed a separate verification and installed Node CLI
run with 222 checks. This tests usable copied package bytes rather than treating
copying alone as successful restoration.

## Remaining Scope

Unsigned hashes do not authenticate unknown artifacts. A restaged copy of the
current version is not evidence of a distinct older release or a remote rollback.
No registry upload, host selection, credentials, public/private reporting channel,
DB/schema change, package version bump or physical-device test is included.
Private reporting, remaining migration/automation work and the full current-source
requirement-by-requirement audit remain active readiness work.
