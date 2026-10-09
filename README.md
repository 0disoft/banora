# Banora

A modular TypeScript SDK for building Go (Baduk/Weiqi) boards, game viewers,
editors, puzzles, and analysis interfaces.

**Status: design stage.** This repository currently contains design documents,
not a working SDK. The capabilities below are planned; installation instructions,
published packages, and supported runtime versions are not yet available.

## Direction

Banora should make a simple game viewer easy to embed and let developers extend
the same model into a complete Go application. It combines a customizable board,
shared game rules, SGF records, and optional integrations through clear boundaries.

- Framework-independent TypeScript core shared by browsers and servers.
- SVG board with themes, annotations, keyboard input, and mobile placement tools.
- SGF import/export, comments, variations, and an embeddable game viewer.
- Later milestones for scoring, puzzles, teaching tools, and external AI analysis.
- Optional React integration, selective imports, and a browser script build.

The first release is driven by **Banora Studio**, a browser-based SGF review and
editing example planned for `examples/studio` in this repository. Its core flow
is to open a record, navigate variations, create a continuation, add comments or
markers, and download an SGF that can be reopened with those edits preserved.

Studio will also serve as the public demo. A small read-only embedding example
will exercise a second consumer workflow. Both must use the SDK's public package
exports rather than internal source imports. See the
[roadmap](docs/product/01-roadmap.md) for sequencing. These examples do not exist yet.

## Design Documents

- [Product brief](docs/product/00-product-brief.md): audience and differentiation.
- [Product specification](docs/product/02-spec.md): capability scope and acceptance.
- [Architecture](ARCHITECTURE.md): module boundaries and technology choices.
- [SDK contract](docs/sdk/README.md): API, packaging, compatibility, and examples.
- [Risk register](docs/product/03-risk-register.md): implementation uncertainties.
- [Documentation index](docs/README.md): authoritative documents and reading order.
- [Development](DEVELOPMENT.md): implementation approach and validation priorities.

## Open Source Direction

The intended license for original SDK code and bundled assets is MIT. A license
file and asset provenance must be established before distribution; this design
statement does not itself license any files or third-party components.

Hosted analysis, storage, and collaborative review are possible future services.
The SDK's local board, rules, and record functionality should work independently
of a hosted service.
