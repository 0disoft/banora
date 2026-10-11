# Reusable Terminal Workflows

The optional unpublished CLI includes five original JSON requests in its built
artifact. Run `bun run setup` and `bun run build:cli` from the repository first.
After a separate reviewed package installation, use `banora` in place of
`node packages/cli/dist/main.js`.

```sh
node packages/cli/dist/main.js recipe
node packages/cli/dist/main.js recipe --name create-study
node packages/cli/dist/main.js recipe --name create-study | node packages/cli/dist/main.js run
```

Discovery returns a catalog; selecting a name returns a complete canonical
automation request ready to save or pipe to `run`. Discovery never executes a
recipe, reads a user document or looks up a supplied name as a filename. Requests
use ordinary `banora.automation/v1`, with no template DSL, code evaluation, account
or network connection. Direct executable stdout contains one JSON document;
package-manager banners do not belong in a request pipe.

| Name               | Purpose                              | Expected result                                               |
| ------------------ | ------------------------------------ | ------------------------------------------------------------- |
| `create-study`     | Create, annotate, search, checkpoint | Two moves, comment/circle, one match and a dirty checkpoint   |
| `inspect-branches` | Inspect collection/branch and search | Three comment hits across two games; no edits                 |
| `review-preview`   | Preview guarded comment batch        | Two before/after edits; source and selection stay unchanged   |
| `score-agreed`     | Explicitly agreed area score         | White by 6.5; no automatic life/death judgment or record edit |
| `occupied-point`   | Reproduce illegal-placement failure  | Exit 3 at operation index 1; no partially edited SGF          |

Source requests live in [the CLI recipes](../../packages/cli/recipes/create-study.json).
All data is repository-authored demonstration content. Replace source SGF,
targets, text, rules and score agreement deliberately when adapting to real work.
Do not apply an example's child indices to an unrelated record. The negative
example is marked `command-failed` in discovery.

## Save and Reuse

Save a discovered request as UTF-8 JSON, review it, then run:

```sh
node packages/cli/dist/main.js run --request request.json --output reviewed.sgf
```

`--output` explicitly saves successful record SGF, not the response/checkpoint.
Save the response JSON separately when you need query results or recovery state.
Existing output requires explicit `--force`, and input paths remain protected.
Without output flags nothing is written. Scheduled/conditional invocation belongs
to the host's scheduler, with its own file permissions, revision checks, overlap
prevention and bounded retries. The CLI runs once and exits; a discovery command
does not install a scheduler or control an already mounted board.

## Checkpoint Resume Across Processes

`create-study` returns a `checkpoint`. Save that exact value and build a second
request using `schemaVersion`, `kind: "record"`, `checkpoint` and any desired
`operations`. Omit `sgf`, `size`, `profile` and initial `selection` when supplying
a checkpoint. Selection, rules, working record and export baseline resume; prior
Undo does not. Append edits/Undo only within the new request. See
[recovery](../../docs/sdk/recovery.md). Do not replace a live application's document
without its dirty-change and authorization guards.

## Preview, Review, Apply and Undo

Run `review-preview` first and inspect `results[0].value.edits`. It returns unchanged
canonical `sgf` and preserves the selected move. For an explicitly approved request,
retain the source request's `changes`, set `previewOnly: false`, and add that exact
preview response's `sgf` as `expectedSgf`. Run against the current source record and
save to a new output. Any intervening content change rejects `stale-preview`;
per-comment `expectedText` alone is not a whole-record revision guard.

Appending `{ "op": "undo" }` in the same application request reverses the entire
batch in one step. Separate invocations do not share Undo or controller IDs. A failed
request contains no partial authored state and publishes no output; correct the
reported zero-based operation before retry. Hosts still own concurrent file locks,
collaborative approval and role checks. See [automation](../../docs/sdk/automation.md).

The installed-tarball check executes every discovered request through actual Node
CLI processes, then resumes the returned checkpoint, explicitly approves/undoes
the preview and rejects intervening changes. It verifies scoring and failure output,
not just recipe JSON shape. Use `bun run smoke:cli`; no browser is required.
