# Development

- Status: M1-M4 implementation complete in scoped local evidence; see the
  [delivery audit](docs/engineering/10-delivery-audit.md) and [VALIDATION.md](VALIDATION.md)
- Technical owner: `0disoft` (solo maintainer)

## Sources of Truth

- [Product specification](docs/product/02-spec.md) and [roadmap](docs/product/01-roadmap.md).
- [Architecture decision](docs/adr/0001-initial-architecture-boundaries.md).
- [First consumer decision](docs/adr/0003-studio-first-consumer.md).
- [Framework support decision](docs/adr/0004-framework-independent-adapters.md).
- [Initial API, record and package contracts](docs/adr/0005-initial-api-record-and-package-contracts.md).
- [Public API](docs/sdk/public-api.md) and [compatibility](docs/sdk/compatibility.md).
- [Validation](VALIDATION.md) and [testing standard](docs/engineering/05-testing-standard.md).

## Implemented Tooling

For a new machine, install [mise](https://mise.jdx.dev/installing-mise.html) using
its platform installer (Windows: `winget install jdx.mise`), inspect `mise.toml`,
then run `mise install` and `mise exec -- bun run setup`. On macOS/Linux, follow
mise's official installer instructions; no project-specific shell installer is
required. Existing Bun 1.x and Node 24.x installations can use `bun run setup`.
Setup installs the frozen lockfile and reports tool/dependency availability.
Run `bun run check` once before editing; `bun run dev` starts the local consumers.

`bun run doctor` is read-only and reports actual tool versions. `bun run commands`
prints root scripts directly from `package.json`; it is the machine-readable
discovery route. `bun run clean` previews generated artifacts; after stopping dev
servers/builds, `bun run clean --apply` removes only the displayed allowlisted
directories. It never removes source, `node_modules`, lockfiles or local SGF files.
Linked artifact targets are refused before any deletion.

After `bun run build`, use `bun run ops --help` for safe operational commands.
`bun run ops recovery-check --input backup.banora.json` validates and actually
restores a checkpoint/Studio backup in isolation, without changing the input,
opening browser storage or emitting authored data. `bun run ops drill-recovery`
rehearses guarded recovery/Undo on the committed study fixture. See the
[operational contract](docs/ops/00-operational-contract.md) for scope and prerequisites.

`bun run perf --output .tmp/performance-report.json` rebuilds the SDK and measures
public synchronous operations in Node, with warm-up/five samples and correctness
checks on original/authored fixtures. Existing output files are refused. It does
not run automatically in CI or measure browser frames; see the
[performance evidence](docs/engineering/14-sdk-performance-evidence.md).

`bun run boundaries` validates classified SDK runtime dependency directions,
public consumer imports and framework isolation. Files above 40 KB are reported
as review candidates. Type-only/computed imports are not a source-scanner support
claim; installed declarations/headless/SSR checks remain required. See
[ADR 0014](docs/adr/0014-development-bootstrap-and-boundary-gates.md).

For an additional browser, install it explicitly with
`bun run browser:install firefox`, build examples once with
`bun run build:examples`, then run a focused scenario such as
`bun scripts/browser-smoke.ts --search-only --browser=firefox`.
The runner verifies the actual launched engine; Chrome remains the default.
For the broader desktop profile, run
`bun scripts/browser-smoke.ts --desktop-only --browser=firefox` against the same
build. Its 19 scopes and exclusions are defined in [validation](VALIDATION.md).
See [executed browser scope](docs/sdk/compatibility.md#executed-browser-scope) for
tested routes and the limits of other engine/device combinations.

Use TypeScript for the SDK and SGF model, SVG/CSS for the initial renderer, Vite
for library/demo builds, and Bun for dependency installation and package scripts.
Use one common SDK package in M1 and three separate optional React, Vue and Svelte
adapter packages in M2, all in this repository. Initial compatibility targets are
Node 24 LTS, React 19, Vue 3 and Svelte 5; current consumer evidence is documented
in [compatibility](docs/sdk/compatibility.md).
The common SDK is published as `@0disoft/banora`, together with its optional CLI
and native adapters at `0.1.0`. See the
[initial release evidence](docs/engineering/27-initial-default-channel-release-evidence.md).
Bun's test runner and root scripts are configured. The optional `@0disoft/banora-react`,
`@0disoft/banora-vue` and `@0disoft/banora-svelte` packages export Board/Viewer and state bindings.
Svelte ships native component artifacts with isolated TypeScript 6.x packaging;
the SDK and root continue using TypeScript 7.x.
Common build also emits a self-contained classic script and its ambient declaration.
The `examples/browser` consumer uses that artifact without modules/frameworks.

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
and recorded release/compatibility limits. SDK changes require rebuilding its artifacts before
the examples consume them; the examples do not alias SDK exports to source files.

The [M1 exit evidence](docs/product/01-roadmap.md) is established through Banora Studio
at `examples/studio`: load an SGF, navigate branches, create a continuation,
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
Later scoring, curated puzzles and external analysis/display are implemented with
their own common SDK contracts and runnable consumers. Keep the same ownership,
public-package and explicit-provider boundaries when extending them.

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
Vite 8.x, with Node 24.x as the initial headless consumer target. The
[CI workflow](docs/ops/ci.md) configures one change-aware job; successful hosted
execution and branch protection are separate evidence. Unconfigured checks are
skipped, not reported as passing.

Use `bun run lint` and `bun run format` for read-only Oxlint/Oxfmt checks.
`bun run lint:fix` applies supported lint fixes; `bun run format:write` formats
supported source and documentation. Review the resulting diff. Keep React, Vue
and Svelte compiler/type/browser checks: linting component scripts does not replace
them. See [the tooling policy](VALIDATION.md#code-quality-tooling) for scope,
exceptions and dependency-update behavior.

## Release Readiness

Use `bun run migration-check` for the narrower saved-data matrix: public artifact
rebuild, checkpoint/backup restoration, supported legacy settings, interrupted
write/cleanup reopening and unknown-version preservation. This operates on authored
fixtures and isolated state, not a live profile. See
[migration operations](docs/ops/data-migrations.md) before changing a saved format.

Before publishing, establish MIT licensing and asset provenance, actual package
exports/types, tested runtime versions, consumer examples and migration policy.
The user's implementation delegation authorizes SDK and example development.
Package publication and hosted deployment are separate actions. See the
[implementation status](docs/engineering/08-implementation-status.md) for evidence.

Maintainers can prepare retained local artifacts with `bun run release prepare`
from a clean committed checkout. This runs full release gates against the retained
package/demo bytes. `bun run release verify --bundle DIR` verifies integrity;
`bun run release restore --bundle DIR` restages a prepared copy without deployment.
Normal cleanup preserves `.artifacts`. See [release](docs/ops/release.md) for
candidate/resume behavior, unsigned provenance and the separate publication handoff.
