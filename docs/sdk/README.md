# Banora SDK

- Status: Planned contract; no package published or API implemented by this design
- Technical owner: UNASSIGNED

## Sources of Truth

- [Product specification](../product/02-spec.md): feature requirements and milestone scope.
- [Public API](public-api.md): consumer contract direction and failure/lifecycle behavior.
- [Compatibility](compatibility.md): packaging, runtime support and migration policy.
- [ADR 0001](../adr/0001-initial-architecture-boundaries.md): technology and module boundaries.
- [ADR 0003](../adr/0003-studio-first-consumer.md): Studio and the first consumer workflows.
- [Validation](../../VALIDATION.md): stable validation names and reporting.

## Consumption Modes

1. Embed a complete viewer in a plain web page.
2. Compose board/rules, records, renderer and controls in an application.
3. Mount an optional React component bound to the same controller/model.
4. Use the headless core and records in Node.js without browser globals.
5. Attach scoring, puzzles or analysis adapters when their milestones ship.

## Planned Examples

Start with Banora Studio at `examples/studio`: an SGF review/basic editing
application and planned public demo, consuming only public SDK exports. Verify the
load/navigate/create-variation/comment/mark/download/reopen workflow against the
built package. Studio-specific private hooks and internal SDK source imports are
not acceptable consumer validation.

Also provide a minimal read-only browser embedding example and a headless consumer
example in M1. Add the React example in M2 and puzzle/AI examples as their milestones
ship. This second browser workflow prevents the SDK API from becoming editor-specific.

## Release Boundary

Exact public symbols, package names/exports and runtime support versions are
UNDECIDED. No installation snippet should imply an available package until a
release exists. Published packages must include type declarations, license files,
asset notices, documented exports and actual consumer validation.
