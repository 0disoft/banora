# Current Product Flow Audit

Status: active scoped execution evidence, not all-72 completion or publication.
This audit owns newly checked product/interaction paths while the
[readiness review](12-readiness-review.md) retains the complete request.

## October 12: Accessible Confirmation Dialogs

Actual browser inspection of Studio's dirty replacement confirmation showed an
unnamed `dialog` in the accessibility tree, despite its visible heading. An exact
role/name lookup returned zero matches. Source inspection found the same missing
association in the continuation removal and shared-reference-consumer guards.
Studio now references its localized visible headings through aria-labelledby;
the shared guard supplies a fixed label localized by the existing UI mechanism.
No extra visible explanation, custom focus trap or change to replacement authority
was introduced.

The new production accessibility scenario uses real rendered roles/keyboard input
and public share APIs. Studio replacement/removal guards cover English, Korean,
Chinese and Japanese at 1280px/900px and 320px/480px layout viewports. Independent
React/Vue/Svelte sharing guards cover their actual English controls at both sizes;
those demos do not expose a language picker. Checks require one correctly named
visible dialog, native background-focus rejection, modal Tab, Escape cancellation,
viewport fit and unchanged comments, dirty state, selected move and continuation
count. Replacement cancellation also restores the invoking button's focus.
Screenshots were inspected. This is accessibility-tree/keyboard/layout evidence,
not physical screen-reader certification or arbitrary device/browser compatibility.

Focused accessibility execution passed after correcting two scenario assumptions:
do not click the disabled First button at the initial node, and do not invent a
language picker on framework pages. The actual full production suite then passed
on Windows x64 Headless Chrome 154, including accessibility, support/search/recovery,
locales/menu/playback, controlled/native framework lifecycle, editing/export/reopen,
rules, diagrams, ink/touch/comparison/share, textures/motion, scoring, puzzles and
analysis. Root `check` passed 197 tests/2,743 assertions, quality/boundaries,
SDK/adapter/CLI builds, root/Svelte types, docs and packed SDK/classic/CLI consumers
(297 CLI checks). These are observed results, not assumptions from source annotations.

Updated specification, validation and testing-standard owners; browser/CI routing
adds a focused accessibility scope and sharing/full routes include it. SDK API,
saved schemas, DB, dependencies and hygiene are unchanged. The bugfix/test-hardening
and Playwright procedures applied. The implementation is an example-consumer fix;
no SDK-native modal API is invented. Other browser engines, physical assistive
devices, public feedback/reporting access and hosted execution remain unverified.
Root security policy awaits its separate owner approval. All remaining readiness
rows still require current-source and appropriately scoped execution audit.

## October 12: Localized Pass Captions

The Studio tree used a Korean/English-only branch for pass captions, leaving
English `pass` in Chinese and Japanese rows. A production browser fixture imported
empty and legacy `tt` passes with `MN[9]`; the focused locale route failed on the
Chinese caption before the fix. Studio now formats the existing SDK colorPass
template instead of maintaining a separate language branch.

After the fix, the focused production locale route passed exact pass captions in
all four languages. Language changes left the record clean, and the actual
download retained `B[]`, `W[tt]`, `MN[9]` and the unknown `XX` property. Existing
locale, authored-text, preference, menu and texture checks remained enabled.
Root `check` passed 197 tests/2,743 assertions, quality/boundaries/builds/types,
120 documents/451 links, packed public SDK/classic and 297 installed CLI checks.
The full browser execution above predates this presentation change; the focused
locale route covers the updated path. Other engines/devices were not rerun.

The product specification and this evidence document changed. SDK API, storage,
DB, dependency, hygiene and CI routing contracts are unchanged; the locale browser
scenario additionally verifies a real exported pass record. Bugfix,
test-hardening and Playwright procedures applied.
