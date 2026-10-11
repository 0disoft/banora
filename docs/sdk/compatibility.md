# SDK Compatibility

- Status: Initial ESM/headless, browser and framework consumer evidence; broader matrix pending
- Decision: [ADR 0005](../adr/0005-initial-api-record-and-package-contracts.md)

## Distribution Direction

Use Vite library builds for ESM entrypoints, TypeScript declarations, and a browser
script distribution. React, Vue, and Svelte are optional dependencies of their
respective adapters and are not bundled into the core or required by other adapters.
Optional analysis, puzzle and renderer code must be excluded when the consumer
does not import it.

M1 validates the ESM/type package through Studio, a read-only browser example, and
a headless consumer. React, Vue, and Svelte adapters have an implemented M2 slice;
the classic browser script distribution also has a runnable consumer.

Use one repository with one common SDK package and three separate optional adapter
packages: React, Vue and Svelte. Logical core/record/renderer modules may use selective
entrypoints within the common SDK; they are not separate release units. Development
names are `@banora/sdk`, `@banora/react`, `@banora/vue` and `@banora/svelte`; none
is published and these names do not claim registry ownership. Actual symbols are
listed in the [public API](public-api.md). CommonJS support is
UNDECIDED and must not be claimed without consumer evidence.

## Runtime Boundaries

| Surface                   | Intended environment                                    | Support status                                                                                                    |
| ------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Core and SGF              | Browser and Node.js, no DOM required                    | Node 24.14.0 packed consumer and Chrome 154 browser flows; broader floors pending                                 |
| SVG renderer and Studio   | Browsers with the required SVG/input APIs               | Production flows checked on Windows Headless Chrome 154; broader matrix pending                                   |
| Classic browser script    | Modern browser, global `Banora` namespace               | Chrome 154 standalone viewer/edit/remount flows and packed global declarations checked                            |
| SVG/PNG diagrams          | Mounted browser board/viewer                            | Chrome 154 standalone XML, real PNG dimensions/pixels, embedded textures, errors and cancellation checked         |
| Magnified touch placement | Browser Pointer Events/SVG; optional confirmation       | Chrome 154 mobile touch emulation in Studio and React/Vue/Svelte; physical devices untested                       |
| Position comparison       | Common pinned SVG boards and native adapter composition | Chrome 154 Studio/React/Vue/Svelte flows; differences, exports, deletion/import generations and lifecycle checked |
| React adapter             | React 19, client effects and server host rendering      | React/react-dom 19.3.0; production lifecycle/Strict Mode and packed types/SSR checked                             |
| Vue adapter               | Vue 3, client mount and server host rendering           | Vue 3.5.43; production refs/lifecycle and packed types/SSR checked                                                |
| Svelte adapter            | Svelte 5, native components and server host rendering   | Svelte 5.57.2; production lifecycle and native tarball types/SSR checked                                          |
| Bun                       | Development/package scripts                             | Bun 1.x; checked with 1.4.2; consumer runtime support unclaimed                                                   |
| AI adapter                | Host-selected engine/service transport                  | Protocol/version matrix UNDECIDED                                                                                 |

Headless imports must not reference browser globals at module initialization.
Headless core/records are intended for server-side use; board views mount after a
DOM is available on the client. Server-rendered board HTML and hydration are deferred.
Verify safe imports and this boundary in each adapter before claiming SSR compatibility.
Do not advertise native mobile or
desktop toolkit rendering based solely on browser support.

Touch release/confirm modes are opt-in SDK options; Studio and adapter examples
enable release mode. Emulated primary touch streams verify magnification, logical
coordinates under eight rectangular/cropped transforms, confirmation, keyboard
refinement, read-only behavior, callbacks and cancellation. Native adapters also
verify configuration updates, shared Viewer placement, unmount and controller
replacement. Direct input remains the SDK default. Pending view state and the
document-body lens portal are disposed with the view and excluded from records
and images. Real iOS/Android, physical pen/touch devices and screen-reader behavior
remain outside the current evidence.

Framework-independent browser use and official framework wrappers are separate
claims. A shared DOM mount API enables integration, but each wrapper's reactivity,
cleanup, SSR boundary and packaging must be verified before claiming support.
Comparison uses the common `mountComparison` view or native Board composition;
it introduces no separate framework rules or record engine. The selective
`@banora/sdk/comparison` export imports safely on Node and mounts only in a browser.
All three native Board components forward node/reference/generation options, with
independent installed-artifact types/SSR and real production comparison flows.
Different-sized games are displayed without a diff. Selectors are bounded to 500
nodes plus selections; missing/deleted nodes and recycled IDs are handled explicitly.
React, Vue, and Svelte consumers must not load one another's framework dependencies.
Keep native component packaging isolated from the core's TypeScript build; choose
actual peer dependency metadata, artifact formats and compiler versions during M2.

## Framework Artifact Evidence

Recorded playback has a separate DOM-free `@banora/sdk/playback` coordinator and
SSR-safe `playback-controls` mount. Studio and every complete Viewer share these
controls; optional native Viewer props forward the same bounded interval option.
Chrome 154 verifies Studio/common/React/Vue/Svelte/classic-script timing, end,
keyboard guards, imports and disposal/remount. Node packed consumers check
headless types/runtime and independent adapter artifacts check playback props
during SSR without starting timers. Background timer precision, physical devices
and other browser engines remain unclaimed. See the [contract](playback.md).

[Checkpoint recovery](recovery.md) additionally exposes a DOM-free
`@banora/sdk/checkpoint` parser/schema and controller creation/restore methods.
Packed SDK declarations/runtime and installed Node CLI resume checks cover this
additive format; Undo remains session-local. Studio's IndexedDB autosave/backup
consumer has Chrome 154 checks for separate tabs, close/reopen, quotas, guards,
corrupt input and actual files. Broader storage/OS durability is not claimed;
see the [recovery limits](recovery.md#studio-local-drafts).

Agent automation is available through DOM-free `@banora/sdk/automation` and the
optional Node 24.x `@banora/cli` package. Installed SDK declarations/runtime and
the actual CLI tarballs/bin have Windows Node 24 evidence for machine-readable
requests/results, error codes, input limits and file preservation. This is
headless record/snapshot automation, not browser/native app remote control or a
headless SVG/PNG claim. No CLI macOS/Linux executable evidence is recorded yet.

Host-controlled boards additionally expose headless `@banora/sdk/board-state`
DTO normalization and the SSR-safe `@banora/sdk/controlled-board` DOM mount.
The latter mounts only in a browser and creates no record/rules controller.
All three optional packages export native `ControlledBoard` components; React/Vue
artifacts retain SDK subpath peer imports rather than bundling another SVG surface.
Independent installations check those types and actual SSR host containers without
view/input callbacks. Production Chrome 154 verifies Vanilla/React/Vue/Svelte
host decisions, stale keys, callback/read-only changes, remount, standalone SVG/PNG
and mobile-emulated confirmation/replacement/cleanup. The common surface also
checks masks, overlays, keyboard/ink/menu intentions and eight transforms.
See the [host-controlled contract](controlled-board.md). External/native transports,
physical devices, other browser engines and hydration remain outside this evidence.

Adapters peer-depend on `@banora/sdk` (`>=0.1.0-dev.0 <1`) and only their own
framework major (`19.x`, `3.x`, `5.x` respectively). Framework runtimes are not
bundled into adapter artifacts. Independent tarball installations verify that the
other two frameworks are absent, declarations resolve and license/README files ship.
React/Vue ESM builds use Vite 8.x and root TypeScript 7.x declarations. Svelte native
components use `@sveltejs/package` 3.0.0, `svelte-check` 4.7.6 and isolated TypeScript
6.0.3 because those tools' peer contracts do not yet accept TypeScript 7. Their
isolation preserves the root/core toolchain. The examples use the Svelte Vite plugin
7.3.1. These are actual checked versions, not proof of every version within a major.

`bun run smoke:adapters` uses npm from Node 24 to install isolated tarballs and
checks each framework's actual server rendering without DOM globals. Bun 1.4.2
attempts a registry lookup when resolving the unpublished SDK peer from simultaneous
local tarballs; npm correctly binds the supplied artifact. Workspace installation
and build remain Bun-based. Svelte SSR is compiled with its native Vite plugin;
plain Node cannot directly execute `.svelte` files.

Production examples verify shared and owned state, configuration changes, latest
callbacks, controller replacement, unsubscribe/remount and edit Undo. React's
consumer enables Strict Mode; Vue's consumer intentionally uses an ordinary ref.
No board HTML/hydration, full SSR framework deployment, real-device, Firefox,
Safari or additional framework-major support is claimed by these checks.

The SDK tarball also contains the self-contained IIFE `dist/banora.global.js` and
its ambient namespace declaration. A separate VM consumer executes that exact
installed file without DOM globals and typechecks its global API; the production
classic-script example verifies actual client mounting without `type="module"`
scripts. Vite emits the example's local script asset unchanged rather than converting
it to ESM. CommonJS support remains unclaimed.
The standalone script includes the complete package MIT notice in a preserved banner;
the tarball check verifies that notice as well as the separate LICENSE file.

Headless `@banora/sdk/geometry` is checked without DOM type libraries. Rotation and
reflection preserve logical coordinates and crop bounds on rectangular boards;
production checks cover all eight combinations and framework configuration updates.

Diagram exports include computed presentation and captured drawing state without
cursor/preview overlays. PNG requires browser image decoding and a 2D canvas;
SVG/PNG generation is not a server rendering claim. Browser fonts are used without
font-file embedding. View bindings support export from all three native adapters and
are not called during SSR. Async encoding failure/disposal and later edits are
covered separately from successful downloads; image export never saves an SGF.

## Record Compatibility

`@banora/sdk/analysis` is a selective headless coordinator, without DOM cancellation
types or bundled engine/transport dependencies. Requests need explicit profile or
custom scoring settings and preserve real setup-epoch history/counts. Illegal
recorded epochs cannot be silently rewritten for analysis; local SGF browsing/editing
still work. The selective headless `@banora/sdk/katago` module has original protocol
fixtures and installed Node 24/ES2022-only type/runtime evidence. It has no automatic
process/network transport, rejects unsupported contexts and requires declared engine
perspective/capability. No actual engine/model/version was run.
See [KataGo integration](katago.md) before selecting an external backend.
The selective `analysis-view` import is SSR-safe and has isolated installed root/
subpath evidence; mounting requires a DOM. Chrome 154 verifies its common view and
runnable consumer, candidate metrics/PVs/root ownership, keyboard/emulated touch,
source preservation, exact freshness/errors and owned/borrowed cleanup. Offline
data is explicitly illustrative; manual JSON is host-controlled. No native Analysis
component exports or broader engine/browser/device support is implied. See the
[analysis view contract](analysis-view.md).

`@banora/sdk/puzzle` is a selective headless authored-session entrypoint. Its
definitions use `banora.puzzle/v1` plus SGF initial context and explicit logical
answer-tree moves, rather than claiming automatic third-party puzzle compatibility.
The separate `puzzle-view` entrypoint imports without runtime browser globals but
mounts only in a DOM. Chrome 154 verifies the production common view/example,
keyboard/emulated touch, safe text, updates and owned/borrowed lifecycle. Native
framework Puzzle components and automatic third-party format inference are absent.

Selective `@banora/sdk/rules` and `@banora/sdk/scoring` imports have installed Node
24.14.0 runtime/declaration evidence with ES2022 libraries and no DOM types. Named
presets expose explicit agreed-position coverage. Score calculations are headless,
require manually correct status and do not certify prior rule legality or player
agreement. AGA pass accounting must be configured before record replay. Studio
replays its selected snapshot for counting and provides temporary manual group
controls; Chrome desktop/emulated-mobile evidence is recorded in implementation
status. This is not an adapter panel or a full tournament-conformity claim.

Initially target SGF FF4 for Go, using the [preservation contract](../product/02-spec.md#sgf-preservation).
Prioritize moves/pass, setup, branches, comments, player/game metadata, labels and
shape markers, plus implemented AR/LN lines and arrows. File bytes follow declared
encoding; string input is already decoded.
Export UTF-8 and preserve unknown properties semantically through supported edits.
Supported byte-input encodings are UTF-8, ISO-8859-1 (true Latin-1), Windows-1252,
Shift_JIS, GB18030 and EUC-KR, including common aliases in the decoder. Absent CA
defaults to Latin-1; a UTF-8 BOM selects UTF-8 when CA is absent. Mixed encoding
collections and invalid/unsupported byte encodings are rejected explicitly.
Multibyte trail bytes are decoded before treating them as SGF escapes or
delimiters; property character limits apply to decoded text. Recovery from an
ambiguous byte probe requires a matching real root `CA` declaration (or UTF-8
BOM); it does not guess an undeclared legacy encoding from comment content.
String input is already decoded, so CA does not re-decode it. Only UTF-8/Latin-1
have fixture evidence so far; other decoder paths need fixtures before broad
encoding compatibility claims. Missing FF/GM are accepted under this FF4 Go subset;
explicitly different FF/GM values are rejected. Root-only property misuse, conflicting
setup, malformed points and duplicate property keys are diagnosed.

Default limits are 5 MiB for input and normalized UTF-8 export, 50,000 nodes,
128 nested game trees and 65,536 raw characters per property value. Callers can
configure positive limits. Dimensions are 2 through 52, including rectangles.
`C`/`GC` text and known SimpleText fields normalize SGF whitespace; unknown values
retain their unedited escaping on export. Edits are revalidated before commit so
limit failures preserve state. Collections retain every game during editing/export.
Recorded moves execute SGF playback semantics; new user moves use the selected
rule policy. Named `RU` values are metadata, not automatic implemented rule profiles.
Positional/situational superko uses only the selected path's observed situations;
recorded repetitions remain navigable and committed setup/PL starts a new epoch.
Headless fixtures cover siblings, game changes, cache eviction, Undo/Redo and import
atomicity. The installed headless package checks the new policy/type/history and
setup reset. Chrome 154 checks actual keyboard recapture/rejection, announcements,
immutable state/events, recorded navigation and borrowed-controller disposal.
This does not establish full named tournament rules or persist custom host policy
implicitly in exported SGF; choose the policy explicitly on reopen.
Exact bytes and formatting are not guaranteed. No drop-in compatibility
with WGo.js, Goban, Shudan or jGoBoard APIs is assumed.

AR/LN now validate distinct on-board endpoint pairs and prohibit duplicate entries
(including reversed duplicates for undirected lines). Previously opaque malformed
AR/LN values are rejected instead of being accepted as unknown properties. Valid
unknown properties remain preserved. Setup editing uses AB/AW/AE/PL and creates a
separate setup child after a move; it never rewrites a move into a setup position.

Freehand annotations use Banora's versioned private BPN JSON extension, documented
in the [public API](public-api.md#freehand-record-format). Other SGF tools may not
display it. BPN was previously opaque; malformed/unsupported BPN values are now
rejected atomically rather than treated as unknown data. Other valid unknown
properties retain preservation. Version 1 keeps fractional logical points, stable
node-local IDs and drawing order through Undo/export/reopen. Input and style limits
bound SVG rendering and disallow URL paints. Pressure/smoothing are deferred.

## Placement Motion Compatibility

The opt-in [placement contract](public-api.md#placement-animation) preserves static
behavior for existing callers. It uses one bounded native transform effect per
mounted board, respects live reduced-motion preferences and has a static fallback.
Chrome 154 checks step eligibility, own-stone transform origin, redraw continuation,
atomic invalid options, navigation/import/setup/pass/Undo cancellation, re-enabling,
final SVG/PNG geometry, missing-API fallback and borrowed-controller disposal.
This is browser behavior evidence, not a frame-rate or physical-device guarantee.
Studio and React/Vue/Svelte controls also pass production checks for opt-in defaults,
Board/Viewer/owned settings, duration changes, comment redraws, static comparison,
diagram downloads, media-preference changes, controller swaps, remount and repeated
playback with at most one effect per view. Independent adapter types/SSR include
the option without running browser effects on the server.

## Texture Compatibility

Custom tiles use the bounded static-PNG contract in the
[public API](public-api.md#custom-stone-textures). Ready-tile validation is headless;
explicit Blob preparation uses browser image/2D canvas APIs and makes no fetch.
The SDK does not accept texture URLs directly or extract them from SGF. PNG/JPEG/WebP
preparation, eight cropped rectangular transforms, standalone PNG pixels, image
deduplication, cancellation and object-URL cleanup have Chrome 154 evidence.
Studio and React/Vue/Svelte file-selection/reset controls pass real production
checks, including native prop forwarding, controller swaps, remounts and late-result
rejection. Independent adapter tarballs check those props with strict types and SSR.
Other browsers/devices and arbitrary image corpus coverage remain unclaimed.
Setting textures alone does not enable placement motion; it remains separately opt-in.

## Share Compatibility

The versioned embedded-SGF fragment protocol is documented in the
[public API](public-api.md#embedded-share-links). It has no server dependency,
requires a compatible destination page, and imposes a 16,384-character maximum
(callers may lower it). It is unrelated to WGo.js/Goban share URLs. Node paths use
game/child indices, not serialized IDs. Existing `loadSgf` callers remain compatible;
the optional locator selects a validated target in the same atomic import.
Headless tests and the installed Node consumer verify Unicode, collections,
branch targets, position redaction, malformed inputs, bounds and dirty guards.
Browser opening/copying evidence is tracked separately in implementation status.
No public hosting, storage, encrypted links or cross-browser URL-length guarantee
is claimed. Position links deliberately omit capture/repetition/rule history.

## Local Engine Compatibility

The host-owned CLI has [actual KataGo evidence](../engineering/11-live-katago-evidence.md)
for version 1.18.1 Eigen CPU/Windows x64 and the specified small model/config on
Bun 1.4.2 and Node 24.14.0. All three reporting perspectives and scoped query/
termination/host-failure checks pass. This is headless stdio integration evidence;
other engines/models/backends, prediction quality and automatic browser connections
remain unclaimed. The common SDK still bundles no engine/model/process transport.

## Versioning and Migration

Use semantic versioning and document breaking consumer changes, including during
pre-1.0 development. Add migration examples when changing actions, events,
coordinates, ownership, record semantics or package exports. Maintain a documented
deprecation path when feasible; never silently reinterpret saved records.

Keep dependencies on explicit compatible major lines, allow stable updates within
those lines, and promote a new major after focused consumer compatibility checks.
Lockfiles capture the exact dependency graph used for a build; they are not a
policy of permanently freezing dependencies.

## Release Evidence

Validate the packed artifact in Studio, the read-only browser example and a headless
consumer, check declarations, exports, asset paths and notices, and run the relevant
examples. Reopen Studio's exported SGF to confirm the editing loop. Record the actual
framework peer/compiler versions and independently run each adapter consumer as it
ships. Verify client-only DOM creation, update propagation, remount cleanup and package
types/artifacts rather than inferring compatibility from the plain-browser example.
Scope checks and releases to changed packages and affected consumers; common SDK
changes may require adapter checks, but unrelated edits do not require a full matrix.
Record actual tested runtime versions in the [implementation status](../engineering/08-implementation-status.md).
The common package is `0.1.0-dev.0`; no automatic version bump or publication is
configured. Version changes belong to an intentional release task.
