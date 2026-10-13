# Studio and Localization Follow-up Release

Selected source family: `0.1.1` for SDK, CLI, React, Vue and Svelte, on `latest`.
This record describes the reviewed changes and local evidence. Actual publication,
installed-registry health and demo deployment are separate executions, retained
in the [GitHub Actions runs](https://github.com/0disoft/banora/actions) and the
[versioned release](https://github.com/0disoft/banora/releases/tag/v0.1.1).
Source selection alone is not a claim that a package or demo has been deployed.

## Delivered Changes

- Studio adopts the selected Atelier design: compact header, wood board and stone
  materials, centered icons and aligned form controls.
- A blank session starts with 19 lines. Independent internal board tabs retain
  their records, cursors, comments, Undo and dirty baselines; new boards support
  9/13/19 lines and guarded close behavior.
- The right rail exposes board creation, line count, display-size dropdown and
  SVG/PNG export. Invisible edge/corner targets resize the board and select custom
  size; the native fullscreen button handles entry, button exit and external exit.
- Optional placement sound uses a short wooden impact and persists its setting.
  Navigation, history, passes and imports remain silent.
- Menus launch search, help and drafts directly. Setup edits avoid empty or repeated
  annotation rows. Context-menu variation deletion targets the clicked branch and
  supports Undo without discarding unrelated branches.
- Focused variation rows align sibling forks and their continuations. Board hints
  show recorded next-move choices. SGF `TE`/`BM` assessments appear beside comment
  indicators and are editable through Studio and public controller/automation APIs.
- SDK Viewer/comparison and Studio support English, Chinese, Hindi, Spanish,
  French, Russian, Indonesian, Japanese, Vietnamese, Korean, Thai and Malay.
  Locale selection, browser detection and diagnostic environment codes share the
  supported registry. Authored titles, names, comments and protocol details retain
  their original content.
- Studio uses language-specific, self-hosted fonts with bundled notices: Noto
  Sans for common Latin languages, Be Vietnam Pro for Vietnamese, PT Sans for
  Russian and matching Noto families for Korean/Chinese/Japanese/Hindi/Thai.
- Search/help/draft modals retain original-language bindings after moving to their
  permanent owner. Starting in Korean and switching languages translates both
  static labels and dynamic results instead of mixing the two languages.

## Compatibility and Ownership

The compatible patch follows [ADR 0025](../adr/0025-initial-default-channel-release.md).
All five source versions advance together; SDK peers stay
`>=0.1.0-dev.0 <0.2.0`. Framework/tool majors and public package identities do not
change. New locale codes and variation/assessment APIs are additive. Existing
saved records and checkpoint/storage schema versions remain unchanged.

Studio layout, fonts, tabs, resizing, fullscreen and audio are consumer-owned.
SDK packages do not impose Studio fonts, materials, storage or page layout on
embedding hosts. No account service, database, remote translation, telemetry
collector, CI job or workflow authority is added for this release.

## Validation and Limits

The preceding increments retain their focused checks in [Validation](../../VALIDATION.md).
The final UI pass inspected all 13 menu sections in all twelve languages at
1440px and 390px, then repeated the narrow layout pass at 320px. No tested surface
or visible button/label/heading/paragraph extended horizontally beyond its owner.
Hindi screenshots exposed the moved-modal binding defect; corrected screenshots
and the production locale smoke verified the fix.

The locale smoke now starts its twelve-language scenario in a Korean browser
context and asserts exact search/help/draft headings and close buttons for every
language, including English. It retains authored title/player/comment text and
the selected move, checks header bounds at desktop/mobile widths, saved locale
on reload, and SDK Viewer/comparison language changes.

The first hosted CI exposed a stale playback assertion that still expected a
Studio setup-only row to say `Annotation`. The fixture now expects its specific
`White stones (setup) D6` caption, while retaining move-number and focused-fold
checks. The standalone Viewer's existing annotation caption remains separately
checked; no SDK caption contract was changed to satisfy this fixture.
The mobile editing scenario also now checks Undo/Redo of its own move on the
blank initial board, rather than assuming a sample continuation exists after Undo.
Branch deletion waits for the actual target row to disappear instead of inferring
completion from a row count that focused trees can retain before and after deletion.
The Studio touch-confirmation fixture expects `E14` for logical point `(4,5)` on
the new default 19-line board; standalone rectangular-board expectations remain
unchanged.

Texture and animation consumer fixtures explicitly load the sample record before
navigating it; a blank startup board is no longer mistaken for a loaded replay.
Replacement-guard fixtures wait for the actual clean, restored-sample-comment destination
after Discard or Export/continue, not a board width shared by both records. This
prevents a following import from racing the preceding asynchronous replacement.
The playback fixture commits its restored blank comment and waits for the clean
baseline before navigating away; otherwise the intended before-unload guard
interrupts the driver's callback instead of completing the consumer checks.

Local browser coverage completed by retaining the passed prefix and resuming the
remaining unchanged production scenarios after each fixture correction. The
editing/classic/presentation/diagram/ink, touch/comparison/sharing, texture,
animation, scoring, puzzle and analysis scopes all passed. Hosted preparation
executes the full suite again against one retained committed candidate.

The final local `bun run check` passed lint/format/boundaries, SDK/adapter/CLI
builds, root/Svelte typechecks, 269 tests with 4,807 assertions, 143 documents with
726 relative links, packed SDK/classic declaration consumers and 298 installed
CLI checks. The production locale smoke and focused font/UI inspection passed
separately. Release preparation must still validate the exact committed archives
through the existing nine gates before any package publication. Browser
inspection uses desktop Chrome and emulated mobile viewports; it does not prove
physical-device behavior, every browser engine or native-speaker translation
quality. The owner waived physical-device and screen-reader validation.

## Publication and Recovery

The [Pages execution 38431564271](https://github.com/0disoft/banora/actions/runs/38431564271)
deployed `9844346612e5d814e35a43231f886e8f876392f8` and completed its live-byte
health and archive jobs. The public build receipt matches that source/run.
A separate public Chrome inspection verified all twelve language selections,
locally served rendered fonts, exact search/help labels, 390px layout, saved
language on reload and an actual SGF download/reopen retaining Korean text,
literal `$&`/`<tag>` content and the unknown `XX` property. Later changes only
strengthen the replacement-guard fixture and documentation; the deployed Studio
runtime remains unchanged. A local receipt does not replace package publication
or independently installed registry health.

Use one committed source for the existing manual preparation and protected OIDC
publication workflows. Download and verify that retained candidate, bind its full
source commit and manifest SHA-256, publish all five reviewed archives on `latest`,
and require fresh registry-download/installed-consumer health. Deploy the demo
through the existing Pages workflow and inspect the live twelve-language Studio.
Retain the original prepared bundle and manifest in the versioned GitHub release.

Keep `0.1.0` and `0.1.0-dev.1` artifacts and their original receipts. Existing hosts
and lockfiles do not update automatically. Portable SGF/checkpoints and exact
retained Pages/release artifacts remain the recovery boundaries; publication
does not establish account recovery, off-device durability or arbitrary host
rollback. Follow [release](../ops/release.md) and [rollback](../ops/rollback.md)
instead of unpublishing, replacing bytes or automatically mutating channels.
