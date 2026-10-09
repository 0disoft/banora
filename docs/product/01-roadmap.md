# Roadmap

- Status: Planned; no milestone completed
- Source of truth for capabilities: [Product specification](02-spec.md)

Milestones establish delivery order, not release dates or completed functionality.
Each implementation task should produce a small usable increment and a focused
commit. Exact package versions remain UNDECIDED.

## M1: Banora Studio and Read-Only Embedding

- Headless TypeScript board and rules engine: captures, suicide policy, simple ko,
  pass, setup positions and rule-relevant history.
- SVG board with standard sizes, coordinates, themes, labels, shape markers,
  partial-board views, placement preview, and keyboard/pointer input.
- SGF FF4 Go parsing and UTF-8 serialization, metadata, comments, variations and
  history navigation; preserve unrecognized properties semantically.
- Banora Studio in `examples/studio`: responsive board, move controls, variation
  tree, comments panel, SGF drag-and-drop/example loading, and SGF download.
- Basic editing: play a continuation to create a variation, edit comments, and
  add/remove existing label and shape marker types on the selected node.
- Edit Undo/Redo separate from navigation, grouped comment edit sessions and
  semantic dirty/export baselines with Export / Discard / Cancel in Studio.
- A small read-only embedding example using the same public SDK exports.
- Framework-independent integration and one common ESM/type SDK package. Studio and examples
  consume built public exports with no imports from SDK internals.

**Exit evidence:** a user opens an SGF, navigates a variation, creates a continuation,
edits comments/markers, downloads the record, and reopens it with supported edits,
properties and branches preserved. Capture, illegal-move rejection and undo/redo
remain consistent. Studio supports mobile and keyboard operation in the declared
test matrix; navigation does not enter edit history or change dirty state, and
Undo-to-baseline and cancelled/failed export preserve the expected record state.
Read-only embedding and headless imports exercise the public package.
Establish the MIT license and bundled asset provenance. No account, cloud storage
or AI integration is needed to complete this flow.

## M2: Editing, Teaching, and Sharing

- Extended variation editing (removal/reorganization), free stone setup, lines,
  arrows, and freehand annotations beyond M1's continuation/comments/markers.
- Official optional React, Vue, and Svelte adapters/examples and browser script
  distribution after the framework-independent Studio and read-only workflows are usable.
  Each adapter is a separate package in this repository, targeting React 19,
  Vue 3 and Svelte 5, with support claims contingent on consumer evidence.
- Board rotation/reflection, animation, custom stone textures, and magnified
  touch placement with optional confirmation.
- Side-by-side variation comparison with changed intersections highlighted.
- PNG/SVG export, static diagrams, and links to a position or record node.

**Exit evidence:** editing preserves the original record's supported metadata and
unknown properties; visual transforms never change logical move coordinates.
Each framework adapter consumes public SDK exports with the same board/record
behavior, handles updates and mount/dispose correctly, and is verified in a real
consumer build with its documented peer/compiler versions and SSR boundary.

## M3: Scoring and Curated Puzzles

- Explicit superko policies and named rule profiles with documented coverage.
- Manual dead-stone marking and rules-based score calculation, separate from
  uncertain position evaluation and external ownership estimation.
- Puzzle authoring/playback, accepted and rejected branches, scripted responses,
  hints, restart, and answer events.

**Exit evidence:** targeted fixtures cover the claimed scoring/repetition policies;
puzzle responses follow the authored tree and users can correct dead-stone choices.

## M4: External AI Analysis

- Provider-neutral analysis results and a KataGo JSON analysis adapter design.
- Suggested moves, win probability, score estimates, move loss, principal
  variations, and ownership/heatmap overlays.
- Request cancellation, position-based result matching, and explicit remote
  submission controlled by the host application.

**Exit evidence:** a delayed response cannot annotate a different position or a
destroyed view; provider errors leave local play and record editing usable.

## Evidence-Driven Extensions

Add Canvas rendering, workers, and Rust/WASM only after measurements show a
specific limitation in rendering or computation. Managed storage, AI, or collaborative
services are candidates after the basic SDK is useful. React, Vue, and Svelte adapters
are committed M2 design targets, not speculative extensions; support is claimed only
after their consumer validation is complete.

## Delivery Constraints

Do not turn M1 into a full game platform or a separately maintained editor product.
Studio is a consumer example and public demo of the SDK, with no private API shortcuts.
Run checks that cover the changed risk,
batch validated pushes and release work, and expand verification only when a new
change or unresolved failure warrants it. Broad compatibility claims require
consumer evidence rather than successful internal compilation alone.
