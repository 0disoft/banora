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

Invalid sources/options throw `TypeError` or `RangeError` synchronously. Unknown
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
