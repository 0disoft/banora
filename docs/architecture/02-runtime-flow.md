# Runtime Flow

- Status: Planned
- Model: [Domain model](01-domain-model.md)

## Load a Record

1. The host supplies SGF text or a user-selected file.
2. The parser validates it and creates metadata and a variation tree off to the side.
3. A successful import replaces the selected record and initializes its cursor.
4. The core derives the board, and the viewer renders board, controls and comments.

Malformed/unsupported input produces diagnostics and preserves the existing record.
Untrusted input must respect documented size/depth/work limits. Comments are rendered
as text; remote image, link or analysis loading is not triggered by SGF properties.

## Play, Edit, or Navigate

1. The renderer maps screen input to logical coordinates; the controller selects
   play, setup, annotation or navigation behavior.
2. The core validates and computes a transition. A rejection leaves state unchanged.
3. The record/cursor applies a successful action to the selected path or branch.
4. Subscribers receive the resulting snapshot and relevant record updates.
5. The renderer redraws; controls and comments follow the same active node.

Undo/redo and branch selection use the same state authority. Presentation transforms
never rewrite the stored record's coordinates. Editing and game-play modes must make
different legality/placement behavior explicit.

## Analyze a Position (M4)

1. The host explicitly requests analysis for the active context.
2. The adapter creates a request identity and sends the context to a configured provider.
3. The response is normalized and checked against the request and active session/context.
4. Only current, valid results reach candidate, score, variation and ownership overlays.

Cancellation is advisory; a cancelled request may still return. Reject stale results
at application time, including after node changes or view disposal. Failed analysis
does not prevent local play, editing, or export.

## Score and Solve (M3)

Score calculation consumes the board, rule policy and confirmed dead-stone selection.
Ownership prediction is a separate adapter result. Puzzle play follows an authored
branch and emits answer feedback; restarting returns to the defined initial position.

## Dispose

Unmounting detaches input listeners and subscriptions, cancels pending work, and
invalidates late callbacks. Disposing a view must not delete a host-owned record.
