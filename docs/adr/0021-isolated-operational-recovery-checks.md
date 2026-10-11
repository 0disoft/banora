# ADR 0021: Isolated Operational Recovery Checks

- Status: Accepted; repository operations commands implemented

## Decision

Expose `bun run ops --help`, `recovery-check --input FILE|-` and `drill-recovery`
through a repository-owned Bun script, using built public SDK exports. This is
maintainer/reference-consumer tooling, not a new package or a host's live database
administration API. Setup/build prerequisites are explicit.

Recovery check accepts a raw portable checkpoint or the existing Studio draft
wrapper, sharing Studio metadata validation and its 64 MiB backup input cap.
Read bounded UTF-8 JSON, validate the checkpoint, restore into a disposable controller
and compare canonical working/export-baseline documents, selected locator, saved
policy, recomputed dirty state and cleared prior Undo/Redo. Return fixed checks,
format and outcome only, with no SGF, name, ID, filename/path, raw message or stack.
No authored file, browser storage, provider, network or export acknowledgment is changed.
No schema migration/provenance/authentication or disk-durability claim is inferred.

The drill uses the committed authored study fixture and actual controller operations
to rehearse serialized restore, corrupt/future input preservation, dirty replacement
guards, explicit replacement and post-restore Undo. It reports its in-memory scope
instead of implying a physical/browser/service recovery exercise. Hosts own measured
RTO/RPO, off-device backups, retention, authorization and deployments.

Keep configuration, secrets, incident response and backup procedures concrete with
real commands, failure actions and owners. Maintainer/host roles are defined without
inventing contacts, credentials, an on-call team, hosted infrastructure or publication
evidence. Missing private reporting/release preparation remains explicit active work.

## Alternatives and Consequences

Schema-only validation cannot prove controller restoration or baseline/location
preservation. Automatically opening/overwriting a live editor or browser profile can
destroy the evidence being recovered. Running an entire browser suite for an isolated
operations-script edit wastes time; source changes route to root checks without
browser extras, while actual storage/consumer changes retain browser coverage.
Unknown versions are preserved and rejected, never silently coerced. Reports do
not prove who created a backup; integrity/authentication belongs to the host.

## Evidence

Tests exercise actual public artifact restoration, multi-game branches, custom
policy, dirty/clean baselines, immutable source ownership, malformed/future/corrupt
input and fixed content-free failures. Actual Bun command processes exercise
discovery, file/stdin/BOM/invalid UTF-8, misuse and unchanged input bytes. The drill
executes against the committed study. Existing separate production browser recovery
fixtures cover local draft storage and user controls; no OS failure or remote rollback
is claimed by this tool.
