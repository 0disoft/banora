# Development Fixtures and Reset Paths

These are original repository-authored examples. They are not captured user data,
engine predictions, credentials or production restoration evidence. Use the public
SDK/CLI or built example pages; consumers do not import SDK internals.

| Case                         | Source                                                              | Reproduction and reset                                                                                               |
| ---------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Branch/comment/markup SGF    | [study.sgf](study.sgf)                                              | Open in Studio or choose Example record; Export / Discard / Cancel guards replacing dirty work                       |
| Curated answers and hints    | [puzzles.ts](puzzles.ts)                                            | Open puzzle example and use Restart; definitions are explicit, not automatic generation                              |
| Offline illustrative AI      | [analysis.ts](analysis.ts)                                          | Open analysis example/reset; illustrative output is labeled and is not an engine result                              |
| Reusable terminal requests   | [workflow guide](../automation/README.md)                           | Discover with `recipe`, save reviewed JSON and run once; separate invocations have isolated state                    |
| Corrupt/future recovery      | [checkpoint regression](../../packages/sdk/test/checkpoint.test.ts) | Authored cases reject before state/history/tickets change; preserve unsupported versions                             |
| Storage denial/conflict      | [recovery scenario](../../scripts/recovery-scenario.js)             | Disposable browser fixtures exercise reload, denied writes and concurrent owners; no user profile reset              |
| Settings migration/failure   | [preference regression](../../scripts/preferences.test.ts)          | In-memory legacy/blocked/future stores exercise actual migration and retry; no real browser preference writes        |
| Protocol EOF/cancel/deadline | [KataGo regression](../../packages/sdk/test/katago.test.ts)         | Authored protocol transport; actual engine evidence is [separate](../../docs/engineering/11-live-katago-evidence.md) |
| Long/bounded record work     | [performance workloads](../../scripts/performance.ts)               | `bun run perf` creates legal authored workloads in isolated controllers; timing is opt-in and not a CI threshold     |

Run focused Bun tests when investigating a reproduced failure, or use root commands
in [VALIDATION](../../VALIDATION.md). `bun run ops drill-recovery` rehearses serialized
checkpoint recovery on the study through public built APIs. The installed CLI check
executes every saved recipe and its cross-process checkpoint/guarded-review paths.
No external service or account is required.

Examples load committed data by explicit user action. Restarting a puzzle resets
that session; a fresh CLI invocation creates a disposable controller. Neither
deletes Studio drafts. Use Studio's explicit draft/preference deletion controls for
owned local data. `bun run clean` targets generated development artifacts, preserves
`.artifacts`, and does not clear browser storage or user files. Deleting a browser
profile is not a safe fixture reset.
