# ADR 0022: Retained Release Artifacts

- Status: Accepted; local prepare/verify/restage tooling implemented

## Decision

Provide a repository-owned `release` Bun command without publication credentials
or a selected hosting platform. Require reviewed clean Git source and an intentional
five-package version train. Build once, retain tarballs and production browser files
outside normal cleanup, inventory their bounded bytes, and run installed/browser
checks against those exact artifacts before changing candidate state to prepared.

Keep the manifest closed and versioned, with source commit/tree, actual supported
tool versions, complete SHA-256 inventory and nine required checks. Explicit
`--release-bundle` selects reviewed test input; default smoke behavior is unchanged.
Checks run serially with fixed failures and scoped child/browser timeout cleanup.
A reused prepared bundle reports reuse instead of implying a new security audit.

Verify without executing. Restore by exclusively copying to a fresh isolated
directory, then rechecking both original and copy. Preserve candidates, damaged
input and failed restaging for diagnosis rather than silently rewriting/deleting.
The local manifest is unsigned; integrity does not authenticate an unknown bundle.
Hosts own deployment selection, credentials, health checks, data migrations and
actual remote rollback. Release handoff must establish missing support/security
access before publication.

## Alternatives and Consequences

Rebuilding after checks can publish different bytes. Treating schema validation or
a fake local active pointer as deployment would give misleading rollback evidence.
Automatically uploading, pruning or downgrading browser data would exceed these
operations and risk losing the only recovery copy. Per-commit retained artifacts
use local disk, need independent backup, and do not prove byte-reproducible builds
across tools/platforms. Existing prepared artifacts remain immutable by convention
and tampering is detected on verification, not prevented by filesystem permissions.

## Validation and Owners

Maintainers own source/artifact correctness and retention; host operators own live
applications. Tests cover strict schema, candidate/prepared distinction, traversal,
duplicates, missing/modified/extra files, directory links, source preservation,
isolated restoration, actual Git cleanliness and failed/timed-out subprocesses.
Clean-source preparation must also run the actual public artifact, framework,
browser, starter and recovery gates before runtime success is recorded.
See [release](../ops/release.md) and [rollback](../ops/rollback.md).
