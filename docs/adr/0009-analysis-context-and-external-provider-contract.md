# ADR 0009: Analysis Context and External Provider Contract

- Status: Accepted; implementation evidence tracked separately
- Owner: UNASSIGNED
- Scope: M4 in the [specification](../product/02-spec.md)

## Decision

1. The common SDK owns provider-neutral immutable contexts, requests, validated
   results and a cancellable analysis session. Engine computation, credentials,
   process/socket/HTTP transport and authorization remain explicit host concerns.
   Constructing a session never submits a position; only an explicit request calls
   a supplied provider. No automatic retry, background worker or network endpoint.
2. Extract context from a public record-controller snapshot and explicit analysis
   settings. Choose a named profile or a custom scoring descriptor; do not infer
   rules from `RU`. Named profiles must match the controller's actual play policy.
   Komi/handicap can explicitly override recorded `KM`/`HA`, otherwise use those
   values (missing means zero). Include the current board, turn, play/scoring
   policies, counts, setup-epoch initial position and actual colored move/pass
   sequence. Do not send comments, player names or the entire SGF to a provider.
3. A setup/PL begins a new repetition epoch. Retain its baseline capture/pass
   ledger, not just its visible stones. Validate subsequent recorded moves through
   legal core transitions; reject an unrepresentable illegal/out-of-turn history
   rather than quietly inventing moves. Archived SGF remains locally browsable.
   Match source game/node/import generation plus exact board/history/settings,
   without relying on a board-only or collision-prone hash. Comment/presentation
   edits alone do not invalidate a semantically identical analysis context.
4. Issue unique request/context identities. Before applying a result, verify its
   envelope and recheck the live source. Navigation, import, setup, settings/provider
   replacement, cancellation and disposal invalidate pending work and clear obsolete
   results. Settle the caller's promise immediately on cancellation/invalidation,
   even if the provider ignores cancellation or never resolves. Late fulfillment
   or rejection cannot overwrite a newer request or annotate a destroyed view.
5. Use a portable cancellation interface instead of DOM-only AbortSignal types in
   the headless contract. Cancellation is advisory; hosts connect it to their
   transport/engine termination. Listener errors cannot block local play or other
   notifications. Public commands during notification/transport cancellation return
   `busy`; source-controller changes still invalidate the active request.
6. Normalize public metrics to Black's perspective: win probability in [0,1],
   predicted score lead, and row-major ownership in [-1,1] (positive means Black).
   Candidate moves include pass, visits, ranking, probabilities, lead, a legal
   principal variation and nonnegative estimated score loss versus the highest
   candidate lead for the player to move. Predictions do not confirm life/death,
   manual scoring, player agreement or an authored puzzle answer.
7. Validate result identities, finite metrics, unique on-board/legal candidates,
   legal PVs, dense exact-size ownership and resource bounds before publication.
   Bound candidates by board area plus pass, individual PVs by requested length
   (at most 257 including the first move), aggregate PV moves by 8,192, visits by
   1,000,000,000 and score magnitude by 1,000,000,000. Requests default to 1,000
   visits and 16 continuation moves; visit limits are 1 to 1,000,000 and PV length
   is 0 to 256. Invalid requests retain current state; provider/validation errors
   remain analysis errors and do not edit or disable the local record.
8. The selective `analysis` entrypoint remains headless and has no third-party
   runtime dependencies. A separate KataGo adapter and display/view consumer follow
   this contract. The adapter must explicitly specify engine reporting perspective,
   map rules and coordinates, preserve history/count adjustments, match query ID,
   turn and current player, and reject warnings about converted rules. Its transport
   must distinguish interim/final/action responses and support explicit termination.

## KataGo Source Basis and Scope

The official [analysis protocol](https://github.com/lightvector/KataGo/blob/master/docs/Analysis_Engine.md)
defines asynchronous JSON lines, request IDs/turns, history/initial stones, configurable
reporting perspective and termination. Its documented default engine board/komi
limits must not silently narrow Banora's own board API. The adapter reports unsupported
contexts explicitly and requires a host capability choice for larger engine boards.
The [rule extension documentation](https://github.com/lightvector/KataGo/blob/master/docs/GTP_Extensions.md)
defines engine rule flags as approximations of named systems. Engine predictions
are not a substitute for Banora's agreed-position scoring contract. Exact prior
prisoner/handicap conversion is verified in the adapter increment before claiming
support; no engine process/model has been run by this decision.

## Validation

Test exact context distinctions (same stones, different turn/history/rules/komi),
setup baseline counts, atomic illegal-history rejection, result metric/ownership/PV
validation, explicit-only submission, cancellation that settles uncooperative work,
replacement/import/disposal, late errors/results, metadata-only retention and
reentrant listeners. Verify installed headless types/runtime. Adapter protocol and
browser overlay evidence are separate increments; the complete M4 exit requires both.
