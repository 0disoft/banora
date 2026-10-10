# Live KataGo Integration Evidence

- Date: 2026-10-10
- Result: 35 headless local-process checks passed on Bun 1.4.2 and separately on
  Node 24.14.0, using the engine/model/config below.
- Scope: actual stdio query/result/termination and source-record preservation.
  This supplements the [M1-M4 delivery audit](10-delivery-audit.md); it does not
  broaden model-quality, GPU, browser or physical-device support claims.

## Reproducible Entry Points

The [local CLI example](../../examples/katago-cli/README.md) owns process startup,
ordered writes, bounded UTF-8 line framing, separate stderr, EOF/failure settlement
and graceful/forced shutdown. The SDK continues to own only provider/session
contracts. Engine/model files are supplied explicitly; nothing is downloaded or
started merely by importing SDK/helper modules.

From the repository root after dependency installation:

```sh
bun run smoke:katago .tmp/katago-live/engine/katago.exe .tmp/katago-live/model.txt.gz
bun run smoke:katago:node .tmp/katago-live/engine/katago.exe .tmp/katago-live/model.txt.gz
```

The Node route bundles only the host runner/helper to ESM with SDK packages kept
external, then executes it with the actual `node` command. Bun's reported
`process.version` is not evidence of an executed Node runtime. Each route builds
the SDK and writes its observed version, file hashes, cases and bounded per-engine
protocol/stderr transcripts into a fresh ignored `.tmp/live-katago-*` directory.
These optional checks are not added to `check` or hosted CI and require local assets.

## Tested Assets and Configuration

| Item                           | Observed selection                                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine                         | KataGo 1.18.1, Git revision `92ee95c0a4b25fec214da00951ab69e97e207729`, Eigen CPU, Windows x64                                                                                                  |
| Official archive               | [katago-v1.18.1-eigen-windows-x64.zip](https://github.com/lightvector/KataGo/releases/download/v1.18.1/katago-v1.18.1-eigen-windows-x64.zip)                                                    |
| Archive SHA-256                | `074485cf150c38aa3bb14ac9f54f2952ffefbceb44673709bbb8a83650bf95d6`, matched the official release API digest before extraction                                                                   |
| Executable SHA-256             | `0c162587d3cda7369b3f521ed3270382f76550c4035799e70f68318dc0620270`                                                                                                                              |
| Model                          | `kata1-b6c96-s175395328-d26788732.txt.gz`, loaded internal name `b6c96-s175395328-d26788732`, model version 8                                                                                   |
| Official model                 | [Network file](https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b6c96-s175395328-d26788732.txt.gz), linked from the [network index](https://katagotraining.org/networks/)  |
| Model bytes / observed SHA-256 | 4,967,720 bytes / `48d6754de3c4754f95bf6a5ca40957a49e5e915aaaeede133a17b9ccf8fa5fcb`                                                                                                            |
| Base configuration             | [analysis.cfg](../../examples/katago-cli/analysis.cfg): one analysis/search/Eigen thread, small cache, 32 visits, 15-second engine search cap, cleanup prevention and original history retained |

The model hash identifies the downloaded bytes; it is not represented as an
upstream-published checksum. The network index marks this small model as imported
from the older g170 run. Its [upstream license](https://katagotraining.org/network_license/)
lists those imported networks as CC0. No third-party engine/model files are tracked
or included in any Banora package. This old small model was selected for inexpensive
integration verification, not as a recommendation for playing strength.

Each perspective run uses a copy of the base configuration with
`reportAnalysisWinratesAs` explicitly set to `BLACK`, `WHITE` or `SIDETOMOVE`,
matching the provider's `black`, `white` or `to-play` option. Actual stderr confirms
engine/model loading and settings. Logs never enter the JSON response decoder.

## Checks and Observed Results

| Fixture                             | Verified behavior for all three reporting perspectives                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Black 9x9 root                      | Actual root/candidate metrics and ownership; comments/player names absent from engine input    |
| White with recorded history         | Exact turn/current player, Black conversion and current-player score loss                      |
| 5x7 setup/PL and subsequent move    | Actual dimensions, legal GTP-to-top-left coordinates, 35-point ownership                       |
| Capture followed by a pass          | Actual colored history, capture/pass context and legal candidate/PV replay                     |
| Setup epoch retaining old captures  | Initial prisoner advantage reflected in effective komi: 6.5 minus one = 5.5                    |
| AGA area with three handicap stones | Explicit compensation reflected in effective komi: 7.5 plus two = 9.5                          |
| Tromp-Taylor                        | Explicit supported play/scoring flags accepted without an engine warning                       |
| Cancel / stale source / dispose     | Immediate caller settlement, exact-ID/turn terminate acknowledgement, late final reply ignored |
| Host stop with pending work         | Pending work settles, process closes with code zero and borrowed controller remains usable     |

Seven analysis contexts plus four lifecycle cases, across three perspectives,
produce 33 checks. Missing executable and missing model add two actual host-failure
checks: pending work settles with a redacted provider error and the process closes.
Both runtime routes complete all 35 checks with a successful command exit.

The assertions inspect actual engine stdout, not authored response numbers.
They independently compare probabilities/leads/visits, candidate GTP points and PVs,
Black-normalized dense ownership and current-player score loss against each
returned wire response. Every PV replays through public core legality. Source
controller snapshots and exported SGF remain unchanged after analysis.

Termination may complete a query before search starts and return `noResults`;
the check deliberately accepts that terminal marker for already-cancelled work.
It proves actual scoped termination and ignored late data, not a search-duration
or maximum cancellation-latency benchmark. Results at 32 visits are stochastic;
no fixed evaluation or best-move prediction is asserted.

## Remaining Boundaries

Other engine versions, neural architectures, GPU/backends and operating systems
need their own evidence. The browser analysis example remains offline/manual JSON;
this headless CLI does not create an automatic browser/server connection. Physical
devices, screen readers, broader browser floors and performance benchmarks remain
separate. All [adapter supported-context restrictions](../sdk/katago.md#wire-conversion-and-supported-contexts)
remain enforced; named scoring still requires agreed status rather than tournament
adjudication. No registry publication, hosting, credentials or remote service is added.
