# Analysis API

This document owns the implemented headless analysis contract. The
[KataGo adapter](katago.md) owns wire conversion; the separate
[analysis view](analysis-view.md) owns display/PV interaction.

## Provider-Neutral Analysis Sessions

`@0disoft/banora/analysis` and root exports provide `AnalysisSession`,
`createAnalysisContext`, `sameAnalysisContext`, `normalizeAnalysisResult`,
`AnalysisError` and their `Analysis*` input/context/request/result/state/provider
types. The selective module imports without DOM types/globals or an engine dependency.
It coordinates external prediction; it does not compute strong moves itself.

```ts
import {AnalysisSession} from '@0disoft/banora/analysis';
// The host owns controller and configuredProvider, including any transport consent.
const analysis = new AnalysisSession(controller, configuredProvider, {
  profile:'japanese-territory'
});
const completion = await analysis.request({maxVisits:1000, includeOwnership:true});
if (completion.ok) console.log(completion.result.root.scoreLeadBlack);
analysis.dispose(); // The borrowed record remains live.
```

Settings require exactly one `profile` or custom `scoring:ScoringPolicy`. A named
profile must match the controller's actual ko/suicide/pass policy; custom scoring
uses its existing play rules. Do not infer `RU`. `komi`/`handicap` explicitly
override recorded `KM`/`HA`; otherwise parse those values, default zero. Komi is
finite with magnitude at most 1,000,000,000; handicap is an integer within board area.
Changing analysis settings never rewrites the source SGF or its legal-move policy.

`createAnalysisContext(state,settings)` returns `{ok:true,value}` or a structured
failure. The immutable context contains source game/node/import generation,
current `position`, setup-epoch `initial` position with baseline capture/pass ledgers,
actual colored `moves` (point or null pass), explicit profile/scoring and komi/handicap.
Setup/PL resets the epoch, retaining baseline counts. Subsequent recorded moves
must be representable through legal core transitions; illegal/out-of-turn recorded
epochs fail with `unsupported-history`, leaving archived records locally browsable.
Context extraction does not edit, navigate, acknowledge export or send data.
Contexts carry no comments/player names/full SGF. A host transport still controls
what it actually transmits and must not assume generic JSON submission is authorized.

`sameAnalysisContext(a,b)` compares exact SDK-created semantic identities, including
source generation, board/turn, policies, history/initial counts and settings. It
does not match by board-only hashes. Comment/presentation edits alone preserve a
matching result; navigation/import/policy/komi/history changes invalidate it.
Context `key` is an opaque local identity, not a portable serialization/auth token.
Recreating a context from JSON is not the supported matching path.

Providers implement `{id, analyze(request,cancellation):Promise<unknown>}`. ID uses
1 to 64 ASCII identifier characters. Each frozen request contains a unique `id`,
provider ID, context and limits. Portable `AnalysisCancellation` exposes `cancelled`
and `onCancel(listener)` with unsubscribe; hosts bridge it to engine termination or
AbortController. Completed requests release cancellation listeners; subscribing to
an already cancelled token invokes the callback immediately. No DOM-only AbortSignal
is required by headless consumers.

`request({maxVisits,maxPvLength,includeOwnership})` is the sole submission trigger.
Defaults are 1,000 visits, 16 PV continuation moves and no requested ownership.
Visits range 1 to 1,000,000; PV continuation length ranges 0 to 256. Invalid options
retain current/pending state. A new request replaces old pending work. It returns
a promise of `{ok:true,result}` or `{ok:false,reason,message}`. Cancellation, stale
invalidation and disposal settle that promise immediately even for an uncooperative
provider; late success/rejection cannot revive its result or retain the session's
source lease. The host owns transport deadlines/retries; the SDK creates no timer.

Providers return `AnalysisResultInput`: matching `requestId`/`contextKey`, root
metrics, candidates and optional ownership. All metrics use Black's perspective:
`winProbabilityBlack` in [0,1], `scoreLeadBlack` finite within +/-1,000,000,000 and
integer visits in [0,1,000,000,000]. Each candidate contains a logical `move`/pass,
unique integer rank, those metrics and `principalVariation` including the candidate
first when nonempty. Candidates are unique/legal, bounded by board area plus pass.
PVs are legal under the captured context and bounded by requested continuation
length plus the first move; all PVs together contain at most 8,192 moves. Ownership
is a dense row-major array exactly matching board area with values in [-1,1], positive
for Black. No numeric coercion, silent truncation or automatic dead-stone confirmation.

`normalizeAnalysisResult(request,unknown)` validates these boundaries and returns an
immutable result or `invalid-result`. Candidates are sorted by provider rank and get
`scoreLoss`: nonnegative lead loss versus the highest estimated candidate lead for
the current player. White reverses the Black-lead comparison. Ranking may reflect
provider utility rather than score alone. The output adds provider identity and
uses null for absent ownership. Unknown extra fields are not retained.

Candidate, PV and ownership arrays are decoded by index into dense SDK-owned
arrays. Their lengths are sampled once and checked before indexed reads, without
invoking host map/includes methods, iterators or species constructors. Every index
must be present and its value must pass the same bounds/legality checks; overridden
array methods cannot replace or skip validation. Ownership is sampled once from
the envelope, and each decoded point's x/y scalars are sampled once before checking
and freezing that exact copy. Input arrays/points remain host-owned and unmodified.
Each nonempty PV starts with its candidate. Its already-validated candidate
transition is reused and only subsequent PV moves are replayed. Empty PVs still
require a legal candidate; mismatched first moves, illegal continuations, ko and
all existing size/metric/identity bounds remain checked. The copy and published
results remain immutable; no cross-request position cache is introduced.

`getState()` exposes immutable status (`idle`, `loading`, `ready`, `error`, `cancelled`
or `unavailable`), provider ID, context, request ID, result and structured error.
`subscribe(listener)` immediately supplies state and returns unsubscribe. Public
commands during notification/cancellation return `busy`; source edits remain usable
and can invalidate a loading request before provider submission. Listener exceptions
are isolated. The session rechecks its live source before publishing any result.
SDK-controller sessions reuse proven contexts for comment/export-only notifications
and validate only the added node when extending a proven path in the same immutable
record. The session retains at most 128 proofs and 100,000 combined path/move steps.
Record generations, game/settings changes and structural edits invalidate proofs;
setup epochs reset incremental legal history. Unknown controller implementations
and the public `createAnalysisContext` builder retain full validation. Disposal
releases the session cache. Context signatures and stale-result checks remain exact.
`setSettings` rejects invalid changes atomically and preserves semantically identical
results. `setProvider` invalidates old work even for a reused provider ID. `cancel`
clears pending/display state; `dispose` releases subscriptions, pending leases and
owned analysis state without disposing the host record/provider. Later request/
commands return `disposed`; state/subscription access throws.
The live `controller` getter exposes its borrowed record for host/view composition;
access throws after session disposal and grants no separate ownership.

Arbitrary transport exceptions produce the public diagnostic `Analysis provider
failed.` rather than leaking exception text. Providers can deliberately throw
`AnalysisError(reason,message)` for a public message bounded to 4,096 characters.
Such provider failures carry optional `messageSource: 'provider'` provenance.
Their existing `reason` and `message` are unchanged. Other failures omit the field;
legacy `AnalysisFailure` values remain valid. The browser view uses provenance to
preserve public provider diagnostics while translating SDK-owned failure guidance
by reason, without matching English text.
Errors remain confined to analysis; they do not disable play/edit/Undo/export.
See [ADR 0009](../adr/0009-analysis-context-and-external-provider-contract.md). The
KataGo and the isolated display have separate contracts/evidence. Their compatibility
is not established by the headless coordinator alone; see implementation status.
