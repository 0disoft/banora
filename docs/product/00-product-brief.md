# Product Brief

- Status: Initial `0.1.0` SDK family published; implemented scope and tested environments
  are recorded in the [release evidence](../engineering/27-initial-default-channel-release-evidence.md)
  and [compatibility contract](../sdk/compatibility.md)
- Technical owner: `0disoft` (solo maintainer)
- Product scope: [Product specification](02-spec.md)

## Purpose

Build Banora as an open-source SDK that makes Go applications easy to embed,
customize, and extend. A small viewer and a larger application should use the same
board, rules, and record model rather than separate implementations.

## Audience and Use Cases

- Developers embedding SGF records in articles and community websites.
- Application authors building game record editors and study tools.
- Teachers creating diagrams, exercises, and interactive explanations.
- Puzzle authors building curated problem sets with scripted responses.
- Developers displaying results from an external Go AI engine.

## First Consumer: Banora Studio

The first integration target is Banora Studio, a browser-based SGF review and
editing application implemented in `examples/studio` in the same repository. It is
both a usable public demo for Go players and a reference consumer for developers.

The initial interface contains a board, move navigation controls, a variation
tree, and a comments panel. Users open a local SGF or bundled example, review its
branches, create a variation, add comments/markers, and download the edited record.
Reopening the download must preserve the supported edits and original properties.

Local file workflows require no account, cloud storage, or analysis service.
Studio consumes only public SDK exports. A small read-only embedding example
guards against tailoring the API solely to this editor. See
[ADR 0003](../adr/0003-studio-first-consumer.md) for the decision and
[the specification](02-spec.md) for release acceptance.

## Design Priorities

1. A complete embeddable viewer with a small integration surface.
2. Reusable rules and record logic in browsers and servers.
3. Clear control of board appearance, input, state, and lifecycle.
4. Preservation of comments, branches, and unfamiliar SGF properties.
5. Accessible keyboard interaction and deliberate mobile move placement.
6. Optional modules so simple consumers do not load unrelated features.
7. Official React, Vue, and Svelte adapters over a framework-independent browser SDK;
   consumers adopt their preferred framework without changing game or record behavior.

## Differentiation

The design draws on the viewer experience of WGo.js, the application capabilities
of OGS Goban, the presentation customization of Shudan, and the modular approach
of jGoBoard. These are reference projects, not promises of API compatibility or
automatic migration.

Distinctive workflows include magnified touch placement, side-by-side variation
comparison with changed stones highlighted, record-preserving editing, and
runnable examples for common integrations.

## Open Source and Sustainability

Original code is distributed under the repository's [MIT license](../../LICENSE),
also included in the published packages and classic-script notice. Maintain separate
license notices for any third-party code, fonts, images, and analysis components.

Possible paid services include hosted AI analysis, collaborative reviews, and
record storage. These are exploratory business options, not first-release
requirements. Local SDK functionality must not require an account or telemetry.

## Non-Goals

The initial SDK does not own matchmaking, account management, rankings, payments,
a game server, AI model training, or desktop/mobile application shells. Hosts may
build these around Banora through documented integration boundaries.
