# Banora SDK

- Status: Common SDK and optional React/Vue/Svelte adapters implemented; unpublished
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
`examples/viewer` demonstrates the complete viewer, optional editing and ownership
preservation across unmount/remount.
`examples/browser` embeds the same viewer from the built classic global script.
Official examples at `examples/react`, `examples/vue` and `examples/svelte` each
consume their built public package/native components. Isolated tarball consumers
also check dependency isolation, declarations and real SSR. `examples/puzzle`
consumes the common headless session and complete puzzle view, including borrowed
ownership across remount. An AI example remains planned for M4. These browser
workflows prevent the SDK API from becoming editor-specific.

All framework adapters are optional. Plain browser consumers require no framework;
framework consumers share the same state/actions and rendering behavior. Each adapter
handles only host lifecycle, configuration and event/state bindings. Supported peer
versions, component packaging and SSR behavior require framework-specific evidence.

## Release Boundary

Use one common SDK package and three separate optional adapter packages in this
repository. Initial targets are Node 24 LTS, React 19, Vue 3 and Svelte 5; tested
support outside the recorded evidence is pending. The common SDK's development
name/exports and three adapter APIs are implemented; actual peers/artifacts and
tested versions are listed in compatibility. Broader browser floors remain pending.
No installation snippet should imply an available package until a
release exists. Published packages must include type declarations, license files,
asset notices, documented exports and actual consumer validation.
