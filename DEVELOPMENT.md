# Development

- Status: Implementation plan; no executable development workflow configured
- Technical owner: UNASSIGNED

## Sources of Truth

- [Product specification](docs/product/02-spec.md) and [roadmap](docs/product/01-roadmap.md).
- [Architecture decision](docs/adr/0001-initial-architecture-boundaries.md).
- [First consumer decision](docs/adr/0003-studio-first-consumer.md).
- [Framework support decision](docs/adr/0004-framework-independent-adapters.md).
- [Initial API, record and package contracts](docs/adr/0005-initial-api-record-and-package-contracts.md).
- [Public API](docs/sdk/public-api.md) and [compatibility](docs/sdk/compatibility.md).
- [Validation](VALIDATION.md) and [testing standard](docs/engineering/05-testing-standard.md).

## Planned Tooling

Use TypeScript for the SDK and SGF model, SVG/CSS for the initial renderer, Vite
for library/demo builds, and Bun for dependency installation and package scripts.
Use one common SDK package in M1 and three separate optional React, Vue and Svelte
adapter packages in M2, all in this repository. Initial compatibility targets are
Node 24 LTS, React 19, Vue 3 and Svelte 5; actual consumer evidence is still pending.
Exact tool versions, test runner, npm names/exports, adapter artifact details and
executable commands remain UNDECIDED until implementation starts.

Keep the workflow usable on Windows and Unix-like environments. Provide package
scripts for actual development/build/validation tasks; Make is not required.
Do not publish command examples that refer to missing scripts or packages.

## First Implementation Slice

Work toward the [M1 exit evidence](docs/product/01-roadmap.md) through Banora Studio,
planned at `examples/studio`: load an SGF, navigate branches, create a continuation,
edit comments/markers, download it and reopen it with edits preserved. Build the
required core, record cursor, renderer and viewer together rather than expanding
every optional module first.

Implement navigation separately from edit Undo/Redo, group comment edit sessions,
and expose semantic dirty state with an export baseline. Studio needs Export /
Discard / Cancel before replacing or closing dirty records. Its SGF workflow targets
FF4 for Go, preserves unknown properties and exports UTF-8. See the specification
for failure behavior and remaining encoding decisions.

Keep shared logic free of DOM/framework imports. Define ownership and failure
semantics before publishing public signatures. Studio must use built public SDK
exports, not internal source imports, hidden hooks or a second game-state engine.
Exercise the same public package in a minimal read-only browser embedding example
and a headless consumer. Studio must not require any framework adapter. Add the
official React, Vue, and Svelte integrations with runnable consumers in M2.

Keep adapters thin: mount/update/dispose, subscriptions, host events and configuration
bindings use the same controller. Exercise each framework's remount/update behavior,
client-only DOM creation and actual package/type/compiler consumption before claiming
support. Framework component packaging must be validated separately from the plain
TypeScript build, especially for Svelte component artifacts.

The initial Studio interface is a board, move controls, variation tree and comments
panel. Keep account management, cloud persistence, AI and broader editor tooling
outside M1. Its public demo is planned; no hosting provider or deployment is selected
or implemented by this decision.

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
