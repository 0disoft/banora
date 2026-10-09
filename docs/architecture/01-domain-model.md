# Domain Model

- Status: Planned; names below are conceptual, not exported API symbols
- Related contract: [Public API](../sdk/public-api.md)

## Core Concepts

| Concept | Meaning |
| --- | --- |
| Intersection | Logical board coordinate, independent of display rotation/reflection |
| Board position | Dimensions, stones, side to move, captures and rule-relevant state |
| Rule policy | Explicit capture, suicide, repetition, handicap and scoring semantics |
| Action | Play, pass, setup/edit, undo/redo or record navigation |
| Action result | Success with changes, or a structured failure without state mutation |
| Position history | State required for navigation and repetition detection |
| Record | Game metadata, SGF properties and a rooted variation tree |
| Record node | Stable in-memory identity, ordered children, move/setup, comments and properties |
| Cursor | Selected record path and the board derived by replaying that path |
| Annotation | Marker, label, line, arrow or drawing associated with a node/position |
| Dead-stone selection | User-confirmable scoring input; separate from a prediction |
| Analysis context | Board, side to move, rule policy, komi and relevant history identity |
| Analysis result | Provider output tied to a request/context: candidates, scores, variations and ownership |
| Puzzle | Initial position plus authored accepted/rejected continuations and feedback |

## State Authority

The core is the only authority for state transitions. In a record-backed session,
the cursor selects a path and the core computes its position. UI wrappers must not
maintain a second independently mutable board. Views receive read-only snapshots
or equivalent protected data; the concrete representation remains UNDECIDED.

## Identity and Serialization

Node identities must remain stable during editing. Sharing must define how a node
is identified after serialization; in-memory IDs are not assumed portable SGF IDs.
SGF round-tripping preserves semantic properties and branch order, not source bytes.

Analysis matching must include rules, komi, side to move and relevant history,
not just the visible stone layout. A puzzle's node feedback is distinct from an
AI engine's estimated move quality.

The exact exported types, storage strategy, hashing scheme, annotation encoding,
and persistence format beyond SGF remain UNDECIDED.
