# ADR 0014: Development Bootstrap and Boundary Gates

Status: accepted; validation evidence is recorded in the readiness review.

## Context

The SDK has an established Bun/Node workflow and a reviewed lockfile, but a fresh
contributor had no executable environment check, safe artifact cleanup or source
dependency gate. Written boundaries and successful packed consumers do not prevent
new source imports from bypassing the public SDK or mixing framework dependencies.

## Decision

Use `mise.toml` to declare Bun 1 and Node 24. These are supported-major prefixes,
not permanent patch pins. [mise](https://mise.jdx.dev/getting-started) installs the
tools; `mise exec -- bun run setup` validates stable tool majors and installs the
reviewed dependency graph with `bun install --frozen-lockfile`. Existing compatible
tools can run `bun run setup` directly. Installing dependencies does not build,
start a server, publish packages or request credentials.

`doctor` reports tool/lockfile/dependency availability without changing state.
`commands` reads the actual root scripts as JSON. `clean` previews a fixed list of
generated artifact directories; `clean --apply` validates all real paths first,
refuses symbolic links/junctions and preserves source, dependencies and SGF files.
Stop local servers/builds before applying cleanup.

Classify every SDK source module in `config/module-boundaries.json` as core,
headless or browser. Core can import only core; headless runtime imports cannot
depend on browser modules. SDK runtime imports stay inside SDK source; example
and adapter runtime imports use public package exports; each framework adapter
depends on its own framework only. Bun's native import scanners cover static
imports/reexports, literal dynamic imports and literal CommonJS calls, including
Svelte script blocks. This source gate is supplemented by strict declarations and
installed ES2022-only/SSR consumers. It is not a general TypeScript AST, security
sandbox or proof about arbitrary computed imports/type-only syntax.

Oxlint rejects eval, implied eval, Function construction and debugger statements.
Source files above 40 KB produce refactoring candidates, not automatic failures:
size alone does not justify a mechanical split. New modules require an intentional
classification. The gate runs before builds in `check`; changed-area CI will reuse
the same command.

## Alternatives and Consequences

Shell-only setup/cleanup would duplicate Windows and Unix behavior. A second package
manager or mandatory container would expand the development/runtime surface. Bun
implements the executable tasks; mise remains an optional tool installer.

A regex-only import detector would misread comments/strings; a new parser dependency
would duplicate the installed toolchain. Native scanning plus existing packed/type
checks provides a focused gate without SDK runtime dependencies. Future nonliteral
module loading requires an explicit design review rather than a coverage claim.

The lockfile reproduces package inputs; supported tool majors may resolve different
patches over time. Record actual versions with `doctor` in verification evidence.
Updates remain separate reviewed changes and do not rewrite ranges during setup.
