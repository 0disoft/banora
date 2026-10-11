# Local Diagnostics

`@banora/sdk/diagnostics` is headless and optional; root/classic exports also expose
`DiagnosticJournal` and `describeDiagnosticFailure`. Recording is explicit. No
network, storage, environment detection, global exception capture, timer, controller
subscription or implicit analytics is included.

```ts
import { DiagnosticJournal, describeDiagnosticFailure } from '@banora/sdk/diagnostics';

const diagnostics = new DiagnosticJournal({ capacity: 64 });
// Run an actual action first; record only when the user enables diagnostics.
const result = controller.play({ x: 0, y: 0 });
if (!result.ok) {
  const event = diagnostics.record({
    operation: 'edit', status: 'failure',
    failure: describeDiagnosticFailure('controller', result.reason),
  });
  // Display event.id next to a localized failure message for support correlation.
}
const report = diagnostics.createReport({ runtime: 'browser', locale: 'ko' });
const reviewedJson = JSON.stringify(report, null, 2);
// The host owns display/download. Nothing is sent by these calls.
diagnostics.clear();
```

## Inputs and Privacy

Operations: `import`, `export`, `navigate`, `edit`, `batch`, `search`, `scoring`,
`analysis`, `checkpoint`, `restore`, `backup`, `preferences`, `diagram`, `share`,
`puzzle`. Status is `success`, `failure` or `cancelled`. Only `failure` status
carries a required failure descriptor. Optional duration is finite 0–86,400,000ms,
rounded to whole milliseconds; no clock is read.

Domains: `controller`, `sgf`, `analysis`, `storage`, `io`. Project only SGF
`diagnostics[0]?.code`, controller/analysis `reason`, or the Studio draft error
`code`, never the error object/message/stack. Unknown codes become `unknown` without
coercing objects. Extra fields/accessors are rejected with fixed messages; failed
input changes neither history nor sequence. Caller-supplied recovery/retry advice
is reconstructed from known domain/code values.

Environment is optional and explicit: runtime `browser`/`node`/`bun`/`unknown`,
runtime major 1–999 (requires known runtime), platform `windows`/`macos`/`linux`/
`android`/`ios`/`unknown`, locale `en`/`ko`/`zh`/`ja`. Omit unknown values. Raw
user agent/URL/path/version text is not accepted. Include the actual SDK/consumer
version separately in a reviewed support request. No authored data, private
metadata, coordinates, tokens or provider messages belong in these inputs. Reports
still reveal usage/timing; obtain consent before sharing them.

## Reports, Clear and Recovery

Reports have `schemaVersion: 'banora.diagnostics/v1'`, environment, capacity,
evicted count, events and per-operation summaries. Capacity is 1–256, default 64.
Event IDs are generated `operation-N` values local to one journal, not distributed
request IDs. Summaries cover retained events only: outcome counts, timed count,
total/max rounded duration. No lifetime usage, percentiles, service SLOs, sample
rate, automatic alerts or background export is implied.

Reports, arrays, events, failures, environment and summary rows are frozen; later
recording/clear does not change a historical snapshot. `clear()` erases current
evidence, summary and truncation data while preserving ID monotonicity. Hosts must
release/delete reports or JSON already retained or downloaded.

Recovery IDs: `correct-input`, `choose-position`, `review-changes`, `reopen-source`,
`check-storage`, `check-provider`, `wait`, `retry`, `report`, `none`.
Translate into actionable host UI: occupied moves need another position; stale
previews/conflicting drafts need review; quota errors need storage management;
unknown failures need a minimized reproduction. Provider failures do not imply a
safe retry. `retryable` is true only for `wait`/`retry`: check current state and
operation safety before an explicit retry. The journal never replays or acknowledges
an export. See [ADR 0020](../adr/0020-explicit-redacted-diagnostics.md) and the
[observability procedure](../ops/observability.md). Studio opt-in/download/help
integration follows separately; headless support is not a shipped UI claim.
