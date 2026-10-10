# Banora SDK

Early development package; not published. Core, SGF, controller, SVG board and viewer are
available through the root export and their respective subpaths after building this
workspace. See the repository documentation
for implementation status and the remaining milestones. No third-party runtime
dependencies or external assets are included.

The build also supplies `dist/banora.global.js`, a self-contained classic browser
script exposing the common API as `Banora`, and `dist/banora.global.d.ts` ambient
namespace declarations. Copy the script alongside a page and load it with an
ordinary script tag; then call `Banora.mountViewer(container, {sgf})` or compose the
other APIs. The global script is not a CommonJS or named ESM entrypoint. Use normal
selective ESM exports for module-based applications.
The standalone script preserves the complete MIT notice in its banner when copied
outside the package; retain that notice when redistributing it.
