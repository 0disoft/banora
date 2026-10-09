# Runtime Flow

- Status: Planned
- Model: [Domain model](01-domain-model.md)

## Load a Record

1. The host supplies SGF text or a user-selected file.
2. Decode file bytes according to declared encoding; supplied text is already decoded.
   The FF4 Go parser validates metadata and a variation tree off to the side.
3. After validation, resolve any unsaved-change guard. Successful replacement
   initializes the cursor, edit history and clean semantic export baseline.
4. The core derives the board, and the viewer renders board, controls and comments.

Malformed/unsupported input produces diagnostics and preserves the existing record.
Untrusted input must respect documented size/depth/work limits. Comments are rendered
as text; remote image, link or analysis loading is not triggered by SGF properties.

## Play, Edit, or Navigate

1. The renderer maps screen input to logical coordinates; the controller selects
   play, setup, annotation or navigation behavior.
2. For game actions, the core validates and computes a transition. A rejection
   leaves state unchanged. Record edits use the controller's edit transactions.
3. The record/cursor applies a successful action to the selected path or branch.
4. Subscribers receive the resulting snapshot and relevant record updates.
5. The renderer redraws; controls and comments follow the same active node.

Previous/next and branch selection do not enter the edit Undo/Redo stack. Variation
creation, comments and markers do; a comment editing session is one undo unit.
Navigation reconstructs the correct rule history for the selected path. Edit Undo
restores record changes through the same controller and refreshes semantic dirty state.
Presentation transforms never rewrite the stored record's zero-based `{ x, y }`
coordinates. Editing and game-play modes make their legality/placement behavior explicit.

## Export and Unsaved Changes

Serialize supported FF4 Go content to UTF-8, preserving branches, metadata and
unknown properties semantically. Successful export advances the semantic baseline;
failure/cancellation retains the previous baseline and active record. Undo returning
to baseline content clears dirty state. Navigation and presentation are excluded.

Studio offers Export / Discard / Cancel before replacing or closing a dirty record.
Export proceeds only after success, Discard permits the pending operation, and Cancel
keeps the active record. For replacement, validate the new input before offering to
discard changes. A browser download request does not verify disk persistence; the
host acknowledgment API remains UNDECIDED. Autosave and recovery are deferred.

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
invalidates late callbacks. Disposing a view must not delete a host-owned record
or dispose an externally supplied controller. Hosts decide when to close the record
and handle its unsaved-change guard; removing a view alone does not close it.
