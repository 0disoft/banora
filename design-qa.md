# Atelier Studio design QA

Date: 2026-10-13

final result: passed

## Target and evidence

The target is the user's selected Atelier attachment, not another generated
concept. The exact reference was opened and copied without modification to
`output/playwright/atelier-reference.png` (SHA-256
`EE70CD077BF85FD79ECBBD9D9677DE98DE3C5143A343D92EA868E0F80CB6BC68`).
The live consumer is `http://127.0.0.1:4317/studio/`.

Reference and final desktop capture both measure 1488 × 1058 pixels. The live
viewport is 1488 × 1058 CSS pixels, captured with CSS scale at approximately DPR 1.
`output/playwright/atelier-desktop.png` shows Korean, wood, a 19 × 19 board,
move 34, a selected commented position and paused 1-second playback. The authored
35-move review fixture reproduces that interaction state without claiming to be
a historical game. Its full position differs from the illustration. The mock's
checked number toggle contradicts its unnumbered stones; the live toggle truthfully
shows the SDK state. The live move count and dirty status also reflect actual data.

`output/playwright/atelier-comparison.png` combines the reference and live capture
in one visual input: the full composition at half scale, followed by native-density
sidebar, toolbar and playback crops. That combined input was opened and reviewed
after the final capture. `output/playwright/atelier-mobile.png` records the same
position at 390 × 844 CSS pixels. These local, ignored artifacts are QA evidence,
not source-of-truth design specifications or shipped assets.

## Review iterations

The initial comparison was blocked on P1/P2 findings. The final comparison uses
the revised captures after these changes:

| Finding                                                                                       | Resolution and post-fix evidence                                                                                                                                                   |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1: Large board pushed playback below a 900-pixel desktop viewport.                           | Default board width respects viewport height; at 1440 × 900 the dock ends at 868 pixels. The final desktop composition keeps the dock beside the primary task.                     |
| P1: Advanced controls moved into menus could hide search, support and recovery dialogs.       | Dialogs live independently on the document body, retain localization and dispose cleanly. Their functional browser scenarios passed.                                               |
| P1: Default texture decoding delayed editor readiness and raced persisted preferences.        | Validated inline PNG textures initialize synchronously through the public SDK API; focused texture and preferences scenarios passed.                                               |
| P2: Mobile header, control wrapping and sidebar order overflowed or obscured primary actions. | Header and toolbar wrap, board precedes sidebar, metadata remains first. The 390-pixel capture was inspected; 320/390-pixel checks found no horizontal page overflow.              |
| P2: Menu replacement cancellation could leave keyboard focus on the body.                     | Invoking-control restoration falls back to the visible app menu when its original control is hidden, while respecting other modal focus. Keyboard guard scenarios passed.          |
| P2: Navigating through a long variation list did not reveal the selected row.                 | Only the tree container scrolls to reveal selection, preserving page position. Tree-navigation checks passed.                                                                      |
| P2: Display-only wood styling could make standalone exports transparent.                      | Export capture temporarily excludes the display skin; actual SVG and PNG downloads retain opaque board backgrounds and embedded stone tiles. Diagram and texture scenarios passed. |

No actionable P0/P1/P2 finding remains within this redesign's scope.

## Required fidelity surfaces

- Typography: serif Banora wordmark, readable existing system UI stack, localized
  native controls and preserved accessible names. No externally hosted font.
- Spacing: continuous 309-pixel desktop sidebar, compact toolstrip, centered square
  board, separated comment editor and capsule transport. Mobile reflows rather
  than shrinking the entire desktop page.
- Colors: warm ivory surfaces, brown ink and terracotta selected/action tokens;
  restrained borders and focus states.
- Imagery: individually generated hinoki and black/white stone assets, optimized
  to approximately 64 KiB total. Public SDK textures remain replaceable; real
  library icons use Phosphor with its bundled MIT notice.
- Copy: existing functional labels in English, Korean, Chinese and Japanese;
  no introductory marketing copy, fictional save state or invented game length.

Remaining P3 differences: native font metrics make the comment wrap differently;
the SDK board is truly square whereas the illustration is slightly rectangular;
the real variation tree shows actual record rows; unsupported decorative tree
actions from the illustration were omitted. These do not block this handoff.

## Validation and limits

Passed locally: lint, format, TypeScript, repository boundaries, documentation
checks, example production build, scenario-result unit checks and dependency
audit. Chrome browser scenarios passed for accessibility guards, variation
navigation, support, search, preferences, recovery, four locales, menus, playback,
controlled boards, file drops, repetition rules, framework lifecycle, editing,
classic distribution, transforms, diagrams, ink, touch, comparison and sharing.
After correcting menu access in the texture tests, focused texture and animation
runs passed; focused scoring and sharing runs also completed successfully.

Earlier full-browser invocations stopped on outdated inline-control assumptions;
they are not reported as a completed full-suite run. The passing prefix and final
focused runs establish the affected behavior. SDK-wide unit/packaging/performance,
unaffected analysis/puzzle scenarios, other browser engines and hosted CI were not
repeated for this consumer redesign. Physical devices and screen readers remain
owner-waived. Native page-zoom coverage was not newly completed in this pass.
Cross-platform font rendering and untested engines remain practical limitations.

Product source of truth updated: `docs/product/02-spec.md`. Asset provenance and
license details are in `examples/studio/assets/README.md`.
Public SDK API, database contracts, repository hygiene configuration, package
versions and CI workflows are unchanged. The local browser scenario wrapper now
supplies a typed helper that opens real Studio menus before operating controls;
it never forces clicks or changes hidden states to bypass the UI.

Skills used: Product Design image-to-code/design-qa, Imagegen for material assets,
Playwright, and repository feature, SDK, refactor, test-hardening and dependency
upgrade guidance. Browser-client bootstrap was unavailable in this host; the
already authorized Chrome CLI supplied actual rendered and functional evidence.
No deployment or publication is part of this handoff.
