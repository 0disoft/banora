# Atelier materials

These original raster materials were generated for the user-selected Banora
Atelier design. They contain no board grid, moves, text, or player data.

- `hinoki.webp`: 1024-pixel wood surface, 30,522 bytes.
- `black-stone.webp` and `white-stone.webp`: 256-pixel sidebar materials.
- `black-stone-tile.png` and `white-stone-tile.png`: 128-pixel embedded SDK tiles.

WebP images were encoded at quality 0.86. The complete material set is about
64 KiB. The validated PNG tiles initialize synchronously through the public
`createStoneTexture` API, so material decoding cannot delay editor startup.
Custom images continue to use the bounded public `prepareStoneTexture` loader.

Wood grain is Studio decoration. Standalone SVG/PNG diagrams retain an opaque
SDK board surface and embedded stone textures; they need no Studio stylesheet
or external asset URL. Materials do not enter SGF, backups, or share links.

UI icons use the MIT-licensed Phosphor Regular/Fill assets, imported individually
from `@phosphor-icons/core` on the `2.x` line. Its notice ships in
`examples/public/licenses/phosphor-icons.txt`; Vite copies that notice into the
example distribution. No font service or icon CDN is required.
