# ADR 0008: Curated Puzzle Authoring and Sessions

- Status: Accepted; implementation evidence tracked separately
- Owner: UNASSIGNED
- Scope: M3 in the [specification](../product/02-spec.md)

## Decision

1. An explicit `banora.puzzle/v1` definition contains an ID, title, prompt, initial
   SGF, optional serialized node locator/rule policy/player, and an authored answer
   tree. SGF provides a board/history context; its comments, move order or quality
   properties are not automatically interpreted as correctness. Each non-root tree
   node supplies a logical point or null for pass. Nodes have unique IDs, optional
   feedback/hints, and either children or an explicit `correct`/`incorrect` result.
2. A headless `PuzzleSession` owns immutable puzzle state independently of a record
   editor. The initial player defaults to the initial position's turn; an explicit
   player must match. New solver moves and authored responses use the existing core
   legality path and selected rules. Record context follows normal SGF replay semantics;
   the session does not certify historical record legality.
3. Opponent nodes must explicitly choose their deterministic response by child ID.
   The selected response runs synchronously before one answer notification. Alternative
   authored responses remain data; the SDK never invents/randomizes moves, calls AI,
   starts a timer or chooses an unspecified first child. A result on either a solver
   move or response ends the attempt. Finished sessions require restart before play.
4. A legal but unlisted solver move produces `unlisted` feedback and an answer event
   while preserving board, turn and authored path, allowing another attempt. It is not
   proof that the move fails the Go objective. A listed incorrect branch displays its
   authored line and ends the attempt. Illegal/malformed moves return a structured
   failure without changing state, counters or notifications.
5. Hints are authored text and optional logical points. Reveal one at a time for the
   current node, without guessing an answer or advancing the board. Accepted progress
   clears previous-node hints; unlisted attempts keep them. Restart restores the exact
   initial position, path, feedback and empty attempt/hint/line state. It emits a restart
   event rather than a fabricated answer event. No automatic progress persistence.
6. Validate the entire definition before exposing a session: SGF bounds/locator,
   rule policy, unique tree IDs and sibling moves, no cycles/aliased tree objects,
   all branch legality, terminal/nonterminal shape, deterministic opponent responses,
   hint points and a reachable correct outcome through the selected response policy.
   Bound answer trees to 1,000 nodes and depth 128, IDs to 64 ASCII identifier
   characters, title to 256 characters, prompt/feedback/hint text to 4,096 characters,
   hints to 16 per node and aggregate authored text to 262,144 characters. SGF retains
   its existing parser bounds. Invalid definitions throw before session publication.
7. State and events expose immutable positions, progress, attempts, revealed hints,
   remaining hint counts
   and the played line. Subscription starts with the current state; answer/hint/restart
   event listeners receive subsequent actions only. Notify after a complete transition.
   Commands during listener notification return `busy`; unsubscribe/dispose are safe
   and throwing listeners do not prevent the other listeners from receiving the event.
   Disposal detaches listeners and releases owned state; no host-owned record is edited.
8. Ship a selective headless `puzzle` entrypoint. A browser convenience view and
   runnable consumer compose public session/board exports, support keyboard/touch,
   hints, pass, restart, feedback and lifecycle without framework-specific puzzle rules.
   Client-bundled answers are inspectable data, not an anti-cheating boundary.

   View presentation retains only locale/messages, board options and the event
   callback, not the original definition/SGF or a second generic session option.
   Closing a view releases cached state, display SGF, subscription closures and
   presentation callbacks. A view-created session is disposed; a supplied session
   and host-held immutable snapshots remain owned by the host. Disposal during an
   event callback is safe and suppresses the subsequent view feedback report.

## Deferred

Automatic SGF problem-format inference, AI-generated responses, random response
selection, timed reply animation, puzzle grading from board shape, account/progress
storage, authoring UI, multi-player turns and importing third-party puzzle corpora.
The explicit definition is authorable JSON/TypeScript; these deferred capabilities
are not required for curated answer-tree playback.

## Validation

Use meaningful fixtures for a multi-step correct route, authored incorrect branches,
legal unlisted retry, illegal move retention, capture/pass/ko policies, deterministic
responses, hint exhaustion/reset, restart, immutable snapshots, listener reentrancy,
throw/unsubscribe/disposal and rejected definitions. Verify installed headless types
and runtime separately from browser rendering. A browser consumer must exercise the
same authored outcomes through real keyboard/touch input and clean view lifecycle.
