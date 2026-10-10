# Terminal and Agent Automation

- Status: Headless JSON command API implemented; optional CLI consumer follows
- Decision: [ADR 0013](../adr/0013-machine-readable-terminal-automation.md)

`@banora/sdk/automation` (also the root/global export) exposes
`executeAutomation(unknown)`, `AUTOMATION_SCHEMA`, `AutomationRequest`,
`AutomationOperation`, `AutomationResponse` and `AutomationError`. Importing and
executing requires no browser globals, DOM types, framework or LLM dependency.

## Requests and Discovery

`AUTOMATION_SCHEMA` is an immutable JSON Schema 2020-12 document. It enumerates
allowed commands/fields, coordinate bounds and limits. All requests use
`schemaVersion: "banora.automation/v1"`. Reject unknown request/command fields;
geometric relationships, strokes, labels and game legality have further SDK checks.
Record text is at most 5 MiB of characters (the SGF parser also enforces its byte
limit), batches at most 256 operations, dimensions 2 through 52, and paths at most
128 child indices. No field executes code, shell commands or remote tools.

```ts
import {executeAutomation} from '@banora/sdk/automation';
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

Supported operation names are `play`, `previous`, `next`, `goto`, `comment`,
`marker`, `setup`, `connection`, `stroke`, `remove-stroke`, `clear-strokes`,
`remove-branch`, `reorder-branch`, `undo`, `redo`, `legal-points` and `score`.
Read their exact arguments from the schema rather than guessing CLI flag syntax.
Markers with null kind remove the point's marks; setup replaces that node's setup.
Scoring requires an explicit named profile and manually agreed dead/seki status.
Legal points use the selected position's actual replayed rules/history.

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

## External State Boundary

`kind:"snapshot", state:BoardSnapshot` validates and returns owned immutable
display data. It does not infer rules/history or approve host intentions. There
is no automatic attachment to existing browser views, servers or native apps.
An application can explicitly expose this public boundary over its own CLI/RPC,
with its own permissions, active-document/revision checks and subscriptions.
Terminal record automation and live application authority are separate boundaries.
Browser-only textures, placement motion and SVG/PNG view exports remain DOM APIs.
