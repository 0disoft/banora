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

## October 12: Missing Komi Presentation

Review of the adjacent record-details rendering found another Korean/English-only
fallback. The pass fixture deliberately contains no `KM`; an added real-page
assertion failed with Chinese `5 × 5 / not specified` before the fix. Studio now
uses the existing example translation catalog for this fallback in all four
languages. The focused production locale route passed after rebuilding examples;
its actual download additionally verifies that presentation does not create `KM`.
The original explicit-komi/authored-data export checks remain enabled.

This is an example-only text/catalog change with no SDK API, storage/DB,
dependency, hygiene or CI routing changes. The product specification records the
presentation boundary. The preceding full root check is complemented by current
typecheck, lint, format and docs checks; full browser, engine and packed adapter
runs were not repeated for the catalog fallback. Bugfix, test-hardening and
Playwright procedures applied. Other engines and physical devices remain unverified.

## October 12: Hosted Search Verification Race

The first private pull-request CI run at `0ad8ccb` executed on Ubuntu with Bun
1.4.3. Root validation and installed CLI checks passed; production browser checks
stopped at the search scenario's stale-result assertion. See
[the failed run](https://github.com/0disoft/banora/actions/runs/38160110648).

Source inspection confirms each result handler captures its original record
generation. The scenario instead treated file selection as completed import,
although Studio awaits `File.arrayBuffer()`. It could click the previous record's
still-valid result before replacement committed. The corrected scenario waits
for a distinct newly imported authored title, verifies that the previous result
is detached, then invokes its navigation and selection callbacks. The new record
must remain at move zero with an empty root comment and no old selections.

Focused production search smoke passed locally after this test-only correction,
including paging, preview/apply/Undo, bounds, locales and narrow-layout coverage.
Lint and format passed. Hosted success is recorded separately below; the initial
run remains a failure. Runtime/API/storage/DB/dependency,
repository hygiene and runner definitions are unchanged. Bugfix, test-hardening
and Playwright procedures applied; validation/testing-standard owners record
observable import completion rather than arbitrary delays.

## October 12: First Successful Hosted CI

[Run 38160771867](https://github.com/0disoft/banora/actions/runs/38160771867)
completed successfully for `b5d1d5ed8f4d3e076f8257e49cbd82af37c701e9` on the private
draft PR. Its single Ubuntu x64 job took 5 minutes 2 seconds with Bun 1.4.3,
Node 24.21.0 and Headless Chrome 155. This also exercises stable updates within
the supported tool majors against the existing frozen dependency lockfile.

Executed gates include frozen setup/tool diagnostics, change planning, root
quality/boundaries/builds/types, 197 tests/2,746 assertions, packed public SDK/classic
and 297 installed CLI checks, file/permission signals, dependency audit (165
packages, no reported advisories), React/Vue/Svelte packed types and SSR consumers,
the complete production browser suite, and an independently installed/built
standalone editor with its actual browser import/edit/export/reopen flow.
Search, accessibility, bounded tree navigation, support, preferences and recovery
run inside that completed full browser route; no route is inferred from a skipped
step. The monthly-only step was correctly skipped for the pull-request event;
the ordinary code route independently executed both security signal commands.

This closes the missing hosted execution evidence for this source snapshot.
The local retained d1ee675 release candidate still describes its own source and
gates; this CI run does not publish it. Branch protection, bot update PRs, public
visibility/demo/package publication, live rollback and physical-device/assistive
technology certification remain unproven. No runner, permission, API, database,
dependency or repository-hygiene settings changed. Subsequent evidence-only
documentation commits are held for the next validated push batch, avoiding a
second full pull-request run for identical executable code.

## October 12: Workflow and Promise Review

Reviewed current Studio import/replacement/export and search/support controls,
the public controlled-board, automation, analysis and recovery contracts, the
standalone/analysis guides, README, operational backup/observability procedures
and actual production scenario routes. Updated readiness rows 25-72 from stale
implementation plans to concrete behavior, executed evidence and remaining limits.
The source review found the two locale defects above; they have independent
before-failure/after-success browser evidence and committed fixes.

The existing completed production run at 3355418 covers search/apply/Undo/export,
reload/two-tab recovery/quotas, native framework host decisions, keyboard/narrow
dialogs, menu/scoring/comparison/sharing and provider cancellation. Current locale
changes have focused rebuilt-browser coverage rather than a repeated unrelated
full suite. Historical starter/SSR/engine/release/performance checks remain named
historical evidence, not assertions that those commands ran again today.
Source review distinguishes private/unpublished distribution, authored illustrative
analysis and manual transport from SDK functionality. It does not establish a
public feedback channel, security policy approval, hosted execution, physical
assistive devices or service reliability. These are still explicit readiness gates.

The next three priorities are external feedback/security access and approved
policy; hosted CI plus a fresh reviewed release candidate; additional browser/
device and large-record paint/memory measurements. Accounts, remote collaboration,
schedulers and service dashboards remain host integrations, since adding them to
the local SDK would create new authority and operations obligations. No runtime,
public API, schema/DB, dependency, hygiene or runner was changed by this review.
Documentation validation, format and whitespace checks cover this increment;
runtime checks were not repeated for evidence-table changes.

## October 12: Measured Tree Navigation

[Browser measurement evidence](17-browser-performance-evidence.md) records native
and 4x-emulated CPU timings before/after reusing Studio's bounded variation rows.
The final 5,000-move 4x Previous/Next medians fell from 193.2/156.8ms to
77.7/62.3ms; native-clock results and heap snapshots do not consistently improve.
The new actual-page keyboard/tree fixture and full production suite passed, along
with root check (197 tests/2,746 assertions and 297 installed CLI checks). Exact
selection, MN/annotation labels, comments/Undo, collection/language/import changes
and real export/reopen are retained. A screenshot was inspected. The specification
owns row reuse/focus behavior; validation owns the opt-in measurement and focused
tree route. No SDK API, schema/DB, dependency or hygiene changed. Refactor,
test-hardening and Playwright procedures applied. Physical/other-engine and
peak/retention measurements remain unverified; no universal speed claim is made.
