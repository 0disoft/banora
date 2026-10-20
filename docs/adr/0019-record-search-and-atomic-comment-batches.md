# ADR 0019: Whole-Record Search and Atomic Comment Batches

- Status: Accepted; SDK, terminal and Studio integration implemented

## Decision

Provide headless literal property search over every game and branch, independent
of the visible tree's row limit and without board replay. Default fields are SGF
`C`, `N`, `GN`, `PB`, `PW` and `LB`; callers may select other property identifiers.
Empty queries list nonblank values in the chosen fields. Case-insensitive matching
uses JavaScript lowercase; no regex, translation or implicit Unicode equivalence.
Ordering is game order then depth-first child order. Results carry node identity,
portable locator, branch-local move number (including passes and `MN` overrides),
matching properties and a bounded plain-text excerpt. Offset/limit paginate a full
count. Do not copy a growing path at every visited node or replay each position.

Bound each call to 50,000 visited nodes, 8 Mi UTF-16 text units and 100,000 returned
locator path steps. Query length is at most 512 units, property list 1–32 unique
uppercase SGF identifiers, page size 1–100 (default 50), offset 0–50,000.
Invalid options throw TypeError; work/output bounds throw RangeError and return no
partial results. Long-path callers can lower page size. Input records must come
from SGF parsing or equivalent validated immutable SDK records.

Add controller-owned multi-node comment previews and atomic application rather
than navigating/editing one node at a time. Navigation would publish intermediate
states, split Undo, change the selected position and risk partial mutation.
At most 256 distinct nodes and 1,048,576 aggregate input UTF-16 units are accepted;
each normalized comment and expected text is at most 65,536 units. Normalize new
comments exactly as ordinary `setComment` does. Optional `expectedText` guards
checked external edits. Reject duplicate/missing targets and unknown fields.

Build an immutable candidate iteratively, sharing unchanged subtrees. For zero or
one target, a controller-owned index for the exact source can resolve the target
and rebuild only its parent path. No-op/empty previews retain the source identity.
Use this shortcut only when the indexed record has at most 50,000 nodes; larger
records and multi-target batches retain the bounded full traversal, including
its refusal ordering. The index stays internal and grants no preview authority.
Validate the immutable candidate against the controller's SGF limits before
issuing a preview. Previewing changes
no state, history, groups, dirty baseline or export ticket. Previews are issued
only by their controller and retain the exact source record identity. A weak
ownership set prevents fabricated/foreign preview candidates; host-held previews
own their snapshot lifetime. Application requires that source to be current.
Navigation/export acknowledgment alone does not invalidate content previews;
intervening edits/imports do. An Undo returning to the exact source makes that
content preview applicable again. Revalidate neither unchanged immutable candidates
nor board positions during commit.

For internal C-only candidates, validation may inherit unchanged structural and
property checks from a controller-local weak proof of the exact source record's
canonical export under that controller's fixed limits. Check the entire candidate's
UTF-8 byte count using the proven source byte count plus exact old/new C-only
export deltas, and parse each changed C value with the same limits, serializer
and raw-value preservation. Without a source proof, fully parse the candidate
export before issuing it; all non-comment edits continue full validation. Proofs
never come from callers or raw import validation. Weak ownership adds no retained
record lifetime, and rejected probes change no source/history/preview authority.
One-node delta exports have identical canonical headers and include preserved raw
C values. Check final aggregate bytes after all changes, permitting removals to
offset additions. Successful immutable candidates inherit their exact byte count;
failed probes issue no proof. Probe diagnostics omit offsets that would
misidentify a full-record location.

Application is one notification and one Undo entry, keeps the current selection,
rules and record generation, and never acknowledges SGF export. Validated C-only
commits refresh changed immutable node/ancestor references in the private index,
skipping shared subtrees and retaining its unchanged parent/game maps. This path
is restricted to internal topology-preserving comment builders; other edits,
Undo/Redo and record/checkpoint replacement retain full index reconstruction.
No-op batches preserve active groups/Redo. Refused batches preserve all controller state.
`stale-preview` is an additive command failure. Preview data contains authored
content and must not be copied into diagnostic logs or implicit telemetry.

## Delivery and Evidence

SDK search and controller preview/apply/set methods ship in this increment;
`@0disoft/banora/record-search` is a selective headless entrypoint. Unit coverage checks
collections/branches, metadata/labels, literal/case behavior, move counts, bounds,
4,000-move traversal without replay, one-step Undo, stable selection/export/groups,
failed/no-op atomicity, stale/foreign/forged previews and unchanged-subtree sharing.
Packed consumers exercise root/controller/selective exports under Node with
strict declarations, including an ES2022-only consumer without DOM types.
Terminal discovery exposes `search` and `comment-batch`, with portable targets,
preview-only diffs and optional exact canonical `expectedSgf`/per-comment conditions
for cross-request review. `banora search` provides a file/stdin convenience command.
Queries and batch edits share an eight-call request budget. Installed Node CLI
checks search, branches/counts/pagination, stdin/case/game filters, preview/source
retention, guarded application, Undo/reopen, failed-output protection and returned
locations past move 360. No issued preview object or app authority crosses processes.
Studio consumes the public search/controller exports through a native dialog,
accessible above the board and from its quick menu. Users search record text or
comments, navigate matches and select up to 256 positions across result pages.
One common comment is previewed as literal before/after text, then applied as one
Undo unit. Closing/cancelling or changing source content invalidates the preview
without losing typed input. Import clears record-specific selection and makes
retained old result buttons inert. Queries and selection are session-local.
Results and diffs have bounded scrolling regions; narrower pages handle long paths.
Production browser fixtures cover all games/branches, move 700, actual SGF download,
preview freshness, limits, four languages, keyboard focus and mobile/menu placement.
