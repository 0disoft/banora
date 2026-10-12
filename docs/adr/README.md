# Architecture Decisions

ADRs record the design baseline and its rationale. A recorded direction does not
mean its implementation or compatibility has been validated.

| ADR                                                             | Status                                     | Subject                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [0001](0001-initial-architecture-boundaries.md)                 | Design baseline                            | TypeScript core, SVG rendering, module/state ownership and deferred optimizations                   |
| [0002](0002-contract-source-of-truth.md)                        | Design baseline                            | Contract ownership and planned-versus-implemented documentation                                     |
| [0003](0003-studio-first-consumer.md)                           | Design baseline                            | Banora Studio as first public SDK consumer, with a read-only embedding example                      |
| [0004](0004-framework-independent-adapters.md)                  | Design baseline                            | Framework-independent browser SDK with official optional React, Vue, and Svelte adapters            |
| [0005](0005-initial-api-record-and-package-contracts.md)        | Design baseline                            | Controller API, SGF FF4, edit history, export baselines, package layout and initial support targets |
| [0006](0006-explicit-repetition-and-rule-profile-boundaries.md) | Accepted; scoped headless/browser evidence | Explicit superko, immutable path history and rule profile coverage boundaries                       |
| [0007](0007-manual-scoring-and-named-profile-coverage.md)       | Accepted; headless and Studio evidence     | Manual agreed-position scoring, named presets, pass prisoners and coverage boundaries               |
| [0008](0008-curated-puzzle-authoring-and-session.md)            | Accepted; headless and browser evidence    | Explicit curated answer trees, deterministic responses, hints and isolated sessions                 |
| [0009](0009-analysis-context-and-external-provider-contract.md) | Accepted; headless implementation          | Exact context matching, provider-neutral metrics and explicit cancellable external analysis         |
| [0010](0010-katago-json-lines-and-supported-contexts.md)        | Accepted; local protocol fixtures          | Host-owned KataGo JSON lines, checked contexts, perspective conversion and scoped termination       |
| [0011](0011-isolated-analysis-view-and-explicit-consumer.md)    | Accepted; installed and browser evidence   | Isolated PV/ownership display, explicit submission and common runnable analysis consumer            |

The additive [host-controlled board decision](0012-host-controlled-board-and-presentation-boundary.md)
defines external snapshot authority, input intentions and shared presentation.

The [terminal automation decision](0013-machine-readable-terminal-automation.md)
defines checked JSON commands and an optional agent-friendly CLI consumer.

The [development bootstrap decision](0014-development-bootstrap-and-boundary-gates.md)
defines supported tools, safe local commands and executable module boundaries.

The [CI/update decision](0015-change-aware-ci-and-supported-major-updates.md)
defines affected checks, local parity, read-only authority and supported-major updates.

Update the owning ADR when a design changes and describe the consequences for
consumers and validation. Keep unresolved choices explicit. Use the
[ADR template](0000-template.md) for future decisions and link them here.

The [recovery decision](0016-portable-record-recovery.md) defines portable working
records, export baselines, selected locations and host-owned persistence.

The [Studio storage decision](0017-studio-local-draft-storage.md) defines bounded
IndexedDB drafts, ownership, revisions and explicit recovery/deletion requirements.

The [preference decision](0018-versioned-studio-preferences.md) defines validated
scalar settings, safe legacy migration and reset independent of authored records.

The [record tools decision](0019-record-search-and-atomic-comment-batches.md)
defines whole-record search and controller-owned atomic comment previews/application.

The [diagnostics decision](0020-explicit-redacted-diagnostics.md) defines explicit
bounded local operation evidence, safe failure policy and a closed support-report projection.

The [operational recovery decision](0021-isolated-operational-recovery-checks.md)
defines isolated backup validation/drills, safe reports and concrete local runbooks.

The [retained release decision](0022-retained-release-artifacts.md) defines clean-source
artifact preparation, exact-byte consumer checks and isolated restaging without publication.

The [publisher identity decision](0023-existing-publisher-package-identity.md)
uses the existing personal npm scope throughout local packages and consumers while
preserving verification/restaging of retained pre-rename release bundles.

The [demo backup decision](0024-draft-release-demo-backups.md) preserves original
static artifacts in maintainer-only draft assets and verifies independent hashes
when restoring without original Actions retention.
