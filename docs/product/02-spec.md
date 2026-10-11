# Product Specification

- Status: M1-M4 implementation/local exit evidence complete in the declared coverage;
  see the [delivery audit](../engineering/10-delivery-audit.md)
- Technical owner: UNASSIGNED
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
nodes retain their position's number rather than counting as moves. Studio and
the common Viewer mark rows with nonblank SGF `C` comments using a small speech
bubble, a localized tooltip and an accessible description. Editing, clearing and
Undo/Redo update the indicator without copying comment text into the row label.
Studio offers Small / Default / Large display sizes, with the existing 620px board
width as Default and 85% / 115% width caps for Small / Large. Small also reduces
the available width on narrow screens; Large is constrained by its container.
This scales the rendered board without changing SGF dimensions, selection, rules
or editing history. The versioned local size preference falls back to Default
when invalid or unavailable; valid legacy values migrate safely.

1. Open a local SGF by drag-and-drop/file selection, or choose a bundled example.
2. Move through the record and inspect comments and existing variations.
3. Return to an earlier position and play a different move to create a continuation.
4. Add or edit comments and labels/shape markers on the selected node.
5. Download an SGF and reopen it with the supported changes preserved.

The Studio UI uses public SDK package exports exclusively. It must not import
internal source files or require demo-only SDK hooks. A second, minimal read-only
embedding example verifies that the API also fits simpler consumers. Accounts,
cloud storage and AI analysis are not part of Studio's initial workflow.

Studio and the common Viewer support English, Korean, Chinese and Japanese presentation. SDK locale
selection is explicit, preserves record state and never translates authored SGF text.

Studio prioritizes controls and record content over introductory or promotional
copy. File actions sit directly above the workspace. Keyboard guidance is available
through localized tooltips rather than persistent paragraphs; texture help lists
only accepted formats and size limits. The idle status is empty, while errors,
active operations and unsaved-change confirmations remain visible. Sharing includes
a concise link-access notice. Font families and authored SGF text are unchanged.
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

Studio's board header includes a menu icon for tools, view/export, stone textures,
touch settings, animation, comparison, sharing, local drafts, settings and scoring. A viewport-bounded,
nonmodal popover exposes the existing controls beside the board without scrolling
to their lower-page sections. Controls are moved temporarily and restored on
Back, outside click, Escape or close; values, handlers and record history are shared.
Comparison/scoring open on selection without resetting an already-open session.
The menu follows all four Studio languages and restores keyboard focus on close.

Studio restores language, display size/theme, move-number visibility, rotation/
reflection, touch mode/magnifier, animation enablement/duration, playback interval
and autosave from validated per-field local preferences. Each interaction writes
only its field; open tabs keep independent session values. **Settings → Reset
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

Keep previous/next/branch navigation separate from edit Undo/Redo. Variation creation,
comment changes and marker changes are undoable; a comment editing session is one
undo unit. Navigation creates no edit entry and restores the selected path's rule
history. Edit history must not substitute for repetition history.

Dirty state compares semantic record content with its export baseline, excluding
navigation and presentation. Imported records start clean. Successful export advances
the baseline; Undo returning to it clears dirty state. Failed/cancelled export leaves
the prior baseline intact. A browser download cannot establish actual disk persistence.

Before Studio replaces or closes a dirty record, offer Export / Discard / Cancel.
Only successful export or explicit discard allows the pending operation; cancellation
retains the current record. Hosts own this UI; the SDK supplies state and operations.
Studio ignores late file reads and read errors after a newer file selection,
record replacement or page exit, so earlier input cannot overwrite the current record.
Portable SDK/terminal checkpoints preserve the working record, export baseline,
selected location and explicit rules. Hosts own persistence; Studio implements
bounded local autosave, guarded restore, selected/current portable backups and
explicit revision-checked deletion. Sessions/tabs keep distinct drafts, storage
failure retains editing/SGF export, and no unsaved work is silently evicted.
Exit durability is best-effort; Undo/presentation are not stored in backups.
See [recovery](../sdk/recovery.md) and the
[API contract](../sdk/public-api.md).

## SGF Preservation

Initially target SGF FF4 for Go: moves/pass, setup stones, branches, comments,
player/game metadata, labels and shape markers. Preserve branch order and unknown property values
through supported read/edit/write workflows. Preserve decoded property semantics,
not byte-for-byte whitespace, property order, or original text formatting.

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
