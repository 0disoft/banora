# Product Specification

- Status: Planned design baseline; no capabilities implemented yet
- Technical owner: UNASSIGNED
- Delivery sequence: [Roadmap](01-roadmap.md)
- Architecture decisions: [ADR index](../adr/README.md)

## Outcome

Banora is a modular Go SDK for embeddable boards, SGF viewers/editors, puzzles,
teaching tools, and analysis interfaces. A consumer can start with a complete
viewer or compose lower-level modules without adopting an application framework.

## Capability Scope

| Area | Planned capability | First milestone |
| --- | --- | --- |
| Board | 9x9, 13x13, 19x19 and configurable dimensions; coordinates and cropped views | M1 |
| Presentation | SVG, flat/wood themes, CSS variables, letters, shapes, move numbers | M1 |
| Input | Pointer/touch/keyboard input, placement preview, responsive layout | M1 |
| Rules | Captures, suicide policy, simple ko, pass, komi/handicap configuration, history | M1 |
| Records | SGF import/export, metadata, comments, setup stones, branches and navigation | M1 |
| Viewer | Navigation controls, branch selection, player information, file loading | M1 |
| Integration | Framework-independent API, React adapter, selective ESM imports and browser script build | M1 |
| Advanced presentation | Rotation/reflection, custom stone textures, placement animation | M2 |
| Editing/teaching | Branch creation/removal, free setup, lines, arrows, pen annotations | M2 |
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
- Keyboard navigation, visible focus, accessible controls, and move announcements
  are part of the board/viewer design, alongside touch support.

## Out of Scope

Banora does not provide accounts, matchmaking, rankings, payments, server-side
match authority, AI training, or hosted storage in its initial release. Hosts own
network authentication, persistence, provider credentials, and service billing.
Legacy WGo.js/Goban/Shudan/jGoBoard API compatibility is not promised.

## First-Release Acceptance

1. Load a real SGF and show player information, comments, markers, and branches.
2. Navigate forward/backward and choose a variation without losing record state.
3. Apply a move, capture stones, reject an illegal move, and undo/redo consistently.
4. Export the edited record while preserving the supported SGF property semantics.
5. Use both a browser viewer and headless core consumer with documented imports.
6. Complete a keyboard/mobile viewer smoke check in the declared test matrix.
7. Verify package contents, license/provenance, and runnable consumer examples.

Exact runtime versions, API symbols, package exports, limits for untrusted SGF
input, and measured performance budgets remain UNDECIDED until implemented and
validated. The [risk register](03-risk-register.md) tracks these decisions.
