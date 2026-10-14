# Consolidated Studio Menu Deployment

Status: deployed and verified on October 14, 2026. This is a web-demo update;
package versions remain `0.1.2` and no npm publication was requested or executed.

## Changes

`50cc395` replaces thirteen equal menu tiles with six action rows beside inline
theme, image, animation and touch settings, plus Help and All settings in the
footer. Four new labels cover all twelve Studio languages. Search/drafts/help
retain direct modal launch and invoking-trigger focus restoration.

`a19c4ac` groups record information, tools and next-player actions, and separates
view, images, animation, touch and saved settings. Image uploads start folded in
All settings; the direct Change action still exposes them immediately. Native
inputs keep their handlers and history. Closed-popover viewport constraints are
refreshed before opening, avoiding stale bounds after narrow/desktop transitions.

`4b865b6` corrects the sharing browser fixture to permit owned image thumbnails
while still rejecting the authored `img[src="x"]` / inline-error-handler payload
anywhere in the document and checking that the exact comment remains plain text.
No SDK API, database/schema, persistence format, package version, dependency,
repository-hygiene rule, workflow permission or runner configuration changed.

## Validation

Local `check` passed 272 tests across 53 files, SDK/adapter/CLI builds,
root/Svelte typechecks, boundaries, lint, formatting, documentation and packed
SDK/classic/CLI consumers. The final UI also passed production Chrome menu and
saved-preference scenarios, including twelve languages at desktop/320px widths,
disclosure activation, shared Undo, control restoration and zoom bounds. Focused
sharing passed after correcting its obsolete whole-page image-count assertion.
The preceding menu increment also passed locale and Help scenarios.

The first [CI run 38560157733](https://github.com/0disoft/banora/actions/runs/38560157733)
stopped during the broad browser matrix because its sharing fixture assumed the
entire page contained zero images. Owned stone thumbnails violated that assumption;
this was not evidence that authored comment HTML executed. No demo was deployed
from that failed run. The follow-up
[CI run 38560863039](https://github.com/0disoft/banora/actions/runs/38560863039)
passed root checks/272 tests and the affected `--share-only` production scenario.
It was a focused rerun, not a successful rerun of the entire browser matrix.

Other browser engines, physical devices and native-speaker proofreading were not
executed for this update. Full browser-matrix completion is not claimed. The local
focused checks and public workflow below cover the changed menu paths.

## Public Deployment and Recovery

[Pages run 38561146638](https://github.com/0disoft/banora/actions/runs/38561146638)
completed build, deploy, live health and original-archive capture successfully at
source `4b865b6211f135183c20c7b6253de102c7dc9b9c`.
The public `banora-build.json` independently reports that source and run.

- Original Pages artifact: `11892665086`.
- Provider ZIP digest:
  `sha256:6a5d64e4ec25fe658b02e43cd938368e0ec41aa5f3519cf98d152bfff0b96d49`.
- Original tar: 16,865,280 bytes, SHA256
  `61e381c85e6228722560ed069a4631f271d2884fd3a33f346fd25f9db351a26a`.
- Downloaded health receipt: all 457 files and 14 HTML routes matched the original
  tar in 457 bounded reads; build identity was present.
- Maintainer-only draft backup: release `412671170`, tag
  `demo-backup-38561146638`; tar asset `640261485` matches the original hash.
- Backup manifest asset: `640261487`, SHA256
  `81805763aa98e1a10e0ddba64f1cc96cfaba1b71afc9fc487fd98d976ecf603a`.

An actual Chrome session at the [public Studio](https://0disoft.github.io/banora/studio/)
verified the two-column menu, inline animation binding, three/five grouped interior
sections, folded image uploads, direct search and focus return, 320px bounds, and
real SGF import/edit/download/reopen. Unicode comments, literal markup-like text
and unknown `XX` properties survived. No page errors or failed site responses
were observed during this flow. Screenshots remain in the ignored local
`output/playwright/live-menu-*.png`; the actual downloaded SGF is
`output/playwright/live-menu-roundtrip.sgf`.

The [existing recovery procedure](../ops/rollback.md) can select the retained
original archive. No rollback or independent recovery drill was executed for this
deployment. The subsequent evidence-only documentation commit does not change
the deployed runtime and does not require another Pages build.
