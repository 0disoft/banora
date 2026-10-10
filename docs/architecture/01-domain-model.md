# Domain Model

- Status: Implemented conceptual overview; exported symbols and exact contracts
  are owned by the public API and scoped delivery evidence
- Related contract: [Public API](../sdk/public-api.md)

## Core Concepts

| Concept | Meaning |
| --- | --- |
| Intersection | Zero-based `{ x, y }` from the top-left, independent of display rotation/reflection |
| Board position | Immutable dimensions/stones/turn, capture/pass ledgers, pass streak, move number and rule-relevant history |
| Rule policy | Explicit play policy (suicide, ko, pass stones) and separate named/custom scoring descriptors |
| Action | Play, pass, setup/edit, undo/redo or record navigation |
| Action result | Success with changes, or a structured failure without state mutation |
| Position history | State required for navigation and repetition detection |
| Record | Game metadata, SGF properties and a rooted variation tree |
| Record node | Stable in-memory identity, ordered children, move/setup, comments and properties |
| Cursor | Selected record path and the board derived by replaying that path |
| Controller | Authority for the current record, selected node, edit history and subscriptions |
| Edit history | Undoable record changes, separate from cursor navigation and repetition history |
| Export baseline | Semantic record content used for dirty comparison; initialized on import and advanced on successful export |
| Annotation | Marker, label, line, arrow or drawing associated with a node/position |
| Dead-stone selection | User-confirmable scoring input; separate from a prediction |
| Analysis context | Source node/import generation, current/epoch-initial positions, actual colored moves, scoring/komi/handicap and exact local identity |
| Analysis result | Provider output tied to a request/context: candidates, scores, variations and ownership |
| Puzzle | Initial position plus authored accepted/rejected continuations and feedback |

## State Authority

The core is the only authority for rule-governed board transitions. A controller
coordinates record edits and navigation without duplicating rule logic. In a record-backed session,
the cursor selects a path and the core computes its position. UI wrappers must not
maintain a second independently mutable board. Views receive read-only snapshots
as immutable positions/record trees/controller state. Semantically unchanged state
retains snapshot identity for framework stores; commands return structured results.

Stone colors are `'black'` and `'white'`; pass is a separate action. Navigation
does not create edit history or dirty state. Undoing edits to the export baseline
clears dirty state. View disposal preserves an externally supplied controller.

## Identity and Serialization

Node identities remain stable during editing. Sharing identifies a node using
game/child indices through the documented locator, not an assumed portable SGF ID.
SGF round-tripping preserves semantic properties and branch order, not source bytes.

Analysis matching must include rules, komi, side to move and relevant history,
not just the visible stone layout. A puzzle's node feedback is distinct from an
AI engine's estimated move quality.

Core repetition membership is a persistent exact index with full equality for hash
collisions, not a hash-only position identity or portable storage format. BPN version
1 records bounded node-local freehand ink; SGF properties retain other annotations.
Puzzle authoring uses `banora.puzzle/v1` plus legal SGF initial context/explicit answer
trees. Analysis context identity uses exact private semantic signatures rather than
an engine board hash; its UI previews are isolated from the source record. See the
[public API](../sdk/public-api.md) and ADRs 0006-0011 for precise types and bounds.
Managed persistence/collaboration and additional encodings beyond these contracts
remain separate future decisions.
