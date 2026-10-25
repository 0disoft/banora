# ADR 0013: Machine-Readable Terminal Automation

- Status: Accepted; headless implementation and installed Node CLI evidence

## Decision

Expose a selective, DOM-free `@0disoft/banora/automation` JSON command boundary and an
optional `@0disoft/banora-cli` Node executable. Agents discover the versioned request JSON
Schema and operate on logical coordinates, portable record locators and structured
responses. No vision, browser, LLM vendor integration, credentials or extra runtime
dependencies are required.

Record requests create an isolated controller and delegate all transitions/edits
to existing public SDK APIs. Validate the entire request before applying a bounded
batch; failure returns no partially edited SGF. Successful output includes the
selected snapshot, navigation/annotation data and SGF. Node IDs and Undo/Redo are
request-local; game index and child-index paths are portable against the supplied
record. Optional scoring and legal-point queries use the actual replayed history.

Legal-point execution may reuse the last immutable Position's computed points
inside one request. Never key this reuse by board cells alone: turn, ko and rule
history affect legality. Keep query budgets independent of reuse, copy output
arrays/points per operation and retain no memo across request completion/failure.

External snapshot requests only validate/copy presentation state. Neither the CLI
nor the SDK automation layer applies intentions to externally owned games or
silently controls an already mounted application. Hosts may explicitly bind this
structured boundary to their own transport; permissions and revision checks remain
theirs. Arbitrary code evaluation, shell execution, background agents and automatic
network/native-engine connections are excluded.

The CLI reads one bounded request/file or stdin, writes exactly one JSON response
to stdout, and exits. File output is explicit, only on success, exclusive by default
and protects the input. Errors have stable codes and nonzero exit statuses.

## Consequences

LLMs can inspect and edit records without recreating Go rules or scraping pixels.
The additional public schema is versioned independently from package versions.
Installed CLI/SDK artifacts, actual Node processes, pipe/error/write handling and
headless types require consumer evidence. Browser-only textures/motion/PNG are not
invented as headless capabilities; existing diagram views remain DOM APIs.

The additive `recipe` CLI command returns a fixed catalog or an original complete
automation request. Embed requests in the built artifact so independent consumers
do not need a checkout. Discovery does not execute requests, look up user-supplied
filenames or introduce a template language. Standard request guards, checkpoints,
output protection and explicit scheduling ownership remain unchanged. The installed
Node consumer executes every recipe and guarded review/resume workflows; JSON shape
alone is insufficient evidence. See [workflows](../../examples/automation/README.md).
