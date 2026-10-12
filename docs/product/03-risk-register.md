# Risk Register

- Status: M1-M4 implementation and initial `0.1.0` publication verified in the
  [delivery audit](../engineering/10-delivery-audit.md) and
  [release evidence](../engineering/27-initial-default-channel-release-evidence.md);
  broader environment, provider and host-service risks remain
- Technical owner: `0disoft` (solo maintainer)
- Related scope: [Product specification](02-spec.md)

| Risk                                      | Consequence                                                   | Planned response / closure evidence                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Four-library replacement scope            | Useful delivery is delayed                                    | Studio/read-only and M1-M4 local exit evidence are complete; further renderers/services require measured need and separate scope                          |
| SDK tailored to Studio internals          | Other consumers need private hooks or editor dependencies     | Studio uses public package exports; exercise a separate minimal read-only embedding example                                                               |
| Studio grows into a separate product      | Demo work delays the SDK release                              | Keep its first scope to local SGF review/basic editing; defer accounts, cloud storage and analysis                                                        |
| Rule names hide incomplete semantics      | Incorrect moves or results                                    | Specify each profile's policies; cover ko, repetition, suicide and scoring with focused fixtures                                                          |
| SGF interpretation or encoding loses data | Edited records cannot be trusted                              | Define supported properties/encodings; round-trip real fixtures including unknown properties and branches                                                 |
| Large or malformed records                | Frozen UI or excessive memory                                 | Input/tree/value limits and actual Node/Studio timing plus lifecycle measurements exist; peak/RSS, other workloads and device budgets remain unverified   |
| Duplicate state in UI and core            | Renderer-specific game behavior                               | One state authority; adapters issue actions and subscribe to snapshots                                                                                    |
| Navigation mixed with edit Undo           | Review actions obscure changes or restore the wrong branch    | Separate cursor navigation, repetition history and record edit history; group comment edit sessions                                                       |
| Incorrect dirty/export baseline           | Lost edits or misleading save status                          | Semantic comparison, Undo-to-baseline behavior and Export/Discard/Cancel; failed export/import preserves state; download is not proof of disk persistence |
| Late AI responses                         | Advice shown for the wrong position                           | Request identity, full analysis context, cancellation and apply-time freshness checks                                                                     |
| Dead-stone prediction treated as fact     | Misleading scores                                             | Separate confirmed scoring from estimates and allow user correction                                                                                       |
| SVG performance with many boards          | Slow lists or frequent overlays                               | Measure representative devices; add Canvas/workers only for observed bottlenecks                                                                          |
| Package/framework coupling                | Unusable headless imports or large bundles                    | Keep React/Vue/Svelte and DOM out of the headless core; isolate each adapter and inspect selective import output                                          |
| Adapter lifecycle/compiler differences    | Stale views, leaks, broken SSR or unusable component packages | Validate React, Vue, and Svelte consumers independently for updates, remount/cleanup, types/compiler packaging and client-only DOM creation               |
| Native/browser compatibility assumed      | Broken SSR, input or rendering                                | Declare tested runtime versions; browser wrappers mount explicitly; headless imports need no DOM                                                          |
| Unclear license or asset provenance       | Distribution restrictions                                     | Establish MIT licensing for original work; audit textures, fonts and third-party notices                                                                  |
| Remote analysis credentials/data          | Exposed secrets or unexpected uploads                         | Host-owned server credentials and explicit submission; no automatic remote calls                                                                          |
| Unchecked performance claims              | Misleading release documentation                              | Record measurements and limitations before claiming size, speed or compatibility                                                                          |

## Decisions Still Open

- Future releases and extensions beyond the published `@0disoft` initial `0.1.0`
  family. Package names, peers, exports and executed publication are resolved in
  [ADR 0023](../adr/0023-existing-publisher-package-identity.md) and
  [ADR 0025](../adr/0025-initial-default-channel-release.md).
- Broader browser support floors and additional runtime versions. The actual Node,
  browser, framework, peer/compiler and artifact evidence is recorded in compatibility.
- Remaining FF4 property coverage and additional encoding fixture evidence. The
  current subset, limits and acknowledgment API are documented in SDK contracts.
- Measured memory/latency/bundle budgets and benchmark devices; input limits are
  implemented and documented rather than UNDECIDED.
- Additional tournament-rule/scoring coverage beyond the explicit agreed-position
  policies. Implemented exact superko, preset/scoring boundaries and version-1 BPN
  freehand encoding are owned by the public API and ADRs 0006/0007.
- AI provider authentication, deployment and pricing; additional engine/model/
  backend versions beyond the [selected local CPU evidence](../engineering/11-live-katago-evidence.md).
  Host-owned stdio is demonstrated; broader service transports remain host choices.
- Hosted collaboration/storage design and any commercial service commitment.

Measured [Node](../engineering/14-sdk-performance-evidence.md),
[Studio](../engineering/17-browser-performance-evidence.md) and
[retained lifecycle resources](../engineering/22-browser-memory-lifecycle-evidence.md)
establish scoped baselines and observed improvements. They do not supply universal
latency/byte thresholds, peak memory or real-device guarantees.

Resolve each item in the owning document before its milestone claims support.
Package layout, initial major targets, client-only board rendering, SGF FF4/UTF-8
direction and editing/dirty-state semantics are recorded in
[ADR 0005](../adr/0005-initial-api-record-and-package-contracts.md).
