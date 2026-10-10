# Host-Controlled Boards

- Status: Headless snapshot contract implemented; surface/native integrations follow
- Decision: [ADR 0012](../adr/0012-host-controlled-board-and-presentation-boundary.md)

Use this boundary when another engine, server or application owns the game state.
`@banora/sdk/board-state` exports `createBoardSnapshot`, `BoardSnapshot`,
`BoardSnapshotValue`, `BoardNumber`, `BoardOverlay` and `BoardIntent`. Importing and
normalizing snapshots requires no DOM, framework, SGF or rule history.

A snapshot has a nonempty opaque `key`, dimensions from 2 through 52 and exactly
`width * height` top-left row-major cells, using `black`, `white` or null. Optional
next color defaults to Black; move number and captures default to zero. These are
display values, not inferred game rules. Supply explicit host values when relevant.

Optional last move, numbered points, markers, lines/arrows, bounded ink and
heatmap/badge/ring overlays are logical-coordinate presentation data. Visible
points may be nonrectangular: null/omitted shows all points, [] shows none.
Dim points do not change the position. Colors are six-digit hex; labels/descriptions
are bounded text. URLs, arbitrary SVG/HTML and provider-specific payloads are absent.

The factory validates and deeply freezes owned copies. Invalid dimensions/cells,
out-of-bounds points, duplicate mask/number/stroke entries and invalid presentation
values throw before an update can commit. State keys are not authentication:
hosts verify permissions, game legality, revision equality and stale replies.
Point, navigation, stroke and context-menu intentions carry `stateKey`; the host
can reject them without changing the displayed board or supply an accepted snapshot.

This integration does not replace existing `RecordController`/Board/Viewer APIs,
does not write SGF or implement a second rules engine, and does not open a server
connection. Applications choose their own state store, serialization and transport.
