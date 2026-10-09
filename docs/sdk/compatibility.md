# SDK Compatibility

- Status: Planned policy; supported versions have not been established

## Distribution Direction

Use Vite library builds for ESM entrypoints, TypeScript declarations, and a browser
script distribution. React is an optional peer dependency for its adapter and is
not bundled into the core. Optional analysis, puzzle and renderer code must be
excluded when the consumer does not import it.

Choose exact export names and whether to use subpaths or separate packages during
M1. CommonJS support is UNDECIDED and must not be claimed without consumer evidence.

## Runtime Boundaries

| Surface | Intended environment | Support status |
| --- | --- | --- |
| Core and SGF | Browser and Node.js, no DOM required | Version floors UNDECIDED |
| SVG renderer and viewer | Browsers with the required SVG/input APIs | Tested matrix UNDECIDED |
| React adapter | Client-mounted React applications | Peer versions and SSR behavior UNDECIDED |
| Bun | Development/package scripts | Tool version UNDECIDED; consumer runtime support unclaimed |
| AI adapter | Host-selected engine/service transport | Protocol/version matrix UNDECIDED |

Headless imports must not reference browser globals at module initialization.
Client views mount after a DOM is available. Do not advertise native mobile or
desktop toolkit rendering based solely on browser support.

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

Validate the packed artifact in browser and headless consumers, check declarations,
exports, asset paths and notices, and run the relevant examples. Record the actual
runtime versions tested. No release version or automatic bump applies while this
repository contains only its design scaffold.
