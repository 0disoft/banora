# Banora SDK

- Status: Core, SGF, controller and board implemented; later contracts planned; unpublished
- Technical owner: UNASSIGNED

## Sources of Truth

- [Product specification](../product/02-spec.md): feature requirements and milestone scope.
- [Public API](public-api.md): consumer contract direction and failure/lifecycle behavior.
- [Compatibility](compatibility.md): packaging, runtime support and migration policy.
- [ADR 0001](../adr/0001-initial-architecture-boundaries.md): technology and module boundaries.
- [ADR 0003](../adr/0003-studio-first-consumer.md): Studio and the first consumer workflows.
- [ADR 0004](../adr/0004-framework-independent-adapters.md): official React, Vue, and Svelte targets.
- [ADR 0005](../adr/0005-initial-api-record-and-package-contracts.md): initial API, editing/export and package contracts.
- [Validation](../../VALIDATION.md): stable validation names and reporting.

## Consumption Modes

1. Embed a complete viewer in a plain web page.
2. Compose board/rules, records, renderer and controls in an application.
3. Mount an optional React, Vue, or Svelte component bound to the same controller/model.
4. Use the headless core and records in Node.js without browser globals.
5. Attach scoring, puzzles or analysis adapters when their milestones ship.

## Consumer Examples

Start with Banora Studio at `examples/studio`: an SGF review/basic editing
application and future hosted demo, consuming only built public SDK exports. Verify the
load/navigate/create-variation/comment/mark/download/reopen workflow against the
built package. Studio-specific private hooks and internal SDK source imports are
not acceptable consumer validation.

The read-only example at `examples/readonly` and an isolated tarball/headless consumer
are implemented. Browser flows have production-build evidence on Chrome 154.
Add official React, Vue, and Svelte adapter examples in M2, with each
consuming its actual public package/component artifacts. Add puzzle/AI examples as their milestones
ship. This second browser workflow prevents the SDK API from becoming editor-specific.

All framework adapters are optional. Plain browser consumers require no framework;
framework consumers share the same state/actions and rendering behavior. Each adapter
handles only host lifecycle, configuration and event/state bindings. Supported peer
versions, component packaging and SSR behavior require framework-specific evidence.

## Release Boundary

Plan one common SDK package and three separate optional adapter packages in this
repository. Initial targets are Node 24 LTS, React 19, Vue 3 and Svelte 5; tested
support outside the recorded evidence is pending. The common SDK's development
name/exports are implemented; adapter symbols/names, browser floors and framework
peer/compiler minimums remain UNDECIDED. No installation snippet should imply an available package until a
release exists. Published packages must include type declarations, license files,
asset notices, documented exports and actual consumer validation.
