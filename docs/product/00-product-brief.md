# Product Brief

- Status: Design baseline; implementation not started
- Technical owner: UNASSIGNED
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

## Design Priorities

1. A complete embeddable viewer with a small integration surface.
2. Reusable rules and record logic in browsers and servers.
3. Clear control of board appearance, input, state, and lifecycle.
4. Preservation of comments, branches, and unfamiliar SGF properties.
5. Accessible keyboard interaction and deliberate mobile move placement.
6. Optional modules so simple consumers do not load unrelated features.

## Differentiation

The design draws on the viewer experience of WGo.js, the application capabilities
of OGS Goban, the presentation customization of Shudan, and the modular approach
of jGoBoard. These are reference projects, not promises of API compatibility or
automatic migration.

Distinctive workflows include magnified touch placement, side-by-side variation
comparison with changed stones highlighted, record-preserving editing, and
runnable examples for common integrations.

## Open Source and Sustainability

MIT is the intended license for original code and bundled assets, subject to a
license file and verified provenance before distribution. Maintain separate
license notices for any third-party code, fonts, images, and analysis components.

Possible paid services include hosted AI analysis, collaborative reviews, and
record storage. These are exploratory business options, not first-release
requirements. Local SDK functionality must not require an account or telemetry.

## Non-Goals

The initial SDK does not own matchmaking, account management, rankings, payments,
a game server, AI model training, or desktop/mobile application shells. Hosts may
build these around Banora through documented integration boundaries.
