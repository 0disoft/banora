# ADR 0019: Whole-Record Search and Atomic Comment Batches

- Status: Accepted; SDK implemented, terminal and Studio integration pending

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

Build an immutable candidate iteratively, sharing unchanged subtrees. Validate it
against the controller's SGF limits before issuing a preview. Previewing changes
no state, history, groups, dirty baseline or export ticket. Previews are issued
only by their controller and retain the exact source record identity. A weak
ownership set prevents fabricated/foreign preview candidates; host-held previews
own their snapshot lifetime. Application requires that source to be current.
Navigation/export acknowledgment alone does not invalidate content previews;
intervening edits/imports do. An Undo returning to the exact source makes that
content preview applicable again. Revalidate neither unchanged immutable candidates
nor board positions during commit.

Application is one notification and one Undo entry, keeps the current selection,
rules and record generation, and never acknowledges SGF export. No-op batches
preserve active groups/Redo. Refused batches preserve all controller state.
`stale-preview` is an additive command failure. Preview data contains authored
content and must not be copied into diagnostic logs or implicit telemetry.

## Delivery and Evidence

SDK search and controller preview/apply/set methods ship in this increment;
`@banora/sdk/record-search` is a selective headless entrypoint. Unit coverage checks
collections/branches, metadata/labels, literal/case behavior, move counts, bounds,
4,000-move traversal without replay, one-step Undo, stable selection/export/groups,
failed/no-op atomicity, stale/foreign/forged previews and unchanged-subtree sharing.
Packed consumers exercise root/controller/selective exports under Node with
strict declarations, including an ES2022-only consumer without DOM types.
Terminal discovery/commands and Studio search/select/preview/apply UI follow in
separate cohesive increments; they are not yet claimed as shipped.
