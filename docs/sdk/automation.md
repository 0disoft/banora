# Terminal and Agent Automation

- Status: Headless JSON command API and optional CLI implemented; installed Node executable checked
- Decision: [ADR 0013](../adr/0013-machine-readable-terminal-automation.md)

`@0disoft/banora/automation` (also the root/global export) exposes
`executeAutomation(unknown)`, `AUTOMATION_SCHEMA`, `AutomationRequest`,
`AutomationOperation`, `AutomationResponse`, `AutomationError`, `diagnoseAutomation`
and `AutomationDiagnosticResponse`. Importing and
executing requires no browser globals, DOM types, framework or LLM dependency.

## Requests and Discovery

`AUTOMATION_SCHEMA` is an immutable JSON Schema 2020-12 document. It enumerates
allowed commands/fields, coordinate bounds and limits. All requests use
`schemaVersion: "banora.automation/v1"`. Reject unknown request/command fields;
geometric relationships, strokes, labels and game legality have further SDK checks.
Record text is at most 5 MiB of characters (the SGF parser also enforces its byte
limit), batches at most 256 operations, dimensions 2 through 52, and paths at most
49,999 child indices, matching the 50,000-node SGF limit including the root.
This move-path bound is separate from the parser's 128-level nested-variation
limit. Returned locations can resume ordinary long games beyond move 128.
No field executes code, shell commands or remote tools.
Legal-point scans share a per-request budget of 8,192 candidate cells; larger
query batches fail with reason `limit` instead of running unbounded repeated scans.
Whole-record `search` and `comment-batch` operations share eight calls per request;
each obeys the [record tools bounds](public-api.md#whole-record-search-and-comment-batches).

```ts
import {executeAutomation} from '@0disoft/banora/automation';
const result = executeAutomation({
  schemaVersion: 'banora.automation/v1', kind: 'record', size: 9,
  operations: [{op:'play', point:{x:4,y:4}}, {op:'comment', text:'Reviewed by an agent'}],
});
if (result.ok && result.kind === 'record') console.log(result.snapshot, result.sgf);
```

Record requests accept SGF or a new board size, optional named rule profile,
initial `selection: {gameIndex, path}`, `operations`, `includeTree` and `stateKey`.
Coordinates are zero-based from the top left; a null play point means pass.
`goto`, branch removal/reordering and initial selection use game index plus child
indices. These locators refer to the current tree: edits/reordering can change
paths. Node IDs, Undo/Redo and dirty state last only within one request. Do not
persist controller IDs or expect separate CLI invocations to share Undo history.
`includeCheckpoint:true` emits a portable recovery document; `checkpoint` input
resumes its working SGF, baseline, selection and rules. Do not combine it with
`sgf`, `size`, `profile` or initial `selection`. Dirty state can therefore persist
across requests, while Undo/Redo remains request-local. See [recovery](recovery.md).

Supported operation names are `play`, `previous`, `next`, `goto`, `comment`,
`marker`, `setup`, `connection`, `stroke`, `remove-stroke`, `clear-strokes`,
`remove-branch`, `reorder-branch`, `undo`, `redo`, `legal-points`, `score`, `search`
and `comment-batch`.
Read their exact arguments from the schema rather than guessing CLI flag syntax.
Markers with null kind remove the point's marks; setup replaces that node's setup.
Scoring requires an explicit named profile and manually agreed dead/seki status.
Legal points use the selected position's actual replayed rules/history.

`search` accepts `{query, properties?, caseSensitive?, gameIndex?, offset?, limit?}`
and returns `results[].value` with whole-record counts, paginated hits/portable
targets and branch move numbers. It never navigates or creates history. Properties
default to comments, node/game names, players and labels; an empty query enumerates
their nonblank values. Matching is literal, not regex. Invalid options or work/output
bounds fail without partial results. Other operations continue to use current-tree
locators, so do not reuse a returned path after branch reordering/removal.

`comment-batch` accepts `changes:[{target,text,expectedText?}]`, optional
`previewOnly` and `expectedSgf`. Preview-only returns changed before/after text and
targets in `results[].value:{applied:false,edits}` without altering source/history.
Default application is atomic, preserves the current selection and makes one Undo
entry; its result has `applied:true`. Missing/duplicate targets, stale expected text,
limits or malformed entries fail the whole isolated request.

For review across separate terminal calls, take the successful preview-only
response's canonical `sgf` (with no later edits in that request) and pass it as
`expectedSgf` when applying. It must exactly match the current serialized record;
any intervening content change returns `stale-preview`, even when selected comments
are unchanged. Per-comment `expectedText` alone guards those comments, not the whole
record. Issued controller preview objects cannot cross process boundaries. Complete
requests, including both input/expected SGF, remain subject to the CLI's 8 MiB read
bound. No live app or file-lock/revision authority is inferred from this guard.

A successful record response contains row-major `snapshot.stones`, logical
annotations, next color, captures, rules/pass counts, `selection`, selected-node
properties, indexed children, request-local history flags, query results and SGF.
Full record trees are opt-in through `includeTree`; unknown SGF properties retain
the existing semantic preservation contract. The default snapshot key
`local-record` is a local display label, not a revision or authorization token.
Hosts supply their own `stateKey` if binding results to external interactions.

Requests validate before edits and execute on a disposable private controller.
Failure returns `ok:false` and `error:{code,message,operationIndex?,reason?}`,
without partially edited SGF or snapshot. The caller's input is unchanged.
Operation indices are zero-based; stop and fix the reported operation before retry.
Codes are `invalid-request`, `invalid-input` and `command-failed`.

For reviewed support evidence, use `diagnoseAutomation` or `banora diagnose`.
They execute the same request once and return bounded fixed operation/failure data
with no authored result. See the [diagnostic contract](diagnostics.md#terminal-and-automation-consumer)
for envelopes, privacy, retention, timing, publication and transport exit codes.

## External State Boundary

`kind:"snapshot", state:BoardSnapshot` validates and returns owned immutable
display data. It does not infer rules/history or approve host intentions. There
is no automatic attachment to existing browser views, servers or native apps.
An application can explicitly expose this public boundary over its own CLI/RPC,
with its own permissions, active-document/revision checks and subscriptions.
Terminal record automation and live application authority are separate boundaries.
Browser-only textures, placement motion and SVG/PNG view exports remain DOM APIs.

## Terminal Consumer

The optional [CLI package guide](../../packages/cli/README.md) documents the
installed `banora` executable. In this repository, `bun run build:cli` builds it,
and `bun run cli schema` discovers the operation schema. `run` accepts a full JSON
request file/stdin; `create`, `inspect`, `search`, `edit` and `snapshot` are convenience
commands. Exact flags, exit codes and file preservation are discoverable through
`banora --help`. Calling the executable directly writes only one JSON document
per process, including errors; package-manager banners are outside that contract.

Output files are explicit and saved only after success. Complete temporary files
are published exclusively by default; `--force` replaces existing output, while
input paths/realpath aliases remain protected. Input reads are bounded to 8 MiB,
with existing SGF byte/structure limits inside the SDK. No interactive prompts,
browser launch, automatic transport or application adoption occurs.

`bun run smoke:cli` installs actual SDK/CLI tarballs with npm, tests the installed
bin and runs Node processes on Windows for JSON/stdin, record edit/reopen, snapshot
normalization, schema/error/limit handling and file preservation. Headless SDK
types/runtime/global distribution have separate packed consumer evidence.
CLI native-engine/puzzle/analysis-session commands and headless SVG/PNG rendering
are absent; use their existing public SDK APIs/explicit engine example instead.

## Reusable Workflows

`banora recipe` discovers five original workflows with explicit expected outcomes;
`banora recipe --name NAME` emits a complete ordinary automation request without
executing or reading user data. Save reviewed JSON or pipe it into `run`. The
installed CLI embeds the requests; no source checkout or template interpreter is
needed after installation. They demonstrate checkpoint resume, branch inspection,
search, preview, agreed scoring and an intentionally failed move. The
[workflow guide](../../examples/automation/README.md) connects explicit preview
approval, whole-record guards and one-step Undo across actual CLI requests.
Hosts own scheduling, file overlap prevention, authorization and reviewed data
replacement. The CLI starts no background worker or live-app session.
