# Banora CLI

An optional Node 24.x terminal consumer of the Banora SDK. Agents operate on
logical board state and SGF with JSON requests/responses, without vision, a
browser, an LLM service or a framework. This development package is unpublished.

## Local Use and Installation

In the repository, run `bun install`, then `bun run build:cli`. Run commands as
`bun run cli --help`, `bun run cli schema` or directly as
`node packages/cli/dist/main.js schema`. The direct Node form produces only JSON
on stdout; package-manager command banners are not CLI response content.

To install built artifacts in another project, create SDK/CLI tarballs with
`bun pm pack --ignore-scripts` from their respective package directories, then
install both with `npm install /absolute/path/sdk.tgz /absolute/path/cli.tgz`
(use their actual filenames). Invoke the installed executable with
`npx --no-install banora --help`. SDK peer resolution is verified with npm;
registry installation cannot be assumed before publication.

## Discover First

`banora --help` returns command/flag discovery and exit codes as JSON.
`banora schema` returns the immutable JSON Schema for every request/operation.
`banora --version` returns package version JSON. No command prompts interactively.
Requests use `schemaVersion:"banora.automation/v1"`; results contain `ok` and either
data or structured `error:{code,message,operationIndex?,reason?}`. Schema discovery
itself returns a JSON Schema rather than a result envelope.

| Command                                              | Input                                      | Result                                            |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `banora run --request request.json`                  | Full automation request; defaults to stdin | Record operations/queries or snapshot validation  |
| `banora create --size 9`                             | New square board; defaults to 19           | Initial record/snapshot                           |
| `banora inspect --input game.sgf --tree`             | SGF file or `-`; optional full tree        | Root state, children, SGF and optional game trees |
| `banora edit --input game.sgf --operations ops.json` | SGF plus JSON operation array              | Edited SGF and selected state                     |
| `banora snapshot --input state.json`                 | Plain `BoardSnapshot` JSON                 | Normalized external display state                 |

`create` also accepts `--operations`; record convenience commands accept `--profile`
with `japanese-territory`, `aga-territory`, `aga-area` or `tromp-taylor`. For initial
selection and all other options, use the full JSON `run` request. Default rules
remain the SDK's simple-ko/suicide-forbidden policy. Choose a scoring profile
explicitly when requesting a score.

Example `request.json`:

```json
{
  "schemaVersion": "banora.automation/v1",
  "kind": "record",
  "size": 9,
  "operations": [
    { "op": "play", "point": { "x": 4, "y": 4 } },
    { "op": "comment", "text": "Reviewed by an agent" },
    { "op": "legal-points" }
  ]
}
```

Run `banora run --request request.json --output reviewed.sgf`, or pipe that JSON
to `banora run`. Using files/stdin avoids shell-dependent escaping. Coordinates
are zero-based from the top left; null play points mean pass. Record locators use
`{gameIndex,path:[childIndex,...]}` against the current tree. Results expose the
portable selected locator, properties/children, row-major stones, rules/captures,
logical annotations, history flags, query results and SGF.

Operation names: `play`, `previous`, `next`, `goto`, `comment`, `marker`, `setup`,
`connection`, `stroke`, `remove-stroke`, `clear-strokes`, `remove-branch`,
`reorder-branch`, `undo`, `redo`, `legal-points`, `score`. Exact fields are in
`banora schema`; unknown/repeated CLI flags and unknown request/operation fields
are errors. Score output depends on manually agreed dead/seki status, not automatic
life-and-death detection.

## Output, Errors and Ownership

The executable writes exactly one JSON document plus newline to stdout, including
errors; callers check the exit status and `ok`. Exit statuses: 0 success, 2 usage/
read/JSON/size limit failure, 3 SDK validation/command failure, 4 output-save failure.
Input reads are bounded to 8 MiB; SGF retains its own 5 MiB/parser limits and JSON
batches have at most 256 operations. All batches run on a disposable private
controller. Legal-point scans share an 8,192-candidate-cell per-request budget.
A failed batch exposes no partly edited record and writes no output.

Without `--output`, nothing is saved. Successful `--output PATH` saves SGF for a
record or normalized snapshot JSON for external state. Publication uses a complete
temporary file beside the output, exclusive by default. Existing outputs require
`--force`; input paths/realpath aliases remain protected. Filesystem failures have
an output error; stdout alone does not imply the file was saved.
Inputs remain unchanged, including SGF unknown-property semantic preservation.
SGF byte input follows the SDK's declared-encoding decoder; JSON is UTF-8.

Each invocation is independent. Undo/Redo and IDs are request-local; persist SGF
and portable locations for later invocations. The default snapshot key
`local-record` is not a host revision: provide `stateKey` when integrating a host.
External snapshots are inspected only; the CLI never approves intentions or
automatically controls a mounted application. Hosts own live-state permissions,
revisions, transport and engine integration. SVG/PNG browser view exports remain
DOM APIs; the CLI's headless output formats are structured state and SGF.

See [the full automation contract](https://github.com/0disoft/banora/blob/main/docs/sdk/automation.md).
`bun run smoke:cli` checks isolated npm tarball installation, the installed bin and
actual Node process/stdin/error/output behavior; it does not require a browser.
