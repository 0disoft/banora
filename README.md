# Banora

A modular TypeScript SDK for building Go (Baduk/Weiqi) boards, game viewers,
editors, puzzles, and analysis interfaces.

**Status: early implementation.** Headless rules, SGF loading/export and the record
editing controller, SVG rendering, complete embeddable viewer and Studio are implemented. Official framework
adapters and later milestones remain in progress. Nothing is published yet.
The capabilities below describe the complete direction, not shipped support claims.
See [implementation status](docs/engineering/08-implementation-status.md).

## Local Development

Use Bun 1.x and Node 24.x. Run `bun install`, then `bun run check` for strict
typechecking, behavior tests, documentation checks and an ESM/declaration build.
Run `bun run dev` and open [Banora Studio](http://127.0.0.1:4317/studio/) or the
[read-only embed](http://127.0.0.1:4317/readonly/). `bun run build:examples` creates
static production examples. The [complete viewer](http://127.0.0.1:4317/viewer/)
demonstrates the convenience mount and optional editing. `bun run smoke:browser`
checks production browser flows
using Playwright CLI; a compatible browser installation is required.
The common SDK lives at `packages/sdk`; current exports are documented in the
[public API](docs/sdk/public-api.md). No framework or remote service is required.

## Direction

Banora should make a simple game viewer easy to embed and let developers extend
the same model into a complete Go application. It combines a customizable board,
shared game rules, SGF records, and optional integrations through clear boundaries.

- Framework-independent TypeScript core shared by browsers and servers.
- SVG board with themes, annotations, keyboard input, and mobile placement tools.
- SGF import/export, comments, variations, and an embeddable game viewer.
- Later milestones for scoring, puzzles, teaching tools, and external AI analysis.
- Optional React, Vue, and Svelte adapters, selective imports, and a browser script build.

The first release is driven by **Banora Studio**, a browser-based SGF review and
editing example at `examples/studio` in this repository. Its core flow
is to open a record, navigate variations, create a continuation, add comments or
markers, and download an SGF that can be reopened with those edits preserved.

Studio is available locally and as a static build; public hosting is pending. A
read-only example at `examples/readonly` exercises a second workflow. Both import
built public SDK exports without internal source access. See the
[roadmap](docs/product/01-roadmap.md) for sequencing and unimplemented capabilities.

The shared browser SDK is framework-independent. React, Vue, and Svelte are all
official adapter targets for M2; none is required by the core or renderer. See the
[framework support decision](docs/adr/0004-framework-independent-adapters.md).

Plan one common SDK package plus three separate adapters in this repository.
The [initial contracts](docs/adr/0005-initial-api-record-and-package-contracts.md)
define controller ownership, SGF FF4/UTF-8 handling, edit Undo and unsaved-change
behavior. Node 24 LTS, React 19, Vue 3 and Svelte 5 are initial compatibility
targets. The current headless artifact is checked on Node 24.14.0 and browser
flows on Headless Chrome 154; framework compatibility has not yet been established.

## Design Documents

- [Product brief](docs/product/00-product-brief.md): audience and differentiation.
- [Product specification](docs/product/02-spec.md): capability scope and acceptance.
- [Architecture](ARCHITECTURE.md): module boundaries and technology choices.
- [SDK contract](docs/sdk/README.md): API, packaging, compatibility, and examples.
- [Risk register](docs/product/03-risk-register.md): implementation uncertainties.
- [Documentation index](docs/README.md): authoritative documents and reading order.
- [Development](DEVELOPMENT.md): implementation approach and validation priorities.

## Open Source Direction

Original SDK code and documentation use the [MIT license](LICENSE). Current assets
are authored in this repository; there are no bundled textures, fonts or third-party
runtime assets. Audit additional asset provenance before distribution.

Hosted analysis, storage, and collaborative review are possible future services.
The SDK's local board, rules, and record functionality should work independently
of a hosted service.
