# Standalone record editor

A small TypeScript/Vite application using only Banora's public package exports.
Copy this directory into your own project. It has its own package manifest,
TypeScript configuration, styles and original SGF sample; no workspace aliases,
parent configuration, framework or server service is required.
Keep the included [MIT notice](LICENSE) when copying or redistributing this starter.

## Install the SDK

Copy this directory outside the repository, then install the SDK
and start its independent application on Node 24.x:

```sh
npm install @0disoft/banora
npm run build
npm run dev
```

For a locally built SDK instead, build and pack it from the Banora repository:

```sh
bun install
bun run build
bun pm pack --cwd packages/sdk --filename .tmp/banora-sdk.tgz --ignore-scripts
```

Create `.tmp` before packing if it does not exist. Alternatively, run
`bun run smoke:starter` to produce a fully installed and built copy under `.tmp/`
and exercise it in a compatible Playwright CLI browser. Browser installation is
required for that smoke command, but not for this application's install/build.

Copy this entire directory to a new folder outside the Banora repository and
copy the resulting SDK tarball into that folder as `sdk.tgz`. Then, from the copy:

```sh
npm install --ignore-scripts --no-audit --no-fund ./sdk.tgz
npm run build
npm run dev
```

Use Node 24.x (which includes npm). The install adds `@0disoft/banora` as a local
tarball dependency and installs TypeScript 7.x and Vite 8.x. Keep the tarball and
the generated lockfile with your private project for reproducible installation.
The template deliberately has no registry SDK dependency before this step.

Open the localhost address printed by Vite. `npm run preview` serves the built
`dist/` directory; a static host can serve that directory too. No public hosting
or package publication is performed by these commands.

## Try the complete workflow

1. Open the sample or choose an SGF file with **Open SGF** (maximum 5 MiB).
2. Use the viewer's move controls and **Variations** to select a branch.
3. With **Allow editing** enabled, click an empty point or focus the board and
   press Enter to create a continuation. Touch uses release placement.
4. Add position comments. Undo/Redo applies to edits; move navigation is separate.
5. **Save SGF** downloads the complete record, including original variations,
   unknown properties and your changes. Open that downloaded file and inspect
   the continuation and comments again.

Opening another record while changes are unsaved offers Cancel, Save & open or
Discard & open. Invalid SGF is rejected before this choice and retains the active
record. Turning editing off keeps navigation available and makes comments read-only.

All records stay local. Reload/closing uses the browser's native unsaved-change
warning, which browsers may suppress. Starting a download does not prove that the
file was kept on disk. There is no autosave or recovery after a discarded tab.
SGF `RU` metadata is preserved but does not automatically select a legal-play policy;
this starter uses the controller's default simple-ko/no-suicide policy.

## How to extend it

`main.ts` owns one `RecordController` and lends it to `mountViewer`. The SDK owns
record navigation, variations, comments and rendering. The host owns local file
selection, replacement approval and download initiation. On final page disposal,
the host disposes the view, subscription and controller and revokes object URLs.

Use the selective `controller`, `sgf` and `viewer` exports to keep unrelated
puzzle, scoring and analysis modules out of this app. See the
[public API](../../docs/sdk/public-api.md) for the exact contracts. React, Vue and
Svelte remain optional; this example does not change their existing support.

## Recorded validation

The standalone npm installation passes its own strict typecheck and production
build on Node 24.14.0, TypeScript 7.0.2 and Vite 8.3.4. Chrome browser verification
uses only the built application and public UI: opening SGF with setup/Unicode,
selecting original variations, keyboard continuation, comment Undo/Redo, actual
download and reopen, read-only navigation, all replacement choices, malformed
SGF/encoding and oversized input retention. Mobile touch/layout is emulated.
Screenshots and outgoing SGF content are inspected; the exact completed scenario
Result is required. This is local consumer evidence, not physical-device or broad
browser support. Source SGF fixtures are locally authored.
