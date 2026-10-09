# SDK Compatibility

- Status: Planned policy; supported versions have not been established

## Distribution Direction

Use Vite library builds for ESM entrypoints, TypeScript declarations, and a browser
script distribution. React, Vue, and Svelte are optional dependencies of their
respective adapters and are not bundled into the core or required by other adapters.
Optional analysis, puzzle and renderer code must be excluded when the consumer
does not import it.

M1 validates the ESM/type package through Studio, a read-only browser example, and
a headless consumer. React, Vue, and Svelte adapters and browser script distribution
follow in M2; they must not block the first Studio release.

Choose exact export names and whether to use subpaths or separate packages during
M1. CommonJS support is UNDECIDED and must not be claimed without consumer evidence.

## Runtime Boundaries

| Surface | Intended environment | Support status |
| --- | --- | --- |
| Core and SGF | Browser and Node.js, no DOM required | Version floors UNDECIDED |
| SVG renderer and viewer | Browsers with the required SVG/input APIs | Tested matrix UNDECIDED |
| React adapter | Client-mounted React applications | Peer versions and SSR behavior UNDECIDED |
| Vue adapter | Client-mounted Vue applications | Peer versions and SSR behavior UNDECIDED |
| Svelte adapter | Client-mounted Svelte applications | Peer/compiler versions, component packaging and SSR behavior UNDECIDED |
| Bun | Development/package scripts | Tool version UNDECIDED; consumer runtime support unclaimed |
| AI adapter | Host-selected engine/service transport | Protocol/version matrix UNDECIDED |

Headless imports must not reference browser globals at module initialization.
Client views mount after a DOM is available. Do not advertise native mobile or
desktop toolkit rendering based solely on browser support.

Framework-independent browser use and official framework wrappers are separate
claims. A shared DOM mount API enables integration, but each wrapper's reactivity,
cleanup, SSR boundary and packaging must be verified before claiming support.
React, Vue, and Svelte consumers must not load one another's framework dependencies.
Keep native component packaging isolated from the core's TypeScript build; choose
actual peer dependency metadata, artifact formats and compiler versions during M2.

## Record Compatibility

Define the supported SGF version/subset, encodings, board sizes, annotation behavior,
and malformed-input policy. Preserve unrecognized properties semantically where
supported. Exact bytes and formatting are not guaranteed. No drop-in compatibility
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
Record the actual runtime versions tested. No release version or automatic bump applies while this
repository contains only its design scaffold.
