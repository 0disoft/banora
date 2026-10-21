# ADR 0016: Portable Record Recovery

- Status: Accepted; SDK/terminal and Studio local persistence implemented

## Decision

Add a versioned, DOM-free `RecordCheckpoint` containing the current SGF, the last
acknowledged SGF baseline, a portable selected locator and the complete legal-play
policy. `RecordController.createCheckpoint()` reads data without acknowledging an
export. `loadCheckpoint()` validates both records, policy and selected-path replay
before replacement and respects the existing unsaved-change guard.

Restore starts a new controller generation and editing session, invalidating old
export tickets and clearing Undo/Redo. Dirty state is derived from semantic content
against the restored baseline; a caller cannot assert that unsaved work is clean.
SGF replay retains its documented semantics, including occupied recorded moves;
new play still uses the restored legality/repetition policy.

Hosts own storage, retention, access control, encryption, quotas and concurrent
writes. SDK imports never access browser storage or remote services. Studio's
autosave/backup integration is a separate consumer module, with explicit
recovery and deletion controls, failure feedback and isolation between tabs.
The existing SGF/share formats do not acquire hidden recovery metadata.

Terminal automation accepts a checkpoint instead of its SGF/size/profile/initial
selection fields and emits checkpoints only when requested. Incompatible or future
versions fail explicitly; no automatic migration is invented.

## Alternatives and Consequences

Saving only SGF loses the export baseline and selected location. Persisting live
node IDs or serialized controller internals couples recovery to a session and
implementation. Persisting the full Undo stack retains many document versions and
increases storage and migration costs; Undo remains session-local.

Recovery data includes both the working and baseline documents, which may contain
private names, comments or deleted material. Treat it as document content, never
as redacted diagnostics or an embedded sharing payload. Each SGF obeys the usual
parser limits; the default discovery envelope bounds each text to 5 MiB of
characters and paths to 49,999 indices. The terminal's entire JSON input remains
bounded to 8 MiB, so near-limit documents may require host SDK storage instead.

The controller retains one immutable baseline reference and up to eight existing
export-ticket references. A two-record serialization cache avoids rewriting SGF
on repeated navigation without caching every Undo version. Cache hits refresh
recency so checkpoints keep the frequently read baseline while edits replace the
working record; the cache still retains at most two records and their strings.
Successful full edit validation places its exact canonical SGF in that same cache,
so a subsequent checkpoint/export can reuse it. Failed validation leaves the cache
untouched. Delta-only comment validation does not have a whole-record string to
reuse and retains lazy serialization. Cache eviction never skips edit validation.
Import, checkpoint replacement and disposal clear it. This introduces no
database, cloud service or runtime dependency.
