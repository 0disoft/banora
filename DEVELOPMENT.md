# Development

- Status: Active SDK implementation; local checks configured in [VALIDATION.md](VALIDATION.md)
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
Node 24 LTS, React 19, Vue 3 and Svelte 5; current consumer evidence is documented
in [compatibility](docs/sdk/compatibility.md).
The common SDK uses the local development name `@banora/sdk`; it is unpublished.
Bun's test runner and root scripts are configured. The optional `@banora/react`,
`@banora/vue` and `@banora/svelte` packages export Board/Viewer and state bindings.
Svelte ships native component artifacts with isolated TypeScript 6.x packaging;
the SDK and root continue using TypeScript 7.x.

Keep the workflow usable on Windows and Unix-like environments. Provide package
scripts for actual development/build/validation tasks; Make is not required.
Do not publish command examples that refer to missing scripts or packages.

## First Implementation Slice

The initial Studio workflow is now runnable with `bun run dev`. `bun run check`
validates packages, types and the SDK packed consumer; `bun run smoke:browser`
validates production Studio/viewer and framework flows, including touch emulation.
`bun run smoke:adapters` verifies independently installed tarballs and each
framework's server rendering of host containers/state text. See
[implementation evidence](docs/engineering/08-implementation-status.md) for scope
and the remaining release work. SDK changes require rebuilding its artifacts before
the examples consume them; the examples do not alias SDK exports to source files.

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

Use the root Bun scripts in VALIDATION.md. Tooling is Bun 1.x, TypeScript 7.x and
Vite 8.x, with Node 24.x as the initial headless consumer target. No hosted CI
has been configured. Unconfigured checks are skipped, not reported as passing.

## Release Readiness

Before publishing, establish MIT licensing and asset provenance, actual package
exports/types, tested runtime versions, consumer examples and migration policy.
The user's implementation delegation authorizes SDK and example development.
Package publication and hosted deployment are separate actions. See the
[implementation status](docs/engineering/08-implementation-status.md) for evidence.
