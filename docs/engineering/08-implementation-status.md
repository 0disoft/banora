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
  Scoped edit-group cleanup prevents disposed/read-only views from ending another
  editor's comment group; both headless and mounted-browser regressions are checked.
- Extended editing: undoable subtree removal and sibling reordering, free setup/turn
  with separate setup nodes after moves, and node-local SGF lines/directed arrows.
  Studio exposes these tools and confirms continuation removal. Headless checks
  cover cursor/ID restoration, collection retention and atomic limits/failures;
  production browser checks cover placement, direction, toggle, download/reopen,
  cancelled removal and Undo returning to the export baseline. Host-inherited CSS
  grid/stone colors are verified in computed styles.
- SVG board: themes/CSS tokens, coordinates, setup/capture display, move numbers,
  shapes/labels, crop, keyboard cursor, pointer/touch and ownership-aware disposal.
- Complete `mountViewer`: built-in navigation, game/branch selection, comments,
  player information and optional editing/Undo/Redo. `examples/viewer` consumes it
  through public exports; browser checks cover navigation, branch selection,
  default read-only behavior, comment editing and remount with a shared controller.
- Studio and read-only examples consume built public exports. The bundled original
  SGF supports local open/drop, navigation/branch creation, comments/markers,
  Undo/Redo, UTF-8 download/reopen and Export/Discard/Cancel record replacement.
- Production browser smoke passes on Windows Headless Chrome 154, including
  illegal-move rejection/capture, editing/reopen, preserved original branches and
  unknown properties, keyboard/touch emulation, crop, owned/external disposal and
  no implicit external requests/uploads. Screenshots are generated locally under
  `output/playwright/`, not shipped assets or evidence of real-device testing.
- Thirty focused behavior tests pass with Bun 1.4.2; strict TypeScript checks
  and Vite ESM/declaration builds pass. A separate tarball installation passes strict
  consumer typechecking and runs core/SGF/edit/export/reopen on Node 24.14.0.
  The headless subpaths also typecheck with only ES2022 libraries and no DOM types.
  Immutable snapshot identity is stable between state changes for framework stores.
- Separate optional `@banora/react`, `@banora/vue` and `@banora/svelte` packages
  expose Board/Viewer and native state bindings. Public-artifact examples independently
  verify configuration/callback updates, shared/owned controllers, read-only behavior,
  controller replacement, unmount/remount and comment Undo in Chrome 154.
  React 19.3.0 runs Strict Mode, Vue 3.5.43 exercises deep refs, and Svelte 5.57.2
  consumes native components. Isolated npm tarball consumers pass strict types and
  real server rendering of containers/state text on Node 24.14.0, with no DOM or
  unrelated framework dependencies. Board HTML/hydration support is deferred.
  Svelte package/check tools use isolated TypeScript 6.0.3; root/core remain on 7.x.
- Classic distribution: a self-contained `banora.global.js` IIFE exposes the common
  SDK under `Banora`, with packaged ambient namespace declarations. The isolated
  tarball verifies execution without DOM globals; `examples/browser` verifies a
  production script-only viewer, editing/Undo and external-controller remount in
  Chrome 154. The bundle needs no framework, ESM loader or implicit remote assets.
- Tooling uses Bun 1.x, TypeScript 7.x and Vite 8.x, with the lockfile capturing
  resolved versions. Core has zero runtime dependencies. No hosted CI is configured.
- Root and package MIT license files cover original code/documentation.

## Remaining Delivery

1. M1: The initial end-to-end workflow and complete viewer have local evidence.
   The final release audit remains; no package is published.
   Additional encoding/browser/screen-reader fixtures and performance baselines
   remain outside the current narrow compatibility evidence.
2. M2: The three framework adapters and their consumer evidence are implemented.
   Branch removal/reordering, free setup and lines/arrows also have local evidence.
   The classic browser distribution also has package/client evidence.
   Freehand annotations, remaining teaching/presentation tools,
   transforms, diagrams and sharing remain to be delivered.
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
