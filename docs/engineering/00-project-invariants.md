# Project Invariants

- Status: Implemented contracts with scoped evidence in the
  [delivery audit](10-delivery-audit.md)
- Source: [Product specification](../product/02-spec.md) and [ADR 0001](../adr/0001-initial-architecture-boundaries.md)
- Technical owner: UNASSIGNED

## Contract

1. Core transitions are authoritative; renderers and framework adapters never
   implement a competing game state or legality engine.
2. Core/SGF imports require no DOM, React, Vue, Svelte, provider client or persistent storage.
3. Invalid actions and failed imports preserve the previously active state/record.
4. Logical coordinates retain their meaning across display transforms and adapters.
5. Supported SGF workflows preserve semantic property values, comments and branches;
   unsupported behavior is diagnosed rather than silently erased.
6. Rule-profile claims describe implemented semantics and focused validation evidence.
7. Score calculation with confirmed dead stones is distinct from uncertain prediction.
8. AI results apply only to their current request/context and a live consumer session.
9. Disposal removes owned resources and invalidates late work without deleting
   host-owned records or disposing externally supplied controllers.
10. Local board/rules/record operations make no implicit remote calls or telemetry.
11. Optional module code and framework dependencies stay out of consumers that
    do not import them.
12. Shipped documentation/examples describe actual APIs and tested compatibility;
    design documents clearly identify planned work.
13. React, Vue, and Svelte adapters use the same public model/controller/renderer.
    Their lifecycle/reactivity code cannot introduce framework-specific game behavior
    or require consumers to install an unrelated framework.
14. Cursor navigation does not create edit Undo entries or mark a record dirty;
    edit Undo and rule-relevant repetition history remain separate.
15. Dirty state compares semantic record content with its export baseline. Undo
    returning to it clears dirty state; failed/cancelled exports preserve it.
16. Supported FF4 Go edits preserve unknown properties and export UTF-8. Declared
    input encoding failures are diagnosed without replacing the active record.

Use the [testing standard](05-testing-standard.md) and [SDK checklist](../../.agents/checklists/sdk.md)
to select evidence for the invariant affected by a change.
