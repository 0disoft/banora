# Banora

A modular TypeScript SDK for building Go (Baduk/Weiqi) boards, game viewers,
editors, puzzles, and analysis interfaces.

**Status: early development snapshot.** Headless rules/SGF/controller, SVG rendering,
viewer/Studio, optional React/Vue/Svelte adapters, manual scoring, authored puzzles
and external analysis integration/display are implemented within documented
coverage. Broader compatibility and release evidence remain separate. Nothing is
published yet; the capability direction is not an unrestricted support claim.
See [implementation status](docs/engineering/08-implementation-status.md).
The [delivery audit](docs/engineering/10-delivery-audit.md) maps the complete M1-M4
implementation, consumer evidence and remaining release/compatibility boundaries.

## Local Development

Use Bun 1.x and Node 24.x. Run `bun install`, then `bun run check` for strict
typechecking, behavior tests, documentation checks and an ESM/declaration build.
Run `bun run dev` and open [Banora Studio](http://127.0.0.1:4317/studio/) or the
[read-only embed](http://127.0.0.1:4317/readonly/). `bun run build:examples` creates
static production examples. The [complete viewer](http://127.0.0.1:4317/viewer/)
demonstrates the convenience mount and optional editing. `bun run smoke:browser`
checks production browser flows, including the [React](http://127.0.0.1:4317/react/),
[Vue](http://127.0.0.1:4317/vue/) and [Svelte](http://127.0.0.1:4317/svelte/) examples.
The [classic browser example](http://127.0.0.1:4317/browser/) uses one built script
and the same complete viewer without a framework or module loader.
`bun run smoke:adapters` verifies independently installed adapter types and SSR.
Browser checks run
using Playwright CLI; a compatible browser installation is required.
The common SDK lives at `packages/sdk`; current exports are documented in the
[public API](docs/sdk/public-api.md). No framework or remote service is required.
The build also creates `packages/sdk/dist/banora.global.js` for direct script use.
Studio and the React/Vue/Svelte examples can create/open embedded record, node and
static-position share links without a server. Record/node links include all games,
metadata, comments and branches; position links omit history and game metadata.
Links contain readable encoded data and have a length limit; use SGF export for
larger records. See the [share contract](docs/sdk/public-api.md#embedded-share-links).
The same examples offer local black/white stone texture selection and reset.
Prepared textures are presentation settings; exported SVG/PNG diagrams embed them,
while SGF and share links retain record data only. See the
[texture contract](docs/sdk/public-api.md#custom-stone-textures).
Placement motion is an optional Board/Viewer setting, with activation/duration
controls in Studio and each framework example. It respects reduced-motion
preferences; diagrams export final stone geometry. See the
[motion contract](docs/sdk/public-api.md#placement-animation).
Studio also offers **Score position** with temporary dead/seki group marking,
explicit Japanese/AGA/Tromp-Taylor counting, editable komi/handicap/adjustments and
component totals. Mouse, keyboard and touch use the same headless calculator;
scoring preserves the original SGF. Status must be agreed manually. See the
[scoring contract](docs/sdk/public-api.md#manual-agreed-position-scoring).
The [curated puzzle example](http://127.0.0.1:4317/puzzle/) plays locally authored
answer trees with explicit responses, hints, restart and outcome events. The common
headless session and complete puzzle mount require no framework or analysis engine.
See the [puzzle contract](docs/sdk/public-api.md#curated-puzzle-sessions).
The [analysis example](http://127.0.0.1:4317/analysis/) displays candidate metrics,
ownership and isolated legal PVs without changing source SGF. Offline mode uses
explicitly authored illustrative data; manual KataGo JSON mode accepts your engine's
responses without opening an automatic connection. See the
[consumer guide](examples/analysis/README.md) and [view contract](docs/sdk/analysis-view.md).

## Direction

Legal play can opt into positional or situational superko through the core or
controller's `rules` option; simple ko remains the default. For example:

```ts
import {RecordController} from '@banora/sdk';
const controller = new RecordController({size:9, rules:{ko:'situational-superko'}});
```

Passes retain superko history, committed setup/PL starts a new epoch, and recorded
SGF moves remain browsable even when legal play would reject them. See the
[repetition contract](docs/sdk/public-api.md#repetition-policies) for exact semantics
and the [named-profile/scoring boundaries](docs/adr/0007-manual-scoring-and-named-profile-coverage.md).

Banora should make a simple game viewer easy to embed and let developers extend
the same model into a complete Go application. It combines a customizable board,
shared game rules, SGF records, and optional integrations through clear boundaries.

- Framework-independent TypeScript core shared by browsers and servers.
- SVG board with themes, annotations, keyboard input, and mobile placement tools.
- SGF import/export, comments, variations, and an embeddable game viewer.
- Manual agreed-position scoring, curated puzzles and explicit external analysis/display.
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
implemented optional adapters; none is required by the core or renderer. See the
[framework support decision](docs/adr/0004-framework-independent-adapters.md).

The repository contains one common SDK package plus three separate adapters.
The [initial contracts](docs/adr/0005-initial-api-record-and-package-contracts.md)
define controller ownership, SGF FF4/UTF-8 handling, edit Undo and unsaved-change
behavior. Node 24 LTS, React 19, Vue 3 and Svelte 5 are initial compatibility
targets. The current headless artifact is checked on Node 24.14.0 and browser
flows on Headless Chrome 154. React 19.3.0, Vue 3.5.43 and Svelte 5.57.2 have separate
browser and packed types/SSR evidence; broader compatibility is pending.

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
are authored in this repository; there are no bundled third-party textures or fonts.
Framework consumer builds include their MIT-licensed runtime dependencies. Audit
dependency notices and additional asset provenance before distribution.

Hosted analysis, storage, and collaborative review are possible future services.
The SDK's local board, rules, and record functionality should work independently
of a hosted service.
