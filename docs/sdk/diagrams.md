# DOM-free SVG diagrams

`renderDiagramSvg` is exported from `@0disoft/banora/diagram`, the root module and
the classic browser namespace. It returns a complete SVG string synchronously in
Node, Bun, SSR or browsers, without accessing `document`, `window`, a DOM parser,
the filesystem or the network. No DOM shim, runtime dependency, texture download,
global cache or random identifier is installed.

```ts
import { RecordController } from '@0disoft/banora/controller';
import { renderDiagramSvg } from '@0disoft/banora/diagram';

const controller = new RecordController({ sgf: '(;SZ[9];B[cc];W[gg]TR[cc])' });
try {
  controller.next();
  controller.next();
  const svg = renderDiagramSvg(controller.getState(), {
    width: 640,
    title: 'Example position',
    moveNumbers: true,
    theme: 'flat',
  });
  // Return svg from an SSR endpoint or write it using the host's file API.
} finally {
  controller.dispose();
}
```

## Sources and options

`DiagramSource` accepts a controller's immutable `ControllerState`, a rules
engine `Position`, or the externally supplied `BoardSnapshot` used by
[controlled boards](controlled-board.md). Inputs are not modified. Snapshot
validation owns bounded copies before rendering. A plain Position has no move
history or annotations: pass ControllerState for SGF annotations/history, or
provide explicit snapshot numbers/annotations for an external model.

| Option            | Default                                                          | Contract                                                                                                                           |
| ----------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `width`, `height` | Width 1024; missing dimension follows the displayed aspect ratio | Integer 1–8192 pixels; at most 16,777,216 pixels                                                                                   |
| `title`           | `Go position diagram`                                            | At most 1024 UTF-16 code units; escaped accessible title and label                                                                 |
| `theme`           | `wood`                                                           | `wood` or `flat`; fixed portable colors, without external assets or host CSS                                                       |
| `coordinates`     | `true`                                                           | Logical Go coordinates on all four edges, including transformed/cropped boards                                                     |
| `moveNumbers`     | `false`                                                          | Explicit snapshot numbers or selected record-path move numbers; SGF `MN`, passes, setup removals and captures are respected        |
| `crop`            | Entire board                                                     | Integer logical rectangle `{ x, y, width, height }` inside the board                                                               |
| `transform`       | No rotation or reflection                                        | Existing geometry contract: rotation 0/90/180/270, optional `flipX`                                                                |
| `idPrefix`        | Geometry-derived mask identifier                                 | Optional ASCII identifier starting with a letter, at most 64 characters; supply a unique prefix when inlining multiple masked SVGs |

The shared vector painter preserves grid, star points, stones, numbers, last-move
marker, authored text/shapes, connections/arrows, ink and controlled overlays.
Snapshot visibility masks and dim points are supported. The visibility mask
clips intersections/annotations while leaving the board
background and edge coordinates visible, matching mounted controlled boards.
Interactive focus, hover, variation hints, animation and touch previews are
excluded. Record-number
projection is lazy: rendering with numbers disabled does not traverse the path.
No entire-record reparse or serialization is needed to render an existing state.

## Errors and boundaries

Invalid sources/options fail synchronously; snapshot/export-limit validation uses
`TypeError` or `RangeError`. Unknown
option names are rejected. Existing snapshot limits apply, including board sizes
2–52, annotation/point counts, label lengths, finite values and checked colors.
Selected-path traversal and setup expansion retain default SGF node/value/point
budgets. `DIAGRAM_SVG_LIMITS.maxBytes` independently caps generated UTF-8 SVG at
8 MiB, including escaped multibyte text and markup. XML-forbidden control
characters and unpaired surrogates become U+FFFD; authored markup is escaped.

This API exports one selected position. It does not split move ranges into pages,
reset numbering, generate replay/capture footnotes, rasterize PNG, or derive
authored puzzle semantics. Those operations remain host workflows. Mounted
browser `exportSvg`/`exportPng` methods retain their existing texture, inherited
color and cancellation behavior; they share the static painter and export
dimension policy with the headless API.

This addition is implemented locally; registry publication is a separate action.

## CLI

```sh
banora diagram --input game.sgf --output final.svg
banora diagram --input game.sgf --game 0 --path 0,1 --options diagram-options.json --output branch.svg
banora diagram --input game.sgf --path root
banora diagram --state board-snapshot.json --output position.svg
```

Exactly one of `--input` (SGF) or `--state` (BoardSnapshot JSON) is required.
Either source, or `--options`, may read `-` for stdin; only one stdin input is
allowed. SGF is decoded/imported once with existing default SGF limits. The
default selection is the last node of the selected game's first-child mainline;
`--game` defaults to zero. `--path root` selects that game's root, and comma-
separated zero-based child indices select an exact branch. Paths describe node
edges, including comment/setup nodes; they are not displayed `MN` move numbers.
Missing games/paths fail rather than falling back. Snapshot input rejects SGF
selection flags instead of silently ignoring them.

The controller's historical replay semantics remain unchanged, including recorded
self-capture and replacement of occupied intersections. Historical playback does
not enforce ordinary-play restrictions. Unreplayable sources fail without saving
a partial diagram. Use a BoardSnapshot for a position supplied by another engine.

`diagram-options.json` is a `DiagramSvgOptions` object, for example:

```json
{ "width": 640, "moveNumbers": true, "coordinates": true, "theme": "flat" }
```

Stdout always contains one JSON response with `schemaVersion: "banora.cli/v1"`,
`ok`, `kind: "diagram"`, `format: "svg"`, `source`, and an SGF `selection` where
applicable. Without `--output`, it includes the `svg` string. With `--output`, the
SVG is atomically saved and JSON contains its absolute `output` path instead of
duplicating the drawing. Existing files require `--force`. SGF, snapshot and
options inputs cannot be overwritten, even with force; failed rendering leaves
no partial output. The existing 8 MiB CLI input limit applies to each input.

Usage/input/limit failures exit 2 with structured errors; output failures exit 4.
Authored SGF/JSON is not echoed in error messages. The temporary controller is
disposed on success or failure. The new command requires the matching SDK build
with the `diagram` entrypoint; older SDK peers retain existing CLI commands and
receive an explicit capability error for `diagram`. No package version or
published-registry capability is implied by this local addition.
