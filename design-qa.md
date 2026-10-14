# Studio consolidated menu design QA

## Target and evidence

- Selected visual truth: third displayed concept,
  `C:/Users/cherr/.codex/generated_images/01a12200-9d93-7ea2-8de1-69a7cb6b8e95/exec-10bda862-2a03-4123-bdef-8dcc3b46163b.png`.
- Implementation: `http://127.0.0.1:4317/studio/`, Korean, board menu home open.
- Source raster: 1374 × 1145 pixels; its menu is a close-up composition rather than
  a CSS viewport specification. The owner selected the compact adaptation.
- Desktop viewport: 1440 × 1000 CSS pixels, device scale factor 1.
  Full screenshot: `output/playwright/menu-design-wide.png`.
- Focused menu screenshot: `output/playwright/menu-design-panel.png`, 680 × 536
  CSS/pixel dimensions. Review compares menu regions and relative hierarchy;
  source and implementation are not asserted to have identical physical scale.
- Narrow viewport and screenshot: 320 × 900 CSS/pixels, scale factor 1,
  `output/playwright/menu-design-mobile.png`.
- Source, focused implementation and narrow screenshot were opened together in
  the same visual inspection input. Full desktop composition was also inspected.

## Required fidelity surfaces

- Typography: existing Noto Sans KR Variable is the first computed Korean font.
  A 20px menu title and 14–15px labels preserve readable hierarchy at the intentionally
  reduced menu size. Labels wrap instead of clipping.
- Layout: two aligned columns, one vertical separator, six plain action rows,
  inline controls and a separated footer match the selected structure. The 680px
  width and tighter spacing are the requested compact adaptation. At narrow widths
  columns stack and the viewport-bounded surface scrolls vertically.
- Colors: existing ivory surface, terracotta accent and warm-gray borders are
  reused. The sticky heading uses the same surface as the menu.
- Images/icons: existing black/white stone WebP assets and Phosphor Regular icons
  are reused. Stone thumbnails are decorative default-style illustrations rather
  than a claim to preview a currently uploaded custom texture. No new raster assets
  or icon library are required. Checkboxes retain native semantics and keyboard
  behavior with switch styling; forced-colors restores native appearance.
- Copy/content: record/edit combines the previous Game and Tool destinations;
  simple settings no longer have separate menu destinations. Help and All settings
  occupy the footer. All four new labels are present in eleven non-English catalogs
  plus the derived English catalog. The existing touch magnifier remains available,
  although the conceptual image did not depict that control.

## Comparison history

- Initial inspection found a P2 missing Stone textures label. Its dynamically
  created text binding was outside the panel during initial localization. Initialize
  that binding directly. The updated focused screenshot shows the Korean stone-image label.
- Refined the small inline boolean controls to match the reference switches;
  retained their input elements, listeners and focus outlines.
- Post-fix inspection of the focused desktop and narrow captures found no remaining
  actionable P0/P1/P2 layout, copy or fidelity differences. Compact dimensions,
  native dropdowns, existing labels and the extra touch magnifier are intentional.

## Functional evidence and limits

- Production menu smoke: immediate inline settings, preference retention, all twelve
  languages at desktop/320px widths, direct dialogs, focus restoration, Escape,
  shared Undo, retained scoring sessions and pinch-zoom bounds passed.
- Production saved-preference migration/reset and record/draft retention passed.
- Production Help action discovery, including direct focus of inline animation/
  touch controls and the consolidated record/settings destinations, passed after
  updating the fixture's obsolete destination-heading expectations.
- Production twelve-language locale smoke passed, including moved dialogs and
  live failure-message bindings.
- Browser visual session reported zero console errors.
- Other browser engines, physical touch devices and native-speaker proofreading
  are outside this focused UI increment. The full SDK/browser matrix is not needed
  to establish this menu layout; it has not been rerun for this change.

## Implementation checklist

- [x] Consolidate command navigation and inline settings without duplicating inputs.
- [x] Preserve shared state, borrowed-control restoration and modal focus ownership.
- [x] Match selected layout with desktop and narrow visual inspection.
- [x] Translate new labels and retain keyboard-operable native controls.

final result: passed

## Interior grouping follow-up

Record/edit now separates record information, tools and next-player actions with
translated section headings and consistent separators. All settings separates
view, images, animation, touch and saved settings. Detailed image uploads start
folded in a native keyboard-operable disclosure; the direct image-change action
still opens them immediately. Controls keep their original DOM owners and handlers.

Desktop and narrow captures:
`output/playwright/menu-record-grouped.png`,
`output/playwright/menu-settings-grouped.png`,
`output/playwright/menu-settings-grouped-mobile.png`.
The initial view-theme control inherited trailing alignment and lost its label at
narrow widths; scoped styles restore leading alignment and the visible label.
The post-fix captures are the evidence for the final grouping. This follow-up
does not change the selected home layout, API, data schemas or external assets.
The repeated language/viewport menu scenario exposed stale closed-popover bounds;
the menu now refreshes viewport constraints before opening. The final production
menu scenario passed after that fix, including all twelve languages, desktop/
narrow transitions, folded image uploads and restored control ownership.

## Public verification

Pages run `38561146638` deployed source `4b865b6`; the build identity was checked
in an actual public Chrome session. `output/playwright/live-menu-desktop.png`,
`output/playwright/live-menu-settings.png` and
`output/playwright/live-menu-mobile.png` capture the live home/interior/narrow
states. Direct search/focus return, inline animation, folded uploads and actual
Unicode/unknown-property SGF download/reopen passed, with no page errors or failed
site responses during that flow. Public byte health matched all 457 deployed files.
