# ADR 0023: Existing Publisher Package Identity

- Status: Accepted for local packaging; publication remains separate
- Date: 2026-10-12
- Product contract: [Specification](../product/02-spec.md)
- Distribution contract: [Compatibility](../sdk/compatibility.md)

## Context

The owner already publishes npm packages under the personal `@0disoft` scope.
The development-only `@banora/*` names were never published and do not establish
ownership of a second scope. Maintaining different local and public identities
would require rewriting package dependencies, import declarations and consumer
examples during publication.

## Decision

Use `@0disoft/banora` for the common SDK, and `@0disoft/banora-cli`,
`@0disoft/banora-react`, `@0disoft/banora-vue` and `@0disoft/banora-svelte`
for the optional packages. Apply those identities to source imports, workspace
metadata, peer dependencies, installed consumer checks and current instructions.
The executable remains `banora`; browser globals and public API symbols keep
their existing identities. The version remains `0.1.0-dev.0`.

Retained `banora.release/v1` bundles using the complete previous package family
remain verifiable and restorable without changing their manifests or tarballs.
Reject bundles mixing the old and new families. Execute old bundles with consumer
checks from their recorded source commit; current consumer checks use current
package names. Newly prepared artifacts use the current package metadata.

## Alternatives and Consequences

A separate `@banora` organization would need additional namespace ownership and
account administration. Unscoped package names would require independent name
availability rather than using the owner's established scope. Neither option
provides a current consumer benefit.

This local naming decision does not reserve registry names, configure package
trusted publishers, authorize an upload, or change repository visibility. Each
package needs its own configured publication authority. Existing unreleased
consumers must update their import specifiers and dependencies together; there
is no compatibility alias or already-published version to migrate.

## Validation

Run frozen setup and the root check, including installed SDK/CLI consumers; also
exercise installed framework types/SSR and the independently installed starter.
Verify a retained legacy bundle with the new verifier to preserve recovery.
Record executed results separately from these required checks.
