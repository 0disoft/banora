# Roadmap

- Status: Planned; no milestone completed
- Source of truth for capabilities: [Product specification](02-spec.md)

Milestones establish delivery order, not release dates or completed functionality.
Each implementation task should produce a small usable increment and a focused
commit. Exact package versions remain UNDECIDED.

## M1: Embeddable Board and Game Viewer

- Headless TypeScript board and rules engine: captures, suicide policy, simple ko,
  pass, setup positions, and undo/redo.
- SVG board with standard sizes, coordinates, themes, labels, shape markers,
  partial-board views, placement preview, and keyboard/pointer input.
- SGF parsing and serialization, game metadata, comments, variations, and history
  navigation; preserve unrecognized properties semantically.
- Responsive viewer with navigation controls, branch selection, and file loading.
- Framework-independent integration and a React adapter example.
- ESM/type distribution and browser script example once build tooling is added.

**Exit evidence:** a consumer can load a real SGF, navigate a branch, play a legal
move, undo it, and export the record without losing covered properties or branches.
Headless imports work without a DOM, and the viewer works in the tested desktop
and mobile browser matrix. Establish the MIT license and bundled asset provenance.

## M2: Editing, Teaching, and Sharing

- Variation editing, free stone setup, lines, arrows, and freehand annotations.
- Board rotation/reflection, animation, custom stone textures, and magnified
  touch placement with optional confirmation.
- Side-by-side variation comparison with changed intersections highlighted.
- PNG/SVG export, static diagrams, and links to a position or record node.

**Exit evidence:** editing preserves the original record's supported metadata and
unknown properties; visual transforms never change logical move coordinates.

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
specific limitation in rendering or computation. Vue/Svelte adapters and managed
storage, AI, or collaborative services are candidates after the basic SDK is useful.

## Delivery Constraints

Do not turn M1 into a full game platform. Run checks that cover the changed risk,
batch validated pushes and release work, and expand verification only when a new
change or unresolved failure warrants it. Broad compatibility claims require
consumer evidence rather than successful internal compilation alone.
