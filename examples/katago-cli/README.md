# Local KataGo CLI example

This host example starts an explicitly selected local KataGo analysis process,
connects its stdio to the public `KataGoProvider`, and analyzes a short original
9x9 record. It prints Black-normalized metrics, legal candidate/PV coordinates
and the ownership point count. No server, framework or browser is required.

## Run

Use Bun 1.x and Node 24.x. Install the repository dependencies first. Obtain a
compatible CPU/Eigen KataGo binary from the
[official releases](https://github.com/lightvector/KataGo/releases) and a neural
network from the [official networks page](https://katagotraining.org/networks/).
Keep these local files outside tracked source (for example under `.tmp/katago-live`).
Review their [engine](https://github.com/lightvector/KataGo/blob/master/LICENSE)
and [network](https://katagotraining.org/network_license/) licenses when distributing
them separately. No binary, model or third-party asset is bundled by this example.

From the repository root, substitute your actual paths:

```sh
bun run example:katago .tmp/katago-live/engine/katago.exe .tmp/katago-live/model.txt.gz
```

The command builds the SDK, starts the selected process and exits after the result.
Paths containing spaces must be quoted. The model extension may be `.bin.gz` or
`.txt.gz` as supplied by upstream. Unix consumers use their executable's actual path.
The checked [analysis configuration](analysis.cfg) is a small CPU integration
configuration: one analysis/search/Eigen thread, small cache, 32 default visits,
15-second engine search cap, `BLACK` reports and `preventCleanupPhase=true`.
It is not a GPU configuration or a playing-strength recommendation.

The host imposes a 30-second example deadline. Ctrl+C/termination cancels analysis;
final cleanup closes stdin and waits for engine exit, with a five-second forced-stop
fallback including blocked writes. The fallback uses `SIGKILL`, closes output
pipes and waits at most one additional second for exit confirmation. Failure to
confirm exit rejects with a fixed diagnostic and releases the process reference;
it does not claim a successful stop. Working files/caches stay under
`.tmp/katago-example`. No network connection, automatic download or retry is made.

## Ownership and failure handling

[process.ts](process.ts) is host code, not part of the published SDK API. The SDK
still imports without process/DOM/network globals and owns neither executable nor
model. The host invokes an argument array with shell execution disabled and hides
the Windows child window. It appends one LF, preserves write order and splits only
stdout into bounded complete UTF-8/CRLF lines. Stderr is separate diagnostics.
EOF, spawn/write/pipe failures settle pending provider work. Oversized or malformed
framing cannot build an unbounded host buffer. There is no automatic restart.

The host writer admits at most 64 lines and 8 MiB of UTF-8 data including each LF
and the in-flight write. Capacity refusal rejects that submission without adding
work. Cancellation removes a queued, unsent query and suppresses its now-unneeded
termination; an already-writing query still receives a scoped termination. Other
callers retain FIFO order. This host limit is separate from the provider's pending
query limit. It does not create a retry loop or an SDK transport policy.
If a full queue cannot admit a necessary termination, the host shuts down instead
of leaving that engine work running without a cancellation path.

EOF, write/pipe/spawn failure and framing overflow automatically enter the same
idempotent shutdown used by explicit `stop()`. The host rejects remaining writes,
closes stdin, and retains the bounded forced-stop/exit-confirmation fallback above.
Concurrent shutdown callers share one promise; failure logs a fixed message and
remains observable through `stop()`. The optional second argument supplies spawn
and shutdown deadlines for isolated host tests; the published SDK is unchanged.

Always match the provider's declared perspective to the actual engine configuration.
The host owns those settings; the SDK cannot infer them from the numbers. The CLI
uses the supplied configuration's Black perspective. Rules and unsupported-context
restrictions remain those of the [KataGo adapter](../../docs/sdk/katago.md).

The original SGF, local legal-play policy and session/provider lifetimes are explicit.
Dispose the analysis session before stopping the host engine, then dispose the
controller when the application no longer needs it. Engine stderr may include
local paths; review it before sharing a diagnostic transcript.

## Live verification

`bun run smoke:katago <binary> <model>` runs 35 actual engine/process checks.
`bun run smoke:katago:node <binary> <model>` runs the same checks on Node after
bundling only the host runner/helper with SDK imports external. They cover Black,
White and side-to-move reporting, rectangular/setup/history/capture/pass contexts,
handicap/prisoner komi, cancellation/staleness/disposal, host stop and spawn/model
failures. No fixed neural evaluation is expected. See the
[live evidence](../../docs/engineering/11-live-katago-evidence.md) for tested assets,
hashes/config, licenses, assertions and remaining compatibility boundaries.
