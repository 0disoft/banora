# Product Specification

- Status: Planned design baseline; no capabilities implemented yet
- Technical owner: UNASSIGNED
- Delivery sequence: [Roadmap](01-roadmap.md)
- Architecture decisions: [ADR index](../adr/README.md)

## Outcome

Banora is a modular Go SDK for embeddable boards, SGF viewers/editors, puzzles,
teaching tools, and analysis interfaces. A consumer can start with a complete
viewer or compose lower-level modules without adopting an application framework.

## First Consumer and Initial Workflow

Banora Studio is the initial reference consumer, planned at `examples/studio` in
this repository and intended to become a public demo when implemented. The initial
layout consists of the board, move controls, a variation tree, and a comments panel.

1. Open a local SGF by drag-and-drop/file selection, or choose a bundled example.
2. Move through the record and inspect comments and existing variations.
3. Return to an earlier position and play a different move to create a continuation.
4. Add or edit comments and labels/shape markers on the selected node.
5. Download an SGF and reopen it with the supported changes preserved.

The Studio UI uses public SDK package exports exclusively. It must not import
internal source files or require demo-only SDK hooks. A second, minimal read-only
embedding example verifies that the API also fits simpler consumers. Accounts,
cloud storage and AI analysis are not part of Studio's initial workflow.

## Capability Scope

| Area | Planned capability | First milestone |
| --- | --- | --- |
| Board | 9x9, 13x13, 19x19 and configurable dimensions; coordinates and cropped views | M1 |
| Presentation | SVG, flat/wood themes, CSS variables, letters, shapes, move numbers | M1 |
| Input | Pointer/touch/keyboard input, placement preview, responsive layout | M1 |
| Rules | Captures, suicide policy, simple ko, pass, komi/handicap configuration, history | M1 |
| Records | SGF import/export, metadata, comments, setup stones, branches and navigation | M1 |
| Viewer / Studio | Navigation controls, variation tree, comments panel, player information, local/example loading and SGF download | M1 |
| Basic editing | Create a continuation, edit comments, add/remove labels and shape markers | M1 |
| Integration | Framework-independent API, selective ESM imports, Studio and read-only public-package consumers | M1 |
| Additional integrations | Optional React adapter/example and browser script build | M2 |
| Advanced presentation | Rotation/reflection, custom stone textures, placement animation | M2 |
| Extended editing/teaching | Branch removal/reorganization, free setup, lines, arrows, pen annotations | M2 |
| Mobile placement | Magnified aim, drag-and-release selection, optional confirmation | M2 |
| Comparison | Side-by-side variations and changed-stone highlighting | M2 |
| Sharing/export | Position/node links, static diagrams, PNG and SVG output | M2 |
| Rule profiles | Explicit superko semantics and documented named profiles | M3 |
| Scoring | Manual dead stones; territory/area, prisoners, komi and relevant rule adjustments | M3 |
| Puzzles | Authored answer branches, scripted responses, hints, restart and answer events | M3 |
| Analysis display | Candidate moves, win probability, score/move loss, principal variations and ownership | M4 |
| Analysis integration | External provider adapters, including a KataGo JSON integration | M4 |

These milestones describe planned availability. Configuration fields such as komi
do not imply a completed scoring implementation in M1. A puzzle response follows
an authored tree; arbitrary AI responses belong to a separate integration.

## State and Rules Contract

- One authoritative state transition path handles moves, setup, pass, history,
  and branch navigation. Renderers and framework adapters never implement rules.
- Invalid actions return a structured reason and leave the active state unchanged.
- Rule profiles state exact capture, suicide, repetition, handicap, and scoring
  behavior. A familiar rule-system name must not imply unsupported edge cases.
- Coordinate transforms affect presentation only; logical coordinates stay stable.
- Browser and server cores produce equivalent results for the same action history.

## SGF Preservation

Preserve comments, branch order, setup nodes, metadata, and unknown property values
through supported read/edit/write workflows. Preserve decoded property semantics,
not byte-for-byte whitespace, property order, or original text formatting.

Define the supported SGF subset and encoding behavior before claiming compatibility.
Unsupported or malformed input must produce an explicit error or diagnostic, not
silently discard data. Imports should be validated before replacing the active
record. Keep the original record available if an import fails.

## Scoring and Analysis

Separate score calculation for an agreed dead-stone selection from prediction of
ownership, life/death, or the likely final result. Users can correct suggested
dead stones. Document treatment of seki and rule-specific edge cases.

AI computation is supplied by an external engine/service. Display overlays are
SDK features; they do not mean the SDK can independently find strong moves.
Match every response to its position, rules, komi, side to move, and any relevant
history context. Cancellation and stale-response rejection are required.

## Consumer Experience

- No account or remote dependency for local board, rules, or SGF functionality.
- React is optional; no React/DOM imports in the headless core or record parser.
- Optional features have explicit imports and do not enter a minimal board bundle.
- Dispose renderers, subscriptions, adapters, and pending work explicitly.
- Provide runnable viewer, React board, puzzle, and analysis examples as their
  milestones ship. Design documents must not present proposed code as usable API.
- Studio and the read-only example consume public SDK exports from the build/packed
  artifact; internal source imports cannot substitute for consumer evidence.
- Keyboard navigation, visible focus, accessible controls, and move announcements
  are part of the board/viewer design, alongside touch support.

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

Exact runtime versions, API symbols, package exports, limits for untrusted SGF
input, and measured performance budgets remain UNDECIDED until implemented and
validated. The [risk register](03-risk-register.md) tracks these decisions.
