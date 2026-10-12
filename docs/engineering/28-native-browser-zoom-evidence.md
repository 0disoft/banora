# Native Desktop Browser Zoom Evidence

Status: executed on Windows x64 Chrome 154 at clean source
`544bed5d716a06121a31d3e22f3f01e8b2fca763`; physical devices and screen readers
remain owner-waived, without a certification claim.

## Method and Actual Results

After building production examples, run
`bun scripts/browser-smoke.ts --zoom-only`. Each level starts a separate, exclusively
owned Chrome profile on the runner's random local origin. Native default page zoom
preferences select 100%, 200% and 400%; the outer window remains 1280×900 and the
Playwright viewport is null. The runner checks actual pixel ratios and proportional
CSS dimensions, rather than substituting a resized viewport, CSS zoom or pinch.
Chromium's [desktop zoom implementation](https://chromium.googlesource.com/chromium/src/+/lkgr/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc)
owns those profile preferences; no user profile or login session is accessed.

| Native zoom | CSS viewport | Pixel ratio | Visual viewport scale |
| ----------- | ------------ | ----------- | --------------------- |
| 100%        | 1262×804     | 1           | 1                     |
| 200%        | 631×402      | 2           | 1                     |
| 400%        | 315×201      | 4           | 1                     |

The complete report was produced at `2026-10-12T17:12:22.265Z`:
`output/playwright/browser-zoom.json`.
Report SHA256 is
`9b2001e309008a7dd3d7479a6ada1ed49346a7e8d3ab331f3d6115cef09f48ca`.
It records the clean commit, platform,
scenario and complete source/served-build fingerprints. Sources and artifacts
were unchanged across the execution window. Its source SHA256 is
`1ffdccd6b8a3876162d6bf247b6785044d127cdb9f3a54e72522b36f2b58a33d`;
production SHA256 is
`49e1961075588f3b8b96be27cca946677e359dd37743eec9b204c90f13e573ea`.
These are execution identities, not substitutes for the source contracts.

At each zoom level:

- All twelve Studio menu sections fit without horizontal overflow in English,
  Korean, Chinese and Japanese: 144 section/language/zoom combinations.
- Localized replacement dialogs retain keyboard focus, cancel with Escape and
  preserve authored comments. Menu Undo restores focus even after disabling its
  button. Ordinary keyboard navigation, board editing and Undo retain record state.
- A downloaded SGF reopens with the authored comment. Downloaded bytes retain
  that comment, other multilingual comments and an unknown property.
- English React, Vue and Svelte viewer comments can be edited and their pages
  reflow without horizontal scrolling. No private SDK/controller hooks are used.
- No uncaught page error is observed.

Native compositor screenshots were inspected at 200% and 400%. Playwright's
ordinary CSS-sized screenshot clip initially truncated native zoom captures;
the harness now captures the complete compositor viewport without a clip. This
capture correction does not change application zoom or weaken layout assertions.

## Observed Defect and Correction

The initial 100% run reproduced a keyboard defect: the final Undo disables its
focused button, moving focus to body; native Escape then closed the popover
without restoring the menu trigger. Studio now handles Escape for an open menu
whose focus is inside it or on body. A separately focused dialog/outside control
retains its keyboard ownership. The owned abort signal removes this listener on
disposal. The existing focused menu regression and the native zoom scenarios pass.

Root `check` passed 245 tests/3,542 assertions, packed public/classic consumers
and 298 installed CLI checks. After the final harness changes, lint, typecheck,
format and the five browser-option/CI tests passed. Source policy, docs and file
signals passed; no SDK API, saved-data schema, package version/dependency or
repository hygiene changed. The private runner adds an opt-in scope within the
existing CI job, without new jobs, permissions or a browser matrix.

## Limits

This is headless desktop Chrome 154 evidence on Windows, not actual Safari,
Firefox/Edge zoom, a physical low-spec device, assistive speech or every possible
zoom level/feature combination. Vertical scrolling remains necessary at 400%.
It covers the declared workflows, not complete accessibility certification.
No npm publication or live Pages deployment follows from these checks.
