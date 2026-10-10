# Dependency and Change Policy

- Status: Active policy; common SDK has no runtime dependencies
- Contract: [Compatibility](../sdk/compatibility.md)
- Technical owner: UNASSIGNED

## Dependency Selection

Keep the headless core's runtime dependency surface small. Evaluate a dependency's
purpose, alternatives, maintenance, license, runtime/bundle effect and replacement
cost. UI/framework and provider dependencies belong in their optional surfaces.
React, Vue, and Svelte belong only to their respective adapters' dependency surfaces.
No framework may become a required core/renderer import or a dependency of another
framework's adapter. Resolve peer/compiler metadata with real consumer builds.

Use explicit compatible major-version ranges and accept stable updates within a
supported major line. Lockfiles record exact build inputs. Promote a new major
intentionally after the affected consumer examples and compatibility checks pass.
Tooling currently follows Bun 1.x, TypeScript 7.x and Vite 8.x. Root devDependencies
and bun.lock record the build graph; framework dependencies will remain isolated.

## Changes and Releases

Update the owning spec/API/ADR when consumer behavior changes. Record breaking
changes and migration examples. Package release validation covers declarations,
exports, assets/notices and actual browser/headless consumers.

Keep changes cohesive, commit finished tasks, and batch validated pushes and
release work. Avoid adding a wide CI matrix or repeated full suites without a
specific compatibility/risk need.

## Licensing

MIT is the intended license for original SDK code and bundled assets. Establish
the actual license file and asset provenance before distribution. Third-party
components and external AI models/engines retain their own terms; the SDK's license
does not grant rights to them. Reference projects are design references, not an
instruction to copy their implementations or assets.
