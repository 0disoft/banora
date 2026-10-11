# Retained Release Preparation Evidence

Status: scoped local tooling implemented; clean-source preparation execution is
pending in this increment. This is not publication, hosted rollback or all-72 completion.

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

## Remaining Execution and Scope

Commit the tooling before the positive clean-source exercise. Run preparation's
nine gates against the retained real packages/browser files, then verify and
restage the result; record actual output here rather than assuming success.
Unsigned hashes do not authenticate unknown artifacts. A restaged copy of the
current version is not evidence of a distinct older release or a remote rollback.
No registry upload, host selection, credentials, public/private reporting channel,
DB/schema change, package version bump or physical-device test is included.
Private reporting, remaining migration/automation work and the full current-source
requirement-by-requirement audit remain active readiness work.
