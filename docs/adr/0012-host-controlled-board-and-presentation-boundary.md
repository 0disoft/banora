# ADR 0012: Host-Controlled Board and Presentation Boundary

- Status: Accepted; implementation delivered in separate increments
- Scope: Additive SDK integration, independent of a particular application or transport

## Decision

Hosts may own game rules, records and state outside JavaScript. A controlled board
accepts a bounded `BoardSnapshot`, displays a defensively copied immutable value,
and returns `BoardIntent` events carrying that snapshot's opaque `stateKey`.
It never applies moves, validates game legality, imports SGF, stores records or
opens a network connection. The host accepts/rejects intentions and supplies the
next snapshot. Keys identify the document/node/revision relevant to an intention;
hosts reject stale commands and replies at their own authority boundary.

Reuse the SVG surface, coordinate transforms, touch/keyboard input, annotations
and diagram export between record-controlled and host-controlled boards. Keep the
existing `mountBoard`, `RecordController`, Board/Viewer components and ownership
semantics. Add `mountControlledBoard` and native ControlledBoard components for
React, Vue and Svelte. Frameworks own containers; the SDK owns their descendants.

Snapshots support stones, numbers, markers, connections, ink, visible/dim points
and bounded heatmap/badge/ring overlays. Labels are text and colors are checked
hex values; arbitrary HTML/SVG or provider-specific payloads are not accepted.
Host accessibility labels and context-menu intentions provide presentation
extension points without granting hooks into private renderer DOM.

## Consequences and Validation

Applications retain their engine/record/transport, including a native backend or
authoritative server. No actual adoption or changes in another repository are part
of this delivery. Generic examples and installed consumers establish the boundary.
Snapshot validation precedes UI mutation. Replacements cancel pending gestures;
views dispose their own resources and never dispose host state or a host engine.
Record adjacency animation remains a record-board feature; controlled snapshots
do not invent a game history. Server imports are safe, while rendering is client-only.
Validate rejected updates, immutable snapshots, unchanged input state, stale
intent handling, transforms/masks/overlays, real images and all native lifecycles.
