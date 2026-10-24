# Product Specification

- Status: M1-M4 implementation/local exit evidence complete in the declared coverage;
  see the [delivery audit](../engineering/10-delivery-audit.md)
- Technical owner: `0disoft` (solo maintainer)
- Delivery sequence: [Roadmap](01-roadmap.md)
- Architecture decisions: [ADR index](../adr/README.md)

## Outcome

Banora is a modular Go SDK for embeddable boards, SGF viewers/editors, puzzles,
teaching tools, and analysis interfaces. A consumer can start with a complete
viewer or compose lower-level modules without adopting an application framework.

## First Consumer and Initial Workflow

Banora Studio is the initial reference consumer at `examples/studio` in this
repository. Public demo hosting remains a separate action. The initial
layout consists of the board, move controls, a variation tree, and a comments panel.
Variation rows show the position's move number alongside the move or annotation label,
using branch-local counts (including passes) and SGF `MN` overrides. Setup/comment-only
nodes retain their position's number rather than counting as moves. Studio and the
common Viewer indent all sibling paths equally below a fork. Single-child
continuations keep that indentation; nested forks add another level. Focused rows
reserve the same disclosure gutter even when no arrow is shown. Right/down arrows
share a fixed icon box and visual center. Linear moves
stay aligned with their branch and never shift left when the arrow disappears.
Studio keeps fork rows visible but folds unselected continuations. Selecting a branch, including
through playback/keyboard navigation, unfolds that path up to subsequent forks;
returning before a fork folds its continuations again. Transient A/B hints mark
distinct empty child move intersections at the current fork. Activating a hint
navigates to the existing node without editing the record. Passes and annotation
nodes remain selectable through the tree. Hints follow board transforms/crops and
are excluded from diagram exports. Setup, shape and ink tools hide the hints. Common
Viewer consumers can opt into this behavior with `variationMode: 'focused'`;
its default remains the complete bounded outline. Standalone boards expose
`variationHints` as an opt-in presentation option. Studio reuses
existing tree rows when only the selected position changes within the
same immutable record/game and current window. Outlines contain at most 500 rows
and recenter around a selection outside the window. Record/game/language changes
refresh labels and metadata; retained rows preserve keyboard focus and final page
disposal releases cached rows.
Within a record generation, edits that leave the visible row presentation unchanged
also retain the outline elements. Updating a nonblank comment without changing its
presence indicator does not rebuild hundreds of rows per keystroke. One display
model defines both row output and cache invalidation, including the selected
row, move assessments, setup captions and branch disclosure state. Record replacement,
game and language changes invalidate the presentation cache.
The common Viewer likewise retains its bounded outline within the current window,
updating only selection until a window shift is needed. Its rendered row
model also drives cache comparison: changing nonblank comment text without
changing its presence icon retains the rows, while edited captions, move
numbers, assessments and fork disclosure states update. Record generations,
games and Viewer language/message/option updates invalidate the cache. Disposal
releases cached rows and records; a borrowed controller remains host-owned.
Studio variation rows offer a right-click menu (also Shift+F10 / Context Menu)
to delete the targeted node and its descendants after confirmation. Root nodes
cannot be deleted. Sibling paths remain intact; selection stays on its existing
path unless that path is removed, in which case it returns to the target's parent.
Undo/Redo restores/removes the subtree as one edit. Menu and confirmation targets
are scoped to the current immutable record and workspace generation so a stale
action cannot remove a similarly named node in another board or imported record.
Studio setup-point tools ignore clicks where the requested placement already
matches the board, avoiding empty edits/children and preserving Undo history.
An identical plain one-point setup child is reused by navigation rather than
duplicated; children with authored comments, titles or other properties are not
merged or replaced.
Actual setup changes after a move remain separate SGF nodes; consecutive changes
on that setup node reuse it. Non-move setup rows show localized black/white
placement, stone removal (with a coordinate for a single point), or mixed setup
change captions instead of Annotation. Authored `N` titles keep priority. This
does not change the SDK's explicit setup/repetition-reset semantics.
Studio and the common Viewer mark rows with nonblank SGF `C` comments using a small speech
bubble, a localized tooltip and an accessible description. Editing, clearing and
Undo/Redo update the indicator without copying comment text into the row label.
Studio's Good move / Bad move tools apply SGF `TE[1]` / `BM[1]` to a clicked
recorded stone or immediate fork candidate, preserving the selected position.
Target lookup reads the current immutable snapshot's SGF nodes without inspecting
ancestor board states. An immediate child at the clicked point takes priority;
otherwise the latest selected-path move at that point matching the visible stone's
color is used. Empty points and setup-only stones without such a move have no target.
Erase marker removes an existing move assessment before point markup. Assessments
are mutually exclusive with `TE`, `BM`, `DO`, and `IT`; clearing removes these
move annotations. Imported emphasis values remain intact until explicitly edited.
Studio and common Viewer rows show a check/cross circle with localized tooltip and
accessible description beside any comment indicator. Undo/Redo and SGF export/
import retain assessments. This is manual authoring, not engine evaluation.
The controller exposes `setMoveAssessment(value, nodeId?)`, and automation accepts
`{ op: 'move-assessment', value: 'good' | 'bad' | null, target?: locator }`.
Studio offers one always-visible Small / Default / Large / Custom dropdown. Default
uses the available viewport height and board container width, capped at 789px;
Small and Large use 85% / 115% of that size, constrained by the container.
The edges and four corners have transparent resize targets with directional mouse
cursors, without overlay icons. The bottom-right target remains keyboard-accessible,
with 10px arrow steps (50px with Shift) and Escape cancellation. Direct resizing
selects Custom; choosing Custom explicitly holds the current width. Custom width
remains in the current session; selecting a preset clears it. Only preset choices
persist as preferences.
This scales the rendered board without changing SGF dimensions, selection, rules
or editing history. The versioned local size preference falls back to Default
when invalid or unavailable; valid legacy values migrate safely.

A localized fullscreen icon beside the board menu requests native, whole-page
fullscreen from a user gesture, retaining the sidebar, tabs and all board controls.
It switches to an exit icon while active; clicking again or the browser's Escape
action exits. Native fullscreen-change events synchronize the icon and accessible
pressed state, including external exit. Unsupported/permission-denied environments
retain normal editing. Fullscreen is not persisted and changes no record state.

1. Open a local SGF by drag-and-drop/file selection, or choose a bundled example.
2. Move through the record and inspect comments and existing variations.
3. Return to an earlier position and play a different move to create a continuation.
4. Add or edit comments and labels/shape markers on the selected node.
5. Download an SGF and reopen it with the supported changes preserved.

The Studio UI uses public SDK package exports exclusively. It must not import
internal source files or require demo-only SDK hooks. A second, minimal read-only
embedding example verifies that the API also fits simpler consumers. Accounts,
cloud storage and AI analysis are not part of Studio's initial workflow.

Studio, the common Viewer and position comparison support English, Chinese, Hindi,
Spanish, French, Russian, Indonesian, Japanese, Vietnamese, Korean, Thai and Malay.
SDK locale
selection is explicit, preserves record state and never translates authored SGF text.
Studio variation pass captions use the SDK locale template for both empty and
legacy `tt` passes, preserving SGF move-number overrides and the authored encoding.
Missing komi is a localized presentation label; it never inserts a default `KM`
property into the record.
The controller exposes typed, atomic, undoable game-information patches for player
names, game name, FF4 date, komi and result on the current game root. Unspecified
authored properties and other games remain untouched; unknown SGF properties and
raw values survive export/reopen/checkpoints. New values are checked before the
existing full candidate validation and commit. Missing/removed komi remains absent.
Studio's information editor and explicitly confirmed scoring-result persistence
remain separate consumer implementation work; scoring never writes a result merely
by opening or changing its preview.
Studio and the common Viewer keep variation outlines bounded to 500 rows. A
selection beyond the initial prefix opens a nearby window with continuation and
fork choices rather than appending an isolated selected row. Navigation within
the current window reuses rows. Window shifts preserve global depth/indentation,
move-number overrides, focused folding, authored text and export/Undo behavior;
the localized limit notice describes nearby rows, not the first 500 nodes.
Comparison follows Studio language changes while open, translating pane labels,
node captions, counts, empty-comment fallbacks, limits and accessibility labels.
Move captions use board coordinates rather than SGF point codes or internal IDs.
Difference summaries use concise counts and + / − / ↔ legends. Locale changes
preserve pinned positions, the main cursor, Undo history and authored text.

Studio prioritizes controls and record content over introductory or promotional
copy. File actions sit in a compact 60px desktop header directly above the workspace;
on narrow screens the header wraps with reduced vertical padding.
Keyboard guidance is available
through localized tooltips rather than persistent paragraphs; texture help lists
only accepted formats and size limits. The idle status is empty. Transient action
feedback, including rejected moves and file/export messages, disappears three
seconds after the latest notice. Rejections and import, share, scoring, texture and
file failures use human explanations in all twelve languages; machine codes and
arbitrary exception text do not appear as ordinary action feedback. These messages
follow a language switch while visible. A newer notice restarts its timer, language
changes do not extend it or revive expired feedback, and disposal clears pending
timers. The separate unsaved-record indicator and unsaved-change confirmations
remain visible while relevant. Sharing includes
a concise link-access notice. Korean, Chinese, Japanese, Hindi and Thai Studio UI
prioritize self-hosted Noto Sans KR, SC, JP, Devanagari and Thai respectively for
all text, including Latin text and numbers, controls and dialog headings. English,
Spanish, French, Indonesian and Malay use Noto Sans. Vietnamese uses Be Vietnam
Pro and Russian uses PT Sans. KR,
Devanagari and Thai remain available as fallbacks for multilingual language names,
followed by system fonts. Language switches update the font
without reloading. Base text uses weight 400, ordinary buttons 500 and headings
600; Vietnamese loads real 400/500/600/700 faces and Russian uses real 400/700
faces with bold buttons and headings. Selected states retain their emphasis.
Unicode subsets load as needed from
the same origin and apply only to Studio; SDK consumers choose their own fonts.
Authored SGF text, the Latin wordmark and exported diagram fonts remain unchanged.
Sharing controls report clipboard completion or failure only for the latest copy
request, provided no newer link creation or import has superseded its feedback.
Clipboard writes use the exact displayed link and leave the record unchanged.
Default UI text sizes in Studio, the shared widgets and examples are increased by
one CSS pixel across desktop and mobile tiers. Root-relative sizes retain the
browser's root font preference, with a one-pixel addition rather than proportional
page scaling. SVG coordinates, stone numbers and diagram labels retain their
board-space sizing so they continue to scale with the board.

Single-select dropdowns in Studio, shared widgets and examples place their chevron
12px inside the trailing edge and reserve 32px of trailing padding for the label.
They remain native controls, with system appearance restored in forced-colors mode.
SDK styles are scoped to owned widgets; host dropdowns and listboxes are unaffected.

Studio's board and application header menus share a viewport-bounded nonmodal
popover. Its compact desktop home has two aligned columns: six direct actions
(record/edit, search, comparison, scoring, sharing and local drafts) on the left,
and editable board theme, stone-image access, animation/duration and touch settings
on the right. Help and All settings sit in a separated footer. There is no
separate launcher page for each small setting. At narrow widths the columns stack
with bounded vertical scrolling. Record/edit combines collection information and
editing tools; All settings combines appearance, rotation, stone-image uploads,
animation, touch and saved-preference reset. SVG/PNG remain in the visible rail.
The combined destinations use titled sections with consistent row spacing:
record/edit separates record information, editing tools and next-player actions;
All settings separates view, stone images, animation, touch and saved settings.
The detailed stone-image uploads are initially folded behind a native disclosure
so ordinary display settings remain compact; the direct Change action still opens
the image controls immediately.
The reset action is visually distinct, while existing controls retain their
original handlers and per-field preference ownership.
Existing controls are borrowed temporarily and restored on Back, outside click,
Escape or close; values, handlers and record history are shared. Help's action
search opens the consolidated destination or focuses an inline setting directly.
Comparison/scoring open on selection without resetting an already-open session.
The menu follows all twelve Studio languages and restores keyboard focus on close.
Escape also returns to the menu trigger when the final Undo disables its focused
button and the browser moves focus to the document body. An independently focused
dialog or outside control retains ownership of its keyboard interaction.

Studio restores language, display size/theme, move-number visibility, rotation/
reflection, touch mode/magnifier, animation enablement/duration, playback interval
and autosave from validated per-field local preferences. Each interaction writes
only its field; open tabs keep independent session values. **All settings → Reset
saved settings** restores browser-language/default presentation and pauses playback
without changing SGF, selection, Undo, dirty/export baseline, drafts or unrelated
storage. Corrupt/future settings remain untouched until that explicit reset;
unavailable storage leaves session controls usable. An unreadable/invalid autosave
preference starts off. [ADR 0018](../adr/0018-versioned-studio-preferences.md) owns
the bounded format and legacy migration; the SDK persists no preferences.
Its bounds follow the visual viewport, including pinch zoom, panning and on-screen
keyboard resizing, rather than assuming the layout viewport remains fully visible.

Studio control separators leave clearance on both sides: 16px on desktop and
14px on narrow screens. Board, playback and workspace boundaries add the missing
clearance before their separator; consecutive control rows use their existing
padding without doubling the gap. Hidden rows leave no empty spacing.
Navigation controls wrap inside the available width instead of expanding the
mobile workspace beyond the viewport.

## Capability Scope

| Area                      | Capability                                                                                                      | First milestone |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------- |
| Board                     | 9x9, 13x13, 19x19 and configurable dimensions; coordinates and cropped views                                    | M1              |
| Presentation              | SVG, flat/wood themes, CSS variables, letters, shapes, move numbers                                             | M1              |
| Input                     | Pointer/touch/keyboard input, placement preview, responsive layout                                              | M1              |
| Rules                     | Captures, suicide policy, simple ko, pass, komi/handicap configuration, history                                 | M1              |
| Records                   | SGF import/export, metadata, comments, setup stones, branches and navigation                                    | M1              |
| Viewer / Studio           | Navigation controls, variation tree, comments panel, player information, local/example loading and SGF download | M1              |
| Basic editing             | Create a continuation, edit comments, add/remove labels and shape markers                                       | M1              |
| Integration               | Framework-independent API, selective ESM imports, Studio and read-only public-package consumers                 | M1              |
| Additional integrations   | Official optional React, Vue, and Svelte adapters/examples and browser script build                             | M2              |
| Advanced presentation     | Rotation/reflection, custom stone textures, placement animation                                                 | M2              |
| Extended editing/teaching | Branch removal/reorganization, free setup, lines, arrows, pen annotations                                       | M2              |
| Mobile placement          | Magnified aim, drag-and-release selection, optional confirmation                                                | M2              |
| Comparison                | Side-by-side variations and changed-stone highlighting                                                          | M2              |
| Sharing/export            | Position/node links, static diagrams, PNG and SVG output                                                        | M2              |
| Rule profiles             | Explicit superko semantics and documented named profiles                                                        | M3              |
| Scoring                   | Manual dead stones; territory/area, prisoners, komi and relevant rule adjustments                               | M3              |
| Puzzles                   | Authored answer branches, scripted responses, hints, restart and answer events                                  | M3              |
| Analysis display          | Candidate moves, win probability, score/move loss, principal variations and ownership                           | M4              |
| Analysis integration      | External provider adapters, including a KataGo JSON integration                                                 | M4              |

Milestones describe delivery sequence; exact implemented coverage is owned by the
current API/compatibility evidence. Komi configuration alone does not imply a
complete scoring system. A puzzle response follows an authored tree; arbitrary
AI responses belong to a separate integration.

## State and Rules Contract

Record consumers support opt-in timed forward replay at 0.5 through 5 seconds per
recorded node. Replay never creates stones/moves, stops at the end and pauses on
manual navigation, edits or record replacement. Shared navigation shortcuts must
preserve editable-field behavior and the board's existing cursor/ink keyboard
controls. See the [playback contract](../sdk/playback.md).

Agents can operate on records and inspect external snapshots through a DOM-free,
versioned JSON request/response boundary and an optional terminal executable.
The [automation decision](../adr/0013-machine-readable-terminal-automation.md)
requires command discovery, checked logical inputs, bounded isolated batches and
structured failures; it adds no automatic control over another application's state.

Headless whole-record literal search traverses all games/variations independently
of visible tree limits and returns paginated matches with portable targets. The
controller supports immutable comment-change previews, guarded atomic application
and one-step Undo across multiple selected nodes. Content changes invalidate a
preview; browsing preserves it and application keeps the current cursor/export
baseline. Bounds and ownership are specified in
[ADR 0019](../adr/0019-record-search-and-atomic-comment-batches.md). SDK methods
and terminal commands are implemented. Terminal operations expose portable targets,
preview-only comment diffs and optional exact-source conditions for cross-request
review. Studio exposes Search record above the board and through its quick menu.
Search all record text or comments, navigate a result, or select up to 256 positions
across pages. Preview a common replacement comment before applying it as one Undo
unit; an empty replacement clears selected comments. Closing/cancelling or source
changes discard approval while retaining typed text. Imports clear old selection.
Search and preview text stays local to the current session; authored text is never
interpreted as markup or translated with the interface. Paginated results and
before/after diffs scroll independently of the modal's controls.

Hosts may keep rules, records and revisions in an external server/native engine.
The additive [controlled-board decision](../adr/0012-host-controlled-board-and-presentation-boundary.md)
defines a plain snapshot/intention integration without requiring a Banora record
controller, SGF conversion or a selected transport. The host remains authoritative;
display primitives and input handling are shared with the existing record boards.
The contracts below describe Banora-managed records, not a requirement to migrate
an external application's rules or persistence into the SDK.

- One authoritative state transition path handles moves, setup, pass, history,
  and branch navigation. Renderers and framework adapters never implement rules.
- Invalid actions return a structured reason and leave the active state unchanged.
- Rule profiles state exact capture, suicide, repetition, handicap, and scoring
  behavior. A familiar rule-system name must not imply unsupported edge cases.
- Coordinate transforms affect presentation only; logical coordinates stay stable.
  Public coordinates are zero-based `{ x, y }` from the top-left, and colors are
  `'black'` / `'white'`.
- Browser and server cores produce equivalent results for the same action history.
- One controller owns the active record, selected node and edit history. Consumers
  send commands and receive read-only state/change events. Disposing a view releases
  its resources while preserving an externally supplied controller.

## Editing History and Unsaved Changes

Studio uses the selected Atelier workspace: an ivory surface, terracotta accents,
left-side record metadata, variations and comment editor, a toolbar beside the
board, and a compact playback dock. Advanced controls are available through both
the header and board menus; each control has one DOM owner and is temporarily
borrowed into the active menu. Menus return controls and focus to their original
locations. Narrow screens place the board first and the record panels below it.
This is consumer presentation, not a required SDK skin or framework dependency.
Studio embeds validated raster stone tiles through the public texture API and
uses wood grain as display decoration. Standalone image exports retain an opaque
SDK board and embedded stones. Materials are excluded from record/share data.
Modal dialogs own their body-level surface independently of borrowed controls;
moving or hiding a menu cannot hide an active recovery, search, or help dialog.
Search, Local drafts and Help entries close the popover and launch their existing
dialogs directly, without a second launcher screen. Closing returns focus to the
invoking header/board menu unless a dialog action intentionally navigates elsewhere.
Comparison and scoring entries reveal their working controls immediately; reopening
retains an active comparison/scoring session instead of restarting it. Help retains
the example links in its own dialog. Settings groups continue to borrow one set of
existing controls, preserving listener, history and state ownership.

Studio starts with an empty 19 × 19 board. A vertical workspace rail to the right
of the board selects
19, 13 or 9 lines for a new board; this is distinct from the Small / Default /
Large display-size preference. New board adds and activates an internal tab
without replacing another record or requesting its discard. Each tab retains
its actual SDK controller, selected node, comments, Undo/Redo and export baseline.
Opening an SGF, example or backup replaces only the active tab through the existing
dirty-record guard; SGF collection selection remains within that tab.
Studio prepares a controller-owned immutable import before replacement approval
and applies that exact preview afterward without decoding/parsing the input again.
Approval freshness, issuing-controller/generation checks and custom SGF limits
remain enforced. Cancelled preparation does not replace or mark the record saved.
Tab titles use authored game names or localized defaults, with an unsaved indicator.
An empty authored game name falls back to the filename, matching the main heading.
Move navigation and comment edits reuse existing tab elements when titles, dirty
indicators, dimensions and selection are unchanged; language changes still refresh
all tab labels and accessible close names.

Tabs support mouse selection and Up/Down/Left/Right/Home/End keyboard navigation without
triggering record playback shortcuts. A switch pauses playback and invalidates
pending imports/search previews and position comparison. Closing a dirty tab
requires Export / Discard / Cancel; closing the last tab creates a fresh 19-line
board. The browser exit guard includes inactive dirty tabs. Up to 20 boards may
remain open; no work is silently evicted. The stable controller facade retains
the SDK prototype but owns no tab controller, so closing the initial tab releases
its record/history references just like closing subsequent tabs. These in-memory sessions are not restored
automatically on reload. Local draft autosave flushes outgoing sessions and keeps
independent, revision-checked owners, including rapid switches with queued writes.
Below 1001px the rail reflows above the board to preserve usable board width.
SVG and PNG export buttons stay visible together on one row in the workspace rail,
below display sizing and above the tabs. Compact format labels retain localized
save-action tooltips and accessible names. The View menu sticky heading uses the
menu surface color.

Studio's playback dock includes a localized placement-sound toggle. It defaults
off and persists through the existing validated, per-field preferences. Enabling
it permits a short locally synthesized Web Audio wood impact for a forward stone
placement, including recorded playback. Passes, rejected moves, comments,
Undo/Redo, imports, tab switches and initial rendering remain silent. Muting
stops pending sounds without pausing playback. Audio initializes after a user
gesture, uses no external recording or network resource, and is disposed with
the consumer. A crisp broadband attack and rapidly damped, fixed-frequency wooden
resonances replace the softer filtered click and pitch sweep. The cached waveform
retains amplitude headroom and fades to silence. Unsupported browsers retain
silent editing with a disabled toggle.

Keep previous/next/branch navigation separate from edit Undo/Redo. Variation creation,
comment changes and marker changes are undoable; a comment editing session is one
undo unit. Navigation creates no edit entry and restores the selected path's rule
history. Edit history must not substitute for repetition history.
Comment-only single and batch edits retain the bounded position cache: they change
no moves, setup, move numbers or rule history. Their controller-private index
refreshes changed node/ancestor references, skips identical immutable subtrees,
and retains unchanged parent/game maps. Only trusted topology-preserving C-only
builders use this path. Other edits, Undo/Redo and record or checkpoint replacement
continue full indexing and invalidate replayed positions.
Immutable path edits and comment batches share unchanged ancestor properties and
original escaping data. Rebuilt child arrays remain frozen; changing a node's own
properties still creates a defensive immutable copy.
Comment-only edits may reuse a controller-local weak proof that the exact immutable
source's canonical export passed its fixed SGF limits. They still check the entire
candidate's UTF-8 bytes using the proven source byte count plus exact old/new
C-only export deltas, and validate each changed C value, including preserved raw
escaping, through the existing serializer/parser. Within one validation call,
reuse the immediately preceding probe's parse result and UTF-8 byte count only
when its complete serialized text is identical; retain at most one probe and
nothing across calls. Delta probes use identical root headers; only the final batch size is checked so removals can offset additions.
The first unproven export and all non-comment edits retain full validation; unchanged
node/depth/property limits are
inherited only for internal C-only builders. Preview validation remains atomic.
Empty or single-target comment previews may use the controller's exact-source
index to retain the unchanged record or rebuild only the target's parent path.
This shortcut requires at most 50,000 indexed nodes; oversized/multi-target records
retain the full bounded builder and existing failure ordering. Preview ownership,
fixed SGF limits and content freshness remain unchanged.

Dirty state compares semantic record content with its export baseline, excluding
navigation and presentation. Imported records start clean. Successful export advances
the baseline; Undo returning to it clears dirty state. Failed/cancelled export leaves
the prior baseline intact. A browser download cannot establish actual disk persistence.
The controller compares immutable record trees directly, skipping shared subtrees
and shared property maps. Changed properties use the same exact per-node semantic
normalization, including root headers, point lists and ink. IDs remain irrelevant;
collection/branch order and tree shape remain significant. Export tickets retain
their immutable record snapshot without another whole-record signature string.
A weak per-property baseline token cache handles separately parsed checkpoint
baselines and resets on import, restoration, acknowledgment and disposal.

Before Studio replaces or closes a dirty record, offer Export / Discard / Cancel.
Only successful export or explicit discard allows the pending operation; cancellation
retains the current record. Hosts own this UI; the SDK supplies state and operations.
A queued confirmation-close event preserves focus if the user has already moved
to another visible control. Only abandoned, hidden or dialog-owned focus returns
to the invoking control or its visible menu fallback.
Studio ignores late file reads and read errors after a newer file selection,
record replacement or page exit, so earlier input cannot overwrite the current record.
Portable SDK/terminal checkpoints preserve the working record, export baseline,
selected location and explicit rules. Hosts own persistence; Studio implements
bounded local autosave, guarded restore, selected/current portable backups and
explicit revision-checked deletion. Recovery validates once before approval,
passes the owned immutable checkpoint internally, and leaves final validation
under the destination SDK controller's limits intact. Selection changes and starting/applying a
refreshed draft list cancel prior deletion confirmation and its prompt; a new
selection/revision requires confirmation again. Sessions/tabs keep distinct drafts, storage
failure retains editing/SGF export, and no unsaved work is silently evicted.
Closing recovery cancels pending restore/backup reads; late results cannot alter
newer feedback, and cancelled backup reads skip JSON/checkpoint parsing.
A draft deletion waiting for autosave is also cancelled before submission when
recovery closes; already-submitted storage transactions may still commit.
Exit durability is best-effort; Undo/presentation are not stored in backups.
See [recovery](../sdk/recovery.md) and the
[API contract](../sdk/public-api.md).

## SGF Preservation

Initially target SGF FF4 for Go: moves/pass, setup stones, branches, comments,
player/game metadata, labels and shape markers. Preserve branch order and unknown property values
through supported read/edit/write workflows. Preserve decoded property semantics,
not byte-for-byte whitespace, property order, or original text formatting.
The parser freezes its private property arrays in place and retains raw value
slices instead of concatenating characters while scanning. Escaped delimiters and
raw UTF-16 value limits are still checked at the same offsets.
Plain values use a combined backslash/closing-bracket boundary search; values with
escapes or missing boundaries retain the character scanner and its diagnostics.
It avoids rebuilding decoded plain values without escapes or line endings. Public node construction still copies caller
input; normalization, raw escaping preservation and all SGF limit checks remain.
Point-list validation uses row bitsets for compressed rectangles and enforces a
collection-wide expanded area budget (one million points by default, configurable
with `maxExpandedPoints`). Empty permitted lists cost zero. Setup conflicts and
within-property duplicates remain errors, including across 32-bit word boundaries.

Decode file bytes according to declared encoding; string input is already decoded.
Export UTF-8. Implemented encoding/default/limit policies are documented in
[record compatibility](../sdk/compatibility.md#record-compatibility); broader property
behavior needs evidence before claiming full FF4 conformance.
Unsupported or malformed input must produce an explicit error or diagnostic, not
silently discard data. Imports should be validated before replacing the active
record. Keep the original record available if an import fails.

## Scoring and Analysis

Separate score calculation for an agreed dead-stone selection from prediction of
ownership, life/death, or the likely final result. Users can correct suggested
dead stones. Document treatment of seki and rule-specific edge cases.
Studio preserves manual scoring marks and adjustments across comment/annotation
edits and their Undo. Navigation, import, move/setup history, board dimensions or
komi/handicap metadata changes rebind scoring to the current position.

AI computation is supplied by an external engine/service. Display overlays are
SDK features; they do not mean the SDK can independently find strong moves.
Match every response to its position, rules, komi, side to move, and any relevant
history context. Cancellation and stale-response rejection are required.

## Consumer Experience

Destructive/replacement confirmation dialogs have explicit accessible names tied
to their localized visible titles. Native modal focus prevents background controls
from receiving keyboard focus; Escape cancels without removing continuations or
replacing dirty work. These confirmations remain operable at narrow layout widths.
Reference framework sharing guards use their actual English UI; broad physical
assistive-device/browser-engine compatibility is not inferred from Chrome checks.

The optional CLI embeds original reusable JSON requests, discoverable through
`recipe` and `recipe --name NAME`. Discovery executes nothing. Requests exercise
study creation/checkpoints, branch search, explicit review previews, agreed scoring
and an intentional failure. The [workflow guide](../../examples/automation/README.md)
connects save/reuse, cross-process resume and guarded preview approval/Undo; actual
installed consumers verify those paths. Host scheduling and live-state authority
remain separate responsibilities.

Repository operational checks validate checkpoints/Studio backups by actual isolated
restoration and fixed content-free comparisons, never modifying source files or
opening live browser storage. Authored recovery drills and concrete incident/config/
secret/backup runbooks are described in the
[operational contract](../ops/00-operational-contract.md). No hosted infrastructure,
service SLA, remote release/rollback or disk-durability claim follows from these tools.

Optional headless diagnostics provide explicit bounded operation evidence and
safe failure/recovery identifiers. The automation SDK and optional terminal diagnose
command execute canonical requests once on isolated state and return reviewed,
bounded evidence without authored output; explicit CLI report publication protects
input files and retains SDK failures. No implicit analytics, global error interception,
authored data, raw messages/stacks, arbitrary metadata or environment fingerprint
strings are recorded. Hosts own opt-in, reviewed download/sharing and retention;
reports summarize retained local events only. See
[ADR 0020](../adr/0020-explicit-redacted-diagnostics.md) and the
[diagnostic contract](../sdk/diagnostics.md). Studio Help provides localized action/
settings discovery and session-only opt-in, report inspection/clear/download. A
consent epoch invalidates old diagnostic completions on clear/disable/re-enable;
file import captures that epoch before reading. No record/draft/export state is
changed by diagnostic actions. Its repository Issues link has no private prefill;
the exact instrumented operation scope is listed in the consumer contract.

- No account or remote dependency for local board, rules, or SGF functionality.
- All framework adapters are optional. The headless core and record parser import
  no DOM, React, Vue, or Svelte; the shared browser SDK requires no UI framework.
- Optional features have explicit imports and do not enter a minimal board bundle.
- Dispose renderers, subscriptions, adapters, and pending work explicitly.
- Provide runnable viewer, React/Vue/Svelte board, puzzle, and analysis examples as their
  milestones ship. Design documents must not present proposed code as usable API.
- Studio and the read-only example consume public SDK exports from the build/packed
  artifact; internal source imports cannot substitute for consumer evidence.
- Keyboard navigation, visible focus, accessible controls, and move announcements
  are part of the board/viewer design, alongside touch support.
- Ordinary mouse hover updates only a transient preview layer; it never replaces
  board/grid/stone elements. Read-only/pinned boards skip hover work, including
  read-only boards with point callbacks. Cropping, transforms, visibility masks
  and diagram preview exclusion remain effective. Semantic changes, keyboard
  focus, ink and touch interactions retain their existing rendering lifecycle.
- Touch confirmation prompt and group accessible name, alongside confirm/cancel
  buttons, use the twelve-locale board-label contract. This does not translate
  authored content. Touch/ink/keyboard interaction announcements and comparison
  accessible descriptions share optional twelve-locale BoardLabels notices.
  Existing controller failure codes retain their values; owned UI explanations
  are localized. Label updates relocalize owned announcements, preserving literal
  host announcements; cancellation and recovered pin announcements reflect the
  actual current input/availability state.
- Puzzle widget controls, progress, help, board labels, default feedback and
  rejected/unlisted-answer guidance use explicit twelve-locale feature catalogs.
  Language updates preserve exact session state and authored content, including
  authored text identical to a system English message. Invalid updates are atomic.
- Analysis widget controls, metrics labels, guidance, PV/pass captions and SDK
  failure explanations use explicit twelve-locale feature catalogs. Locale updates
  preserve pending requests, result/PV/ownership selection and source records.
  Explicitly public provider diagnostics retain their original text via optional
  failure provenance, without guessing from their language or message contents.

## Framework Support Contract

Plain browser use is supported by design from M1 through public mount/update/dispose
and state/action interfaces. React, Vue, and Svelte are official optional adapter
targets for M2, with no framework-exclusive SDK features. Adapters connect lifecycle,
props/configuration, subscriptions and events to the same controller and renderer;
they must not duplicate rules, record state or board drawing.

Each adapter ships a runnable public-package consumer and documented tested versions.
Verify configuration updates, state notifications, remount/cleanup, type/component
packaging, and the SSR/client-mount boundary for that framework. Integration is not
considered validated merely because a DOM container can be mounted manually.
Use one common SDK package and separate React, Vue and Svelte adapter packages in
the same repository. Initial targets are Node 24 LTS, React 19, Vue 3 and Svelte 5;
tested coverage is recorded in compatibility. Headless core/records can run on
the server; board views mount on the client. Server-rendered board HTML/hydration
are deferred. Exact implemented exports, declared peers, compiler/artifact details
and tested versions are owned by the SDK contracts; broader floors remain unclaimed.
See [ADR 0005](../adr/0005-initial-api-record-and-package-contracts.md)
and [compatibility](../sdk/compatibility.md).

## Out of Scope

Banora does not provide accounts, matchmaking, rankings, payments, server-side
match authority, AI training, or hosted storage in its initial release. Hosts own
network authentication, persistence, provider credentials, and service billing.
Legacy WGo.js/Goban/Shudan/jGoBoard API compatibility is not promised.

## First-Release Acceptance

1. Open a real SGF or bundled example in Studio and display its metadata, comments,
   markers and variation tree.
2. Navigate forward/backward, select a branch, and create a new continuation at an
   earlier position while preserving the original branch.
3. Edit comments/markers; captures, illegal-move rejection and undo/redo remain consistent.
4. Download and reopen the SGF with supported edits, original properties and branches preserved.
5. Run Studio, a small read-only embedding example and a headless core consumer
   through documented public package exports, without private source imports.
6. Complete keyboard/mobile Studio smoke checks in the declared test matrix,
   without requiring an account, cloud storage or AI service.
7. Verify package contents, license/provenance, and runnable consumer examples.

Implemented API symbols/exports, SGF input limits and tested runtime versions are
recorded in the SDK contracts and delivery audit. Broader browser floors and measured
performance budgets remain unclaimed. The [risk register](03-risk-register.md)
tracks these follow-up decisions.
