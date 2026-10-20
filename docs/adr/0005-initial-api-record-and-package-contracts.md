# ADR 0005: Initial API, Record Editing and Package Contracts

- Status: Recorded design baseline; scoped API/package/consumer evidence in the
  [delivery audit](../engineering/10-delivery-audit.md)
- Date: 2026-10-10
- Technical owner: UNASSIGNED
- Extends: [ADR 0001](0001-initial-architecture-boundaries.md) and [ADR 0004](0004-framework-independent-adapters.md)
- Contract owners: [Specification](../product/02-spec.md), [public API](../sdk/public-api.md), [compatibility](../sdk/compatibility.md)

## Context

The Studio-first workflow needs predictable ownership, SGF preservation, editing
history and export behavior. Official framework adapters also need a package and
runtime boundary before source implementation begins.

## Decision

1. A controller owns the active record, selected node and edit history. Consumers
   issue commands and subscribe to read-only state/change events. Coordinates are
   zero-based `{ x, y }`, with the origin at the top-left; colors are `'black'`
   and `'white'`. Illegal moves return structured reasons without changing state.
   View disposal releases its resources without disposing an externally supplied
   controller. Exact implemented symbols/signatures are owned by the public API.
2. Initially target SGF FF4 for Go. Prioritize moves/pass, setup stones, branches,
   comments, player/game metadata, labels and shape markers. Decode file bytes
   according to the declared encoding; string input is already decoded. Export
   UTF-8 and preserve unknown properties through supported edits. Preserve record
   semantics rather than original formatting. Unsupported encodings or unrecoverable
   errors produce diagnostics and retain the active record. The supported encoding
   list, absent-encoding policy and property/size limits are now recorded in SDK
   compatibility; additional corpus coverage remains separate evidence.
3. Separate previous/next/branch navigation from edit Undo/Redo. Creating a
   variation and changing comments or markers are undoable edits; navigation adds
   no edit history entry. Group a comment editing session as one undo unit. Branch
   navigation still reconstructs the correct rule-relevant position history.
4. Before replacing or closing a dirty record in Studio, offer Export, Discard
   or Cancel. Dirty state compares semantic record content with its export baseline;
   Undo returning to that baseline clears it. Import initializes a clean baseline
   and successful export advances it. Navigation does not make a record dirty.
   Failed or cancelled exports retain the previous baseline and active record.
   Compare immutable trees exactly, skipping identical subtrees/property maps and
   reusing the existing per-node semantic normalization for changed properties.
   Keep the immutable baseline/ticket record instead of a duplicate full signature;
   IDs/formatting remain excluded while collection order, branch order and shape
   remain significant. A weak baseline-only token cache avoids repeated normalization of separately
   parsed checkpoint baselines and resets on baseline replacement. No hash is used.
   A download request cannot prove a file was saved to disk; host export acknowledgment
   uses explicit `prepareExport`/`acknowledgeExport` tickets. Autosave and recovery
   are deferred. Hosts own this
   confirmation UI; the SDK exposes the state and operations needed to implement it.
5. Use one repository containing one common SDK package and three separately
   packaged optional adapters: React, Vue and Svelte. M1 ships the common SDK;
   M2 adds adapters. Their native artifacts/types and dependencies are isolated,
   especially Svelte component packaging. Initial compatibility targets are Node
   24 LTS, React 19, Vue 3 and Svelte 5. Follow stable updates within each selected
   major and promote new majors after consumer checks. Headless core/records can
   run server-side; board views mount on the client. Server-rendered board HTML
   and hydration are deferred. Targets do not establish tested compatibility.

## Rationale and Consequences

A shared controller prevents divergent framework behavior. Separate navigation
and editing history make review predictable without losing changes. Semantic SGF
preservation and export baselines support a useful local editing loop without
claiming exact source-file preservation or verified disk persistence.

One common package avoids splitting every logical module into a release unit.
Separate adapters accommodate framework-specific peer dependencies and artifacts.
Checks and releases should cover changed packages and their affected consumers,
without repeatedly running an unrelated four-package matrix.

Implemented local package names/exports, declared peers/compiler artifacts, tested
versions and executable commands are recorded in SDK contracts and VALIDATION.md.
Broader browser floors and registry/release ownership remain open. This design
baseline does not itself perform publication or deployment; current implementation
evidence belongs to the delivery audit.

## Validation Before Support Claims

Exercise built public artifacts in Studio, a read-only browser consumer and a
Node headless consumer. Cover SGF preservation/encoding failures, edit Undo/Redo,
dirty baselines and Export/Discard/Cancel. Validate each framework's lifecycle,
types/native artifacts and server-import/client-mount boundary when it ships.

## References

- [SGF FF4 specification](https://www.red-bean.com/sgf/sgf4.html).
- [Node.js release lifecycle](https://nodejs.org/en/about/previous-releases).
- [Svelte component packaging](https://svelte.dev/docs/kit/packaging).

These references inform the design; they do not validate Banora's implementation.
