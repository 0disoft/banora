# Implementation Status

This file tracks evidence against the complete [roadmap](../product/01-roadmap.md).
An implemented slice does not complete its milestone or establish untested compatibility.

## Current Evidence

- Common SDK: `packages/sdk`, local package name `@banora/sdk`, version `0.1.0-dev.0`.
  Names are development identifiers, not a claim of npm ownership/publication.
- Immutable headless board transitions: dimensions 2 through 52, rectangular boards,
  play, captures, pass, explicit suicide policy, simple ko and atomic setup.
- SGF FF4 Go: collections, ordered branches, setup/compressed points, comments,
  metadata, labels/shape marks, unknown properties and unedited escaping preservation.
  Text and declared-encoding file input; UTF-8 export; bounded iterative parsing.
- RecordController: shared immutable snapshots, path navigation, legal new moves,
  recorded-move playback, comments/markers, grouped edit Undo/Redo, semantic dirty
  comparison and explicit export tickets. Dirty replacement requires explicit discard.
- SVG board: themes/CSS tokens, coordinates, setup/capture display, move numbers,
  shapes/labels, crop, keyboard cursor, pointer/touch and ownership-aware disposal.
- Studio and read-only examples consume built public exports. The bundled original
  SGF supports local open/drop, navigation/branch creation, comments/markers,
  Undo/Redo, UTF-8 download/reopen and Export/Discard/Cancel record replacement.
- Production browser smoke passes on Windows Headless Chrome 154, including
  illegal-move rejection/capture, editing/reopen, preserved original branches and
  unknown properties, keyboard/touch emulation, crop, owned/external disposal and
  no implicit external requests/uploads. Screenshots are generated locally under
  `output/playwright/`, not shipped assets or evidence of real-device testing.
- Twenty-two focused behavior tests pass with Bun 1.4.2; strict TypeScript checks
  and Vite ESM/declaration builds pass. A separate tarball installation passes strict
  consumer typechecking and runs core/SGF/edit/export/reopen on Node 24.14.0.
- Tooling uses Bun 1.x, TypeScript 7.x and Vite 8.x, with the lockfile capturing
  resolved versions. Core has zero runtime dependencies. No hosted CI is configured.
- Root and package MIT license files cover original code/documentation.

## Remaining Delivery

1. M1: The initial end-to-end workflow has local evidence. A complete embeddable
   viewer convenience mount and final release audit remain; no package is published.
   Additional encoding/browser/screen-reader fixtures and performance baselines
   remain outside the current narrow compatibility evidence.
2. M2: Separate official React/Vue/Svelte packages, browser script, extended editing,
   teaching, transforms, diagrams and sharing. Not implemented.
3. M3: Explicit superko/profiles, scoring and authored puzzles. Not implemented.
4. M4: External analysis adapter, freshness/cancellation and overlays. Not implemented.

Publishing, hosting and external provider credentials remain separate operational
actions. Runtime support claims require actual consumer evidence; local tests do not
prove browser/framework compatibility. Future increments update this evidence table.

## Browser Limitations

Studio's custom Export/Discard/Cancel dialog applies to its record replacement
actions. Tab closing/reloading uses the browser's native unsaved-change warning;
the browser controls that dialog and may suppress it. Download initiation updates
the export baseline without proving persistence to disk. Autosave/recovery is deferred.
The tree shows the first 500 nodes plus the selected node; navigation still traverses
the complete record. Large-record editing cost needs profiling before speed claims.
