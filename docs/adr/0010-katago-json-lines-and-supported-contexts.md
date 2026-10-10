# ADR 0010: KataGo JSON Lines and Supported Contexts

- Status: Accepted; protocol fixtures and selected local-engine/model evidence
- Scope: M4 external analysis integration

## Decision

Ship a selective headless `katago` module alongside provider-neutral analysis.
`KataGoProvider` implements `AnalysisProvider`. The host supplies an ordered
`sendLine` transport and explicitly feeds engine stdout lines to `receiveLine`.
The SDK starts no process, connection, timer, retry or asset download. Transport
authentication, consent, framing, backpressure and deadlines remain host-owned.

Require declared reporting perspective (`black`, `white`, `to-play`) matching the
engine configuration. Normalize root/candidate probabilities, leads and ownership
to Black. Verify query ID, selected epoch turn and root current player. Ignore
interim reports and unrelated/action IDs; accept only final, bounded, legal results.
Reject all query warnings, including automatic rule conversion. Public errors omit
raw engine/transport messages. Cancellation removes the pending query immediately
and sends a uniquely identified `terminate` action scoped to its ID/turn. Late
responses cannot restore analysis. Disposal releases subscriptions and submits
best-effort termination without closing the borrowed transport.

Encode actual initial stones/player and colored epoch moves, never a fabricated
stone order. `analyzeTurns` counts those moves, independently of SGF `MN`.
Force `ignorePreRootHistory:false`. Disable inferred engine handicap bonus using
`whiteHandicapBonus:"0"`, applying Banora's explicit White handicap compensation
in effective komi instead. Area ignores old prisoners. Territory subtracts the
initial Black-minus-White capture difference from effective komi, preserving
the setup epoch's existing prisoner advantage. Do not undo this adjustment on
returned scores: it was part of the position submitted for prediction.

Default engine capability is 19; larger boards require an explicit maximum in
2..52. Effective komi must be a half-integer in -400..400. Reject no-ko policies,
territory pass-prisoner accounting, custom area seki exclusion, zero-liberty initial
groups and histories crossing a two-pass boundary. KataGo only permits multi-stone
suicide: allow Banora's suicide policy only with positional superko, which already
rejects board-preserving single-stone suicide. A requested zero PV continuation
length is unsupported by this adapter because the engine accepts a minimum of one.
These restrictions affect external prediction only, never local core play/scoring.
The host must retain the engine's `preventCleanupPhase=true` setting; no Banora
encore/finished-game state is invented. Engine rules remain predictive approximations
of named systems, not a full tournament adjudication claim.

Bound each JSON line to 1,048,576 UTF-16 code units, candidates/ownership/PVs by the
common result contract, and concurrent pending queries to eight by default (1..64
explicitly). Reject malformed framing/JSON that cannot be routed and settle all
pending callers. The host feeds stdout protocol lines, never stderr logs. It calls
`fail()` on EOF/disconnect and restores its transport before further requests.

## Source Basis

The official [analysis protocol](https://github.com/lightvector/KataGo/blob/master/docs/Analysis_Engine.md)
and [GTP rule documentation](https://github.com/lightvector/KataGo/blob/master/docs/GTP_Extensions.md)
own wire fields and rule vocabulary. The upstream
[analysis implementation](https://github.com/lightvector/KataGo/blob/master/cpp/command/analysis.cpp)
verifies minimum PV length, default cleanup prevention, query rule warnings and
initial board construction. The
[board history implementation](https://github.com/lightvector/KataGo/blob/master/cpp/game/boardhistory.cpp)
initializes territory's White bonus from initial stone difference minus the net
captured-White stone difference. A JSON initial board has zero capture counters;
therefore effective komi must subtract Banora's prior capture difference. The
[board implementation](https://github.com/lightvector/KataGo/blob/master/cpp/game/board.cpp)
defines top-origin machine coordinates, extended base-25 GTP columns excluding I,
and the single/multi-stone suicide distinction. The
[result implementation](https://github.com/lightvector/KataGo/blob/master/cpp/search/searchresults.cpp)
applies the declared perspective to both metrics and ownership.

These sources were reviewed on 2026-10-10. Local fixtures establish Banora's
encoding/decoding/cancellation behavior against those fields, not compatibility
with an executed model, arbitrary engine builds or remote services. Future engine
validation must record its actual version/config/model and preserve these failure
boundaries. A transport timeout must not silently trigger retries.
The subsequent [live-engine audit](../engineering/11-live-katago-evidence.md) records
actual KataGo 1.18.1 CPU/model/config execution on Bun and Node, without changing
these supported-context or host-ownership decisions.

## Consequences and Validation

Hosts can bridge stdio or an explicitly configured service without an SDK network
dependency. Unsupported contexts fail before sending anything. Other custom
providers can still analyze them. Supporting AGA territory/cleanup epochs would
need a separate verified accounting/phase contract, not a rule alias.

Test history/setup/rectangular/extended coordinates, capture and handicap komi,
unsupported contexts, all reporting perspectives, malformed/illegal results,
out-of-order finals, warnings/errors/partial/action responses, cancellation/late
responses, bounded pending/line state, failed writes, EOF, reentrant disposal and
subscription cleanup. Verify installed ES2022-only declarations and Node execution.
Browser overlays and runnable-consumer evidence belong to the separate
[display contract](0011-isolated-analysis-view-and-explicit-consumer.md), rather
than these adapter protocol fixtures.
