# Implementation Status

This file tracks evidence against the complete [roadmap](../product/01-roadmap.md).
An implemented slice does not complete its milestone or establish untested compatibility.

## Current Evidence

- Common SDK: `packages/sdk`, local package name `@banora/sdk`, version `0.1.0-dev.0`.
  Names are development identifiers, not a claim of npm ownership/publication.
- Immutable headless board transitions: dimensions 2 through 52, rectangular boards,
  play, captures, pass, explicit suicide policy, simple ko and atomic setup.
- M3 repetition core: explicit positional/situational superko with immutable exact
  situation membership, legal passes without history clearing and setup epochs.
  Headless fixtures cover longer triple-ko cycles, a different-turn double-ko
  return, self-capture, recorded repetition/replacement, exact hash collisions and
  bounded duplicate-pass history. Controller fixtures cover immutable rejection,
  branch/game inspection isolation, existing-child validation, recorded repetition,
  cache eviction, comments, setup/PL Undo/Redo and atomic imports. Installed headless
  types/runtime check policy/history and setup reset. Chrome 154 verifies real
  keyboard legality/rejection and announcements, unchanged state/events/diagrams,
  setup reset, recorded navigation and borrowed-controller disposal.
- Explicit named play presets: Japanese territory, AGA territory/area and
  Tromp-Taylor, with immutable play/scoring policy descriptors and agreed-position
  coverage. A separate pass-prisoner ledger and consecutive-pass count have headless
  core/controller replay, branch, setup and Undo/Redo evidence; defaults retain no
  pass-stone accounting. No full tournament-rules support is claimed.
- Headless manual scoring: explicit named counting policies, whole-group dead/seki
  selection, derived ownership/neutral regions, territory/area and capture/dead/pass
  prisoner components, komi, AGA area handicap bonus and explicit adjustments.
  Fixtures verify corrections, seki, negative/fractional komi, AGA final-pass
  warnings/equivalent differences and atomic invalid input. Installed headless
  declarations/runtime include the new scoring subpath. Studio's public-package
  consumer supports mouse/touch/keyboard group selection and correction, all four
  counting presets, editable komi/handicap/adjustments and component totals.
  Chrome verifies exact fixture components, incomplete/White-last-pass warnings,
  invalid-input recovery, context reset, closing/reopening and mobile layout/touch.
  Actual SGF downloads before/after scoring are identical, including unknown data;
  source cursor, dirty state and main board remain unchanged. The panel is Studio
  only; there is no automatic life/death, status agreement or result persistence.
- Headless curated puzzles: explicit bounded `banora.puzzle/v1` answer trees,
  normal core legality/captures, deterministic authored responses, correct/incorrect
  terminal branches, unlisted retry, sequential hints and exact restart. Fixtures
  cover selected game/branch history, ko/superko/pass policies, immutable input/state,
  atomic rejection, metadata/tree limits and listener reentrancy/errors/disposal.
  Browser view and runnable consumer remain the next increment.
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
- Comparison primitives: `inspectNode` reads the authoritative branch replay without
  moving the cursor or notifying subscribers; `comparePositions` returns immutable
  visible-stone differences. Controller-local import generations distinguish reused
  SGF IDs. Headless and installed-artifact checks cover collections, markup, snapshot
  identity and import/Undo behavior. Common `mountComparison` composes two pinned
  boards with selectors/comments and added/removed/replaced highlights. Chrome 154
  checks eight crops/transforms, SVG/PNG pixels, atomic updates, missing-node recovery,
  import generations, deep selection beyond 500 nodes and borrowed-controller cleanup.
  Studio exposes comparison selectors, pin-current controls and shared presentation
  settings. React/Vue/Svelte compose pinned native Boards and pass separate production
  checks for selection, read-only input, transforms, main-cursor independence,
  owner changes and unmount/remount. Packed component types/SSR include these props.
- Freehand record model: node-local, immutable fractional strokes use the bounded
  version-1 BPN extension, with add/remove/clear, independent Undo units and SGF
  export/reopen. Headless checks cover unsafe/malformed imports, per-node limits,
  atomic failures, stable IDs and baseline restoration. Studio and all three
  framework consumers exercise the common pointer/keyboard tool, style updates,
  shared rendering, read-only mode and remounts. Chrome 154 also checks real touch
  drags/cancellation, eight cropped rectangular transforms, pending-input cleanup,
  SGF download/reopen and red ink pixels in an actual PNG. Other SGF programs may
  not display private BPN ink; pressure/smoothing and real-device testing are deferred.
- Complete `mountViewer`: built-in navigation, game/branch selection, comments,
  player information and optional editing/Undo/Redo. `examples/viewer` consumes it
  through public exports; browser checks cover navigation, branch selection,
  default read-only behavior, comment editing and remount with a shared controller.
- Common touch placement: opt-in release/confirmation modes with a magnified SVG
  patch, logical target preview and keyboard refinement. Pending selections never
  edit/export records; context/configuration/disposal cancels them. Focused Chrome
  154 touch emulation covers eight cropped rectangular transforms, inherited colors,
  Confirm/Cancel, callbacks, Undo and cancellation/disposal. Studio defaults to
  release mode and exposes direct/confirm choices and magnification. All three
  native consumers pass real-touch input emulation for configuration updates,
  shared Viewer rendering, read-only transitions, unmount and controller replacement.
  Touch options also pass independent packed component types/SSR. Physical devices
  are untested; these are browser-emulation checks, not native-platform support.
- Studio and read-only examples consume built public exports. The bundled original
  SGF supports local open/drop, navigation/branch creation, comments/markers,
  Undo/Redo, UTF-8 download/reopen and Export/Discard/Cancel record replacement.
  A separate production DOM file-drop fixture checks UTF-8 metadata, handicap/setup,
  branch selection, Cancel/Export & continue and actual downloaded SGF reopening.
  Malformed dropped bytes retain the active record. Native OS file dragging is untested.
- Production browser smoke passes on Windows Headless Chrome 154, including
  illegal-move rejection/capture, editing/reopen, preserved original branches and
  unknown properties, keyboard/touch emulation, crop, owned/external disposal and
  no implicit external requests/uploads. Screenshots are generated locally under
  `output/playwright/`, not shipped assets or evidence of real-device testing.
- Embedded sharing model: record/node links carry the complete collection with a
  versioned game/child-index target; position links carry visible setup/turn/markup,
  omitting history, metadata and comments unless the current comment is opted in.
  Headless checks cover Unicode/BPN/unknown properties, atomic target import,
  dirty guards, generations and malformed/oversized input without truncation.
  Public selective imports are checked in the installed Node consumer. Studio and
  all three native examples create/open links, including initial fragments and
  hash changes, with explicit whole-record/position content notices. Chrome 154
  checks exact collection/branch targets, Unicode/ink/unknown properties, escaped
  comment rendering, static-position redaction and opt-in comments, length errors,
  clipboard success/fallback and unchanged SGF dirty state. Clipboard is stubbed
  to avoid changing the machine's clipboard. Export/Discard/Cancel, replacement
  download retention and abort on controller swap/unmount are checked; remount
  does not reopen the initial address. Nothing is uploaded or hosted.
- Custom texture SDK: immutable bounded static PNG tiles, headless ready-tile
  validation and explicit PNG/JPEG/WebP Blob preparation with cropping, raster
  normalization and cancellation. Renderer/diagram export deduplicate one embedded
  image per configured color. Chrome 154 checks eight cropped rectangular transforms
  against actual PNG pixels, invalid-option atomicity, default restoration, 625-stone
  image reuse, preparation failure/cancellation and object-URL cleanup. Pending PNG
  snapshots retain their captured tiles across later updates; real touch input checks
  magnifier texture definitions and the board backdrop with leading SVG defs. Presentation
  and borrowed-controller disposal leave SGF state unchanged. Studio and all three
  native examples offer per-color local image selection, original procedural demos
  and default restoration; Board/Viewer/owned/comparison props share the tiles.
  Chrome 154 consumer checks cover real selected files, diagram downloads,
  malformed-file retention, independent reset, presentation/dirty isolation,
  controller swaps, widget remounts and cancelled late preparation after reset
  or disposal. Packed adapter declarations/SSR include texture props; broader
  browser/image-corpus coverage remains outside this local evidence.
- Placement motion SDK: one opt-in bounded Web Animation around a newly placed
  stone's own fill box; actual rules/replay and record updates remain immediate.
  Headless fixtures cover legal/recorded/Redo/capture steps and nonqualifying
  imports, setup, pass, replacement and jumps. Chrome 154 checks transform/origin,
  immutable state, continuation through redraw/comments, invalid-update atomicity,
  cancellation, live reduced-motion changes, missing-API fallback and final diagram
  pixels during a paused effect. Studio and React/Vue/Svelte offer opt-in activation
  and duration controls; production checks cover shared/owned Board and Viewer
  forwarding, comment redraws, diagram downloads, preferences, controller swaps,
  unmount/remount and repeated playback with bounded effects. Comparison stays
  static. Packed adapter declarations/SSR include the new option; no frame-rate
  or physical-device guarantee is claimed.
- Focused SDK behavior tests and CLI completion-result tests pass with Bun
  1.4.2; all browser scenarios require an exact return in the actual CLI JSON Result,
  excluding echoed source/logs and partial execution. Strict TypeScript checks
  and Vite ESM/declaration builds pass. A separate tarball installation passes strict
  consumer typechecking and runs core/SGF/edit/export/reopen on Node 24.14.0.
  The headless subpaths also typecheck with only ES2022 libraries and no DOM types.
  Headless geometry has a public selective entrypoint; all eight rotation/reflection
  combinations invert every intersection on rectangular boards. SVG rendering handles
  transformed crops, upright labels/numbers and logical pointer input, with keyboard
  movement along screen axes. Studio and all three adapter consumers expose transform
  updates without resetting owned/shared records or changing dirty state.
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
- Position diagrams: BoardView/ViewerView export standalone SVG and real PNG blobs
  with bounded dimensions, current colors/crop/transforms and no interaction overlays.
  Studio and each framework consumer download both formats through public view
  bindings. Chrome 154 checks XML/text escaping, PNG dimensions/pixels/signatures,
  snapshot timing across later edits, encoding failure and disposal cancellation.
  Images leave the SGF dirty/export baseline untouched. Packed adapter SSR checks
  confirm that browser view bindings do not run on the server.
- Tooling uses Bun 1.x, TypeScript 7.x and Vite 8.x, with the lockfile capturing
  resolved versions. Core has zero runtime dependencies. No hosted CI is configured.
- Root and package MIT license files cover original code/documentation.

## Remaining Delivery

1. M1: The initial end-to-end workflow and complete viewer have local evidence.
   The [local acceptance audit](09-milestone-audit.md) maps every requirement;
   the file-drop fixture closes the remaining local acceptance gap. No package is published.
   Additional encoding/browser/screen-reader fixtures and performance baselines
   remain outside the current narrow compatibility evidence.
2. M2: The three framework adapters and their consumer evidence are implemented.
   Branch removal/reordering, free setup and lines/arrows also have local evidence.
   The classic browser distribution also has package/client evidence.
   Freehand storage/input, rotation/reflection and SVG/PNG static diagrams are implemented.
   Magnified touch placement, position comparison and embedded sharing are implemented.
   Custom stone textures and their consumer controls are implemented.
   Placement motion and native forwarding/controls are implemented.
   All listed M2 feature slices and exit conditions have local evidence in the
   aggregate acceptance audit. Broader compatibility and an actual release remain
   separate; this evidence does not establish untested runtime compatibility.
3. M3: Superko core policies and controller/consumer integration are implemented.
   Named play presets/pass accounting and headless scoring are implemented.
   The Studio scoring consumer and headless authored puzzle sessions are implemented;
   the puzzle browser view/runnable consumer remain.
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
