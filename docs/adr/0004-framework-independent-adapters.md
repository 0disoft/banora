# ADR 0004: Framework-Independent SDK and Official Adapters

- Status: Recorded design baseline; implementation pending
- Date: 2026-10-10
- Technical owner: UNASSIGNED
- Product scope: [Specification](../product/02-spec.md)
- Delivery sequence: [Roadmap](../product/01-roadmap.md)
- Extends: [ADR 0001](0001-initial-architecture-boundaries.md) and [ADR 0003](0003-studio-first-consumer.md)

## Context

The SDK was designed around a framework-independent core/controller, but the
initial documentation emphasized React and left Vue/Svelte as possible extensions.
Banora should serve consumers of all three without coupling its game behavior or
renderer to one application framework.

## Decision

1. Keep core/SGF headless and the shared browser controller/renderer independent
   of React, Vue and Svelte. Plain browser usage is the M1 foundation.
2. Treat React, Vue and Svelte as official optional adapter targets for M2, with
   equal access to the shared board/record functionality. Support is not claimed
   until each adapter's runnable consumer and packaging are validated.
3. Implement thin adapters over public mount/update/dispose, actions, events and
   read-only state. Adapters handle framework lifecycle/configuration bindings,
   not game rules, record duplication or a second SVG implementation.
4. Define renderer DOM ownership: the framework owns the mount container and
   surrounding UI; the SDK owns its internal drawing subtree. Never let both
   systems reconcile the same SVG children concurrently.
5. Isolate framework dependencies and native component artifacts from the core
   and other adapters. Decide subpath/separate-package layout and peer/compiler
   ranges with actual consumer builds; do not assume the plain JS build is enough
   for every framework's component distribution.
6. Validate each adapter's update propagation, subscriptions, remount/cleanup,
   types/artifacts and SSR/client-mount boundary independently.

## Rationale and Tradeoffs

Shared rules, records and rendering avoid divergent behavior and repeated feature
implementations. Native wrappers make integration convenient without requiring a
UI framework for simple consumers. Studio remains the framework-independent first
consumer and the read-only example guards its general embedding surface.

Three wrappers add lifecycle/compiler/version maintenance. Limit them to shared
functionality and focused real-consumer checks. Exact exported components/hooks,
framework versions and SSR guarantees remain UNDECIDED until implementation.
Web Components or additional framework adapters are not required by this decision.

## Official Integration References

- [React: effects and external widgets](https://react.dev/reference/react/useEffect).
- [Vue: Composition API lifecycle](https://vuejs.org/api/composition-api-lifecycle.html).
- [Svelte: lifecycle hooks](https://svelte.dev/docs/svelte/lifecycle-hooks).
- [Svelte: component packaging](https://svelte.dev/docs/kit/packaging).

Use these to design native lifecycle and package behavior. Reference documentation
does not establish Banora compatibility or an implemented adapter.
