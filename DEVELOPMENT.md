# Development

- Status: Implementation plan; no executable development workflow configured
- Technical owner: UNASSIGNED

## Sources of Truth

- [Product specification](docs/product/02-spec.md) and [roadmap](docs/product/01-roadmap.md).
- [Architecture decision](docs/adr/0001-initial-architecture-boundaries.md).
- [Public API](docs/sdk/public-api.md) and [compatibility](docs/sdk/compatibility.md).
- [Validation](VALIDATION.md) and [testing standard](docs/engineering/05-testing-standard.md).

## Planned Tooling

Use TypeScript for the SDK and SGF model, SVG/CSS for the initial renderer, Vite
for library/demo builds, and Bun for dependency installation and package scripts.
Add an optional React adapter. Exact tool versions, test runner, package layout,
and executable commands remain UNDECIDED until implementation starts.

Keep the workflow usable on Windows and Unix-like environments. Provide package
scripts for actual development/build/validation tasks; Make is not required.
Do not publish command examples that refer to missing scripts or packages.

## First Implementation Slice

Work toward the [M1 exit evidence](docs/product/01-roadmap.md): a consumer loads
an SGF, views the board and comments, selects a variation, plays/undoes a move,
and exports the record. Build the required core, record cursor, renderer and
viewer together rather than expanding every optional module first.

Keep shared logic free of DOM/framework imports. Define ownership and failure
semantics before publishing public signatures. Add a plain-browser viewer and
headless consumer example, then exercise the React adapter over the same state.

## Verification and Change Discipline

- Use small cohesive tasks and commits. Keep English design/API documentation in sync.
- Prioritize captures, ko, declared repetition policies, SGF preservation and state
  consistency over tests that merely reproduce implementation details.
- Run the narrowest checks covering a change. Documentation-only work needs link,
  consistency and whitespace review, not a full runtime suite.
- Measure relevant rendering/computation bottlenecks before adding Canvas,
  workers or Rust/WASM. Record measurements rather than assuming improvement.
- Batch validated pushes and release work to limit redundant CI runs. Configure
  only the CI jobs needed for actual consumer and release risks.
- Review dependency major upgrades against relevant examples and packed consumers.

The current ssealed runner is `none`. Stable validation names in VALIDATION.md
are reporting vocabulary, not executable scripts. Unconfigured checks must be
reported as skipped rather than treated as passing.

## Release Readiness

Before publishing, establish MIT licensing and asset provenance, actual package
exports/types, tested runtime versions, consumer examples and migration policy.
No source implementation, package publication or hosted service is authorized
by a design-document update alone.
