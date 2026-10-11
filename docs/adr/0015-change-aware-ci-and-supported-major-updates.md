# ADR 0015: Change-Aware CI and Supported-Major Updates

Status: accepted; hosted run/branch protection remain separate evidence.

## Decision

Use the existing GitHub repository and Bun package scripts for CI. One Ubuntu job
shares a checked commit/path planner and serial runner with local development.
Docs do not pay for builds or browsers; known optional modules select focused
scenarios; shared/unknown changes fail safe to full consumer evidence. Keep manifest
changes behind installed SDK/CLI/adapters/starter and production browser checks.
The planner is tested for combined scopes, invalid/missing comparisons and actual
script existence. All runner commands stop on failure.

Use public major action tags with same-major updates, Bun 1.x/Node 24, frozen
lockfile installation and package-download caching. Do not reuse build artifacts
across changes. Workflow permissions are read-only and checkout credentials are
not persisted. Security signals run for every change; registry audits run for
dependency changes and once monthly, failing on service errors.

Dependabot's supported Bun text-lockfile ecosystem creates a bounded monthly
minor/patch update candidate within existing majors. Action majors and package
major promotions remain explicit reviewed changes. Do not auto-merge a candidate
or infer hosted execution/branch protection from committed YAML.

## Alternatives and Consequences

A full matrix for every Markdown change wastes runner time. Diff filters that
silently ignore unfamiliar paths can miss regressions; unknown/empty diffs use
full checks. Separate CI-only command copies drift from the contributor workflow;
the same planner/runner uses actual package scripts on both paths.

Permanent patch pins lose same-major fixes. Unbounded latest versions bypass
compatibility decisions. Major ranges plus reviewed lockfiles distinguish stable
tool policy, reproducible dependency inputs and intentional compatibility changes.
GitHub Actions major tags follow the user's update policy; token/credential limits
reduce authority but are not a security sandbox against arbitrary PR code.

The repository does not need a build farm, hosted service, production secrets or
engine/model installation for core CI. [CI policy](../ops/ci.md) owns the precise
routes, security limitations, costs and failure handling.
