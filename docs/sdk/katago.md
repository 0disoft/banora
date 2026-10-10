# KataGo Integration

`@banora/sdk/katago` and root exports provide `KataGoProvider`,
`createKataGoQuery`, `decodeKataGoResult` and their `KataGo*` public types.
This headless module has no runtime dependencies or DOM types/globals. It connects
the [analysis session](analysis.md) to KataGo's asynchronous analysis JSON protocol;
it does not bundle or start an engine/model or contact a default service.

## Host-Owned Transport

```ts
import {AnalysisSession} from '@banora/sdk/analysis';
import {KataGoProvider} from '@banora/sdk/katago';

// The host starts/configures the engine and splits its stdout into complete lines.
// This writer must preserve call order, reject failed writes, and append one LF.
const provider = new KataGoProvider({
  sendLine: line => hostEngine.write(line + '\n')
}, {perspective:'black'}); // Engine reportAnalysisWinratesAs must be BLACK.
const unsubscribe = hostEngine.onStdoutLine(line => provider.receiveLine(line));
const analysis = new AnalysisSession(controller, provider, {
  profile:'japanese-territory'
});
const completed = await analysis.request({includeOwnership:true});
if (completed.ok) console.log(completed.result.root.scoreLeadBlack);
analysis.dispose();
provider.dispose();
unsubscribe();
// The host separately closes its engine/connection when appropriate.
```

`hostEngine` is deliberately a host contract, not an exported Banora process API.
A WebSocket/service bridge uses the same fields but owns authentication, explicit
connection consent and server-side engine lifecycle. Feed only stdout protocol
messages; never engine stderr logs. SDK `sendLine` strings contain no newline.
`receiveLine` accepts one JSON line, optionally ending in LF/CRLF. It returns an
`AnalysisActionResult` for host diagnostics and resolves/rejects the matching
provider promise. No response stream is publicly exposed by this final-only adapter.

`new KataGoProvider(transport,{perspective,id?,maxBoardSize?,maxPending?})` snapshots
the bound writer/configuration. Perspective is required: `black`, `white` or
`to-play`, matching actual `reportAnalysisWinratesAs`. The SDK cannot discover a
backend's configuration from its metrics or `currentPlayer`. The host must keep
`preventCleanupPhase=true` (the upstream analysis default). Provider ID defaults to
`katago`, accepts 1..64 ASCII identifier characters. Maximum board size defaults to
19 and may explicitly be 2..52 for the host's compiled engine. Pending capacity
defaults to eight and may be 1..64. Creating the provider/session sends nothing.

Requests from multiple sessions may share one provider. Final responses can arrive
in a different order. Match exact ID, active epoch move count and current player;
ignore unrelated IDs, termination acknowledgements and matching interim reports.
Reject engine errors, `noResults` and every query warning, including converted rules.
Cancellation/staleness/disposal sends a uniquely identified `terminate` action for
the original ID and selected turn after immediately removing that pending lease.
Late data and termination statistics cannot restore a cancelled/stale result.
Action IDs beginning `banora-katago-action-` are reserved.

`fail()` settles all current pending requests with a redacted disconnect error.
Call it on EOF/socket failure; the host must restore its writer/connection or make
a new provider before further requests. It is not an automatic reconnect API.
`dispose()` rejects pending requests, sends best-effort termination, releases
subscriptions/writer, blocks reentrant/new requests and never closes the borrowed
transport or disposes a record. Dispose the analysis session first when its lifetime
ends. Failed termination writes are ignored because caller cancellation already
settled; the host still owns deadlines, engine shutdown and resource recovery.

## Wire Conversion and Supported Contexts

`createKataGoQuery(request,options)` returns a deeply immutable `KataGoQuery`,
throwing `AnalysisError` for unsupported/invalid requests. Pass the exact SDK-created
context. The query contains actual setup stones/player and subsequent colored
moves, dimensions, explicit engine rule flags, effective komi, one selected turn,
visit/PV/ownership limits and `overrideSettings:{ignorePreRootHistory:false}`.
It contains no SGF comments/player names/record generation/full tree. The selected
turn counts epoch moves, not SGF `MN`. Board points use GTP columns excluding I and
bottom-origin rows, including extended base-25 columns beyond Z.

Set engine White handicap bonus to zero instead of inferring it from Black setup
stones. Effective komi adds explicit Banora White handicap compensation; territory
also subtracts the initial Black-minus-White capture advantage retained before the
last setup epoch. Area ignores old prisoners. The submitted komi therefore already
includes these components; returned leads are not adjusted again. Effective komi
must be a half-integer in -400..400, regardless of wider local scoring settings.

The adapter rejects unsupported contexts before sending:

- Boards above the declared engine capability; no-ko play policies.
- Territory with pass-prisoner accounting (including AGA territory), or old pass
  prisoners; custom area seki exclusion.
- Suicide allowed without positional superko: Banora permits single-stone suicide
  there, while KataGo only permits multi-stone suicide. Tromp-Taylor remains mapped
  because positional superko already rejects a board-preserving single-stone move.
- Zero-liberty initial setup groups, which engine setup could remove.
- Histories crossing a two-pass phase boundary; Banora does not model engine encore.
- Zero requested PV continuation length, below KataGo's minimum of one.

Japanese territory, AGA area and Tromp-Taylor map within these restrictions. Explicit
custom policies use the same checked boundaries. Engine scoring/prediction remains
an approximation of named rule systems, without automatic status agreement or a
full tournament-rules claim. Unsupported analysis does not disable local play,
manual scoring, archived browsing, Undo or export, and another provider may support it.

`decodeKataGoResult(request,unknown,options)` requires a final response with exact
ID/turn/player, bounded metrics and dense ownership/PVs. It converts declared
perspective to Black and returns an immutable `AnalysisResultInput`. Coordinate
decoding accepts GTP strings (case-insensitive) and KataGo `(x,y)` top-origin machine
points; only `pass` is a null move. It applies the common legal-candidate/PV result
validator, ignores unknown extra fields and never uses engine board hashes as exact
history identity. The session supplies provider identity and derived move score loss.

Each incoming/outgoing line is limited to 1,048,576 UTF-16 code units. Malformed
framing/JSON/missing bounded ID cannot be routed: pending requests fail and receive
best-effort termination. Valid unrelated IDs are ignored. Candidate/ownership/PV
bounds remain those of the common analysis contract, with no silent truncation.

## Evidence and Remaining Work

Original local protocol fixtures cover all conversions and asynchronous/cancellation
failure boundaries, plus isolated installed Node 24/ES2022-only types and a completed
JSON request/result. No engine binary, neural model, remote endpoint or credentials
were run/configured. These checks establish the adapter contract, not actual model
quality/version compatibility. Record an engine version/config/model when adding
live-engine evidence. The separate [analysis view](analysis-view.md) and runnable
[consumer](../../examples/analysis/README.md) have their own display/lifecycle scope.
See [ADR 0010](../adr/0010-katago-json-lines-and-supported-contexts.md) for the upstream
source basis and exact coverage decisions.
