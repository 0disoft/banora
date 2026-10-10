# Risk Register

- Status: Open risks with [local M1/M2 evidence](../engineering/09-milestone-audit.md); later milestone risks remain
- Technical owners: UNASSIGNED
- Related scope: [Product specification](02-spec.md)

| Risk | Consequence | Planned response / closure evidence |
| --- | --- | --- |
| Four-library replacement scope | M1 never becomes usable | Deliver the Studio SGF editing loop and read-only example first; defer scoring, puzzles, AI and extra renderers |
| SDK tailored to Studio internals | Other consumers need private hooks or editor dependencies | Studio uses public package exports; exercise a separate minimal read-only embedding example |
| Studio grows into a separate product | Demo work delays the SDK release | Keep its first scope to local SGF review/basic editing; defer accounts, cloud storage and analysis |
| Rule names hide incomplete semantics | Incorrect moves or results | Specify each profile's policies; cover ko, repetition, suicide and scoring with focused fixtures |
| SGF interpretation or encoding loses data | Edited records cannot be trusted | Define supported properties/encodings; round-trip real fixtures including unknown properties and branches |
| Large or malformed records | Frozen UI or excessive memory | Implemented input/tree/value limits and diagnostics are owned by SDK compatibility; measured large-record UI cost remains open |
| Duplicate state in UI and core | Renderer-specific game behavior | One state authority; adapters issue actions and subscribe to snapshots |
| Navigation mixed with edit Undo | Review actions obscure changes or restore the wrong branch | Separate cursor navigation, repetition history and record edit history; group comment edit sessions |
| Incorrect dirty/export baseline | Lost edits or misleading save status | Semantic comparison, Undo-to-baseline behavior and Export/Discard/Cancel; failed export/import preserves state; download is not proof of disk persistence |
| Late AI responses | Advice shown for the wrong position | Request identity, full analysis context, cancellation and apply-time freshness checks |
| Dead-stone prediction treated as fact | Misleading scores | Separate confirmed scoring from estimates and allow user correction |
| SVG performance with many boards | Slow lists or frequent overlays | Measure representative devices; add Canvas/workers only for observed bottlenecks |
| Package/framework coupling | Unusable headless imports or large bundles | Keep React/Vue/Svelte and DOM out of the headless core; isolate each adapter and inspect selective import output |
| Adapter lifecycle/compiler differences | Stale views, leaks, broken SSR or unusable component packages | Validate React, Vue, and Svelte consumers independently for updates, remount/cleanup, types/compiler packaging and client-only DOM creation |
| Native/browser compatibility assumed | Broken SSR, input or rendering | Declare tested runtime versions; browser wrappers mount explicitly; headless imports need no DOM |
| Unclear license or asset provenance | Distribution restrictions | Establish MIT licensing for original work; audit textures, fonts and third-party notices |
| Remote analysis credentials/data | Exposed secrets or unexpected uploads | Host-owned server credentials and explicit submission; no automatic remote calls |
| Unchecked performance claims | Misleading release documentation | Record measurements and limitations before claiming size, speed or compatibility |

## Decisions Still Open

- Registry name ownership and release versions. Implemented API identifiers,
  entrypoints and artifacts are owned by the SDK contracts; later APIs remain open.
- Broader browser support floors and additional runtime versions. The actual Node,
  browser, framework, peer/compiler and artifact evidence is recorded in compatibility.
- Remaining FF4 property coverage and additional encoding fixture evidence. The
  current subset, limits and acknowledgment API are documented in SDK contracts.
- Measured memory/latency/bundle budgets and benchmark devices; input limits are
  implemented and documented rather than UNDECIDED.
- Exact named-rule coverage, superko algorithms and scoring corner cases. The
  implemented version-1 BPN freehand format is owned by the public API contract.
- AI provider transport, authentication, deployment, pricing, and engine version.
- Hosted collaboration/storage design and any commercial service commitment.

Resolve each item in the owning document before its milestone claims support.
Package layout, initial major targets, client-only board rendering, SGF FF4/UTF-8
direction and editing/dirty-state semantics are recorded in
[ADR 0005](../adr/0005-initial-api-record-and-package-contracts.md).
