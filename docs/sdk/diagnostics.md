# Local Diagnostics

`@0disoft/banora/diagnostics` is headless and optional; root/classic exports also expose
`DiagnosticJournal` and `describeDiagnosticFailure`. Recording is explicit. No
network, storage, environment detection, global exception capture, timer, controller
subscription or implicit analytics is included.

```ts
import { DiagnosticJournal, describeDiagnosticFailure } from '@0disoft/banora/diagnostics';

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

Domains: `controller`, `sgf`, `analysis`, `automation`, `scoring`, `storage`, `io`. Project only SGF
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
[observability procedure](../ops/observability.md).

## Studio Consumer

Open **Help** above the board or through its quick menu. Find action searches
localized feature names/descriptions and English names; results launch file/record
actions and dialogs, focus theme/display-size settings or open the matching board
menu section. Brief instructions and the repository Issues link are opt-in help,
not permanent explanatory content on the board. The Issues link opens externally
only on user activation, with no record/diagnostic prefill and no referrer.
The repository was verified private with Issues enabled on 2026-10-11; this channel
currently requires repository access. Public feedback access is a release-readiness
item, not established by a working local link or unpublished issue templates.

Expand Diagnostics and explicitly enable local collection. It defaults off and is
not saved in preferences/storage. Only the current page's explicitly instrumented
operations are collected: main edit/navigation commands, file/record import, SGF
download, checkpoint restore, autosave attempts, backup downloads and search/batch
preview/application. The journal holds 64 recent events and shows discarded count,
outcomes, available maximum timing, event IDs/codes/recovery and inspectable JSON.
Instant command reports omit timing; timed operations cover their instrumented
scope, not a benchmark or click/funnel/lifetime usage measure. Scoring, sharing,
textures, playback and other demo pages are not automatically instrumented.

Clear invalidates pending diagnostic completions and erases current records without
changing the SGF, Undo, export baseline, drafts or preferences. Disable also clears;
re-enable starts a new collection epoch. A file read started off or completed after
clear/disable/re-enable cannot repopulate the report. Consent/history reset on reload
and are independent in each tab. Disposal invalidates pending completions and releases
listeners/resources. Timing/inspection failures are isolated from authored operations.

Download writes a reviewed `banora-diagnostics.json`, never acknowledges SGF export
and makes no remote request. Failed downloads show a fixed message and preserve the
record/report. At most four temporary download URLs are retained for 30 seconds;
disposal revokes them. Already downloaded reports remain user-owned and require
separate deletion. The Studio environment projection includes browser runtime and
UI locale only; include actual SDK/consumer/browser versions separately in a report.
English/Korean/Chinese/Japanese, 320px layout, focus/Escape, action/menu restoration,
actual downloaded JSON and delayed-file consent transitions have browser fixtures.
Hosted collection remains host-owned.

## Terminal and Automation Consumer

`diagnoseAutomation(input, environment?)` is exported from `@0disoft/banora/automation`,
root and classic builds. It runs the same checked automation engine once on isolated
state and returns frozen `banora.automation-diagnostics/v1` with `ok`, optional
zero-based failed `operationIndex` and `diagnostics`. It returns no authored result,
SGF, snapshot, tree, query results, target, key, raw message or stack. Environment
is validated and copied before execution. No clock or file/network I/O is read by
the SDK. Existing `executeAutomation` result contents remain unchanged.

Import, optional restore/initial selection, each completed operation, successful
output construction and optional checkpoint construction are recorded. Failures stop
execution with actual earlier successes retained; these describe isolated work,
not committed file changes. Snapshot requests record validation as `import` only.
Navigation maps to `navigate`, comment batches to `batch`, scoring to `scoring`,
search and legal-point enumeration to `search`, remaining edits/history to `edit`.
Scoring failures retain known scoring codes; schema/input failures use automation
codes and command failures retain controller reasons. Exceptions use fixed
`invalid-input`, without reading messages during diagnostic execution. Reports hold
256 events; a maximum batch plus initialization/output stages can evict older events.
Inspect `dropped`; summaries cover only retained events. No per-step timing is inferred.

Run `banora diagnose --request request.json --output diagnostics.json` using the
same request discovered by `banora schema`; request defaults to stdin. The optional
CLI returns `banora.cli-diagnostics/v1`, additionally projecting the actual Node
major/platform family and rounded SDK execution duration, excluding file I/O.
It saves only the diagnostic report, including SDK failures, never edited SGF.
Existing output requires `--force`; input paths/aliases remain protected. File and
stdout reports match. Transport failures return only fixed `error.code`, never
paths/messages. Output failure retains SDK evidence and exits 4; SDK failure exits
3, usage/read/JSON failures exit 2, success exits 0. Read/JSON/usage failures do not
publish a file. Invocation is explicit consent for this one run; files remain
caller-owned and no data is uploaded. Review usage/timing before sharing.
