# Security Baseline

- Status: Implemented SDK/tooling baseline with bounded execution evidence

## Contract

The approved [root policy](../../SECURITY.md) owns threat boundaries, invariants
and reporting criteria for the SDK, CLI, adapters, reference consumers and release
tooling. Host authentication and tenant authority remain explicit integration
responsibilities; client read-only settings and state keys do not grant authorization.

The signal-only file/workflow gate, high/critical dependency audit, bounded input
validation and redacted diagnostic projection have executed evidence. These checks
are not an exhaustive vulnerability or historical secret scan. See
[readiness](12-readiness-review.md), [secrets](../ops/secrets.md) and
[compatibility](../sdk/compatibility.md) for their precise scope.

## Required Evidence

- Source of truth: [SECURITY.md](../../SECURITY.md)
- Owner: `0disoft` (solo maintainer)
- Validation: [VALIDATION.md](../../VALIDATION.md); file/workflow signals and
  dependency audit are separate from functional checks
- Related checklist: [security](../../.agents/checklists/security.md)

Public Issues and GitHub private vulnerability reporting are enabled and were
rechecked through the provider APIs on 2026-10-13 (Korea time). No hosted account
service, automatic report upload, response SLA or bounty is promised.

## Review Blockers

- A change bypasses the source of truth.
- A change weakens validation or hides skipped checks.
- A change lacks failure, recovery, security, performance, or test evidence where relevant.
