# SDK Compatibility

- Status: Planned policy; initial targets selected, tested support not established
- Decision: [ADR 0005](../adr/0005-initial-api-record-and-package-contracts.md)

## Distribution Direction

Use Vite library builds for ESM entrypoints, TypeScript declarations, and a browser
script distribution. React, Vue, and Svelte are optional dependencies of their
respective adapters and are not bundled into the core or required by other adapters.
Optional analysis, puzzle and renderer code must be excluded when the consumer
does not import it.

M1 validates the ESM/type package through Studio, a read-only browser example, and
a headless consumer. React, Vue, and Svelte adapters and browser script distribution
follow in M2; they must not block the first Studio release.

Use one repository with one common SDK package and three separate optional adapter
packages: React, Vue and Svelte. Logical core/record/renderer modules may use selective
entrypoints within the common SDK; they are not separate release units. Exact npm
names, entrypoints and exported symbols remain UNDECIDED. CommonJS support is
UNDECIDED and must not be claimed without consumer evidence.

## Runtime Boundaries

| Surface | Intended environment | Support status |
| --- | --- | --- |
| Core and SGF | Browser and Node.js, no DOM required | Initial Node 24 LTS target; browser floors and tested evidence pending |
| SVG renderer and viewer | Browsers with the required SVG/input APIs | Tested matrix UNDECIDED |
| React adapter | Client-mounted React applications | React 19 target; peer minimums and consumer evidence pending |
| Vue adapter | Client-mounted Vue applications | Vue 3 target; peer minimums and consumer evidence pending |
| Svelte adapter | Client-mounted Svelte applications | Svelte 5 target; compiler/artifact details and consumer evidence pending |
| Bun | Development/package scripts | Tool version UNDECIDED; consumer runtime support unclaimed |
| AI adapter | Host-selected engine/service transport | Protocol/version matrix UNDECIDED |

Headless imports must not reference browser globals at module initialization.
Headless core/records are intended for server-side use; board views mount after a
DOM is available on the client. Server-rendered board HTML and hydration are deferred.
Verify safe imports and this boundary in each adapter before claiming SSR compatibility.
Do not advertise native mobile or
desktop toolkit rendering based solely on browser support.

Framework-independent browser use and official framework wrappers are separate
claims. A shared DOM mount API enables integration, but each wrapper's reactivity,
cleanup, SSR boundary and packaging must be verified before claiming support.
React, Vue, and Svelte consumers must not load one another's framework dependencies.
Keep native component packaging isolated from the core's TypeScript build; choose
actual peer dependency metadata, artifact formats and compiler versions during M2.

## Record Compatibility

Initially target SGF FF4 for Go, using the [preservation contract](../product/02-spec.md#sgf-preservation).
Prioritize moves/pass, setup, branches, comments, player/game metadata, labels and
shape markers. File bytes follow declared encoding; string input is already decoded.
Export UTF-8 and preserve unknown properties semantically through supported edits.
Supported input encodings, absent-encoding behavior, detailed property coverage,
board-size limits and malformed-input limits must be documented before release.
Exact bytes and formatting are not guaranteed. No drop-in compatibility
with WGo.js, Goban, Shudan or jGoBoard APIs is assumed.

## Versioning and Migration

Use semantic versioning and document breaking consumer changes, including during
pre-1.0 development. Add migration examples when changing actions, events,
coordinates, ownership, record semantics or package exports. Maintain a documented
deprecation path when feasible; never silently reinterpret saved records.

Keep dependencies on explicit compatible major lines, allow stable updates within
those lines, and promote a new major after focused consumer compatibility checks.
Lockfiles capture the exact dependency graph used for a build; they are not a
policy of permanently freezing dependencies.

## Release Evidence

Validate the packed artifact in Studio, the read-only browser example and a headless
consumer, check declarations, exports, asset paths and notices, and run the relevant
examples. Reopen Studio's exported SGF to confirm the editing loop. Record the actual
framework peer/compiler versions and independently run each adapter consumer as it
ships. Verify client-only DOM creation, update propagation, remount cleanup and package
types/artifacts rather than inferring compatibility from the plain-browser example.
Scope checks and releases to changed packages and affected consumers; common SDK
changes may require adapter checks, but unrelated edits do not require a full matrix.
Record the actual runtime versions tested. No release version or automatic bump applies while this
repository contains only its design scaffold.
