# Expanded Browser Execution Evidence

Status: current production 22-scope profiles passed on Windows Firefox and
Playwright WebKit on October 12, 2026. These desktop engines and touch
emulation do not establish real Safari/iOS, physical input or screen-reader support.

## Change and Reproduced Failure

Commit `ee57052` adds the existing scoring, puzzle and analysis flows to the
opt-in desktop profile, extending it from 19 to 22 scopes. It preserves every
existing scenario and its completion/download assertions, including the three
flows' actual emulated touchscreen taps at a 390 by 844 viewport and scale 2.
No mobile section is removed or replaced with synthetic SDK calls.

At preceding source `f259247`, focused scoring and puzzle flows passed on Windows
Firefox 156 and Playwright WebKit 26.6 without changes. The Firefox analysis flow
also passed. WebKit analysis failed with `Candidate table redraw lost button focus`:
the fixture expected pointer activation to focus a button before redraw, despite
engine/OS differences in pointer focus. The SDK restores a candidate button only
when that button actually held focus; no SDK focus/record behavior was changed.

The fixture now explicitly focuses the public candidate button and activates it
with Enter, then retains the same post-redraw focus, legal PV capture, source SGF,
overlay and navigation assertions. Existing pointer button/board selection and
touch candidate selection remain elsewhere in that scenario. The corrected full
focused analysis route passed on WebKit 26.6 and Chrome 154. This tests keyboard
focus retention without requiring a pointer-focus convention; see the
[WebKit platform discussion](https://bugs.webkit.org/show_bug.cgi?id=22261).

## Production Commands and Observed Results

Production SDK/adapters/examples were built with `bun run build:examples` at
`f259247`. Commit `ee57052` changes only the private scenario and profile; SDK,
adapter and example sources are unchanged between those commits. Each real
Playwright CLI session verifies its browser engine, prints the actual user agent,
takes an initial accessibility snapshot and closes its own browser/server.
Owner login tabs and the separate local development server are untouched.

```sh
bun scripts/browser-smoke.ts --browser=firefox --desktop-only
bun scripts/browser-smoke.ts --browser=webkit --desktop-only
```

Firefox returned `Desktop browser smoke passed: 22 scopes on firefox.` at clean
source `ee57052`. WebKit also returned `Desktop browser smoke passed: 22 scopes
on webkit.` at the same source without additional SDK/scenario correction.
Actual engines reported Firefox 156 and WebKit 26.6. Narrow scoring/analysis
screenshots were inspected, and each engine's scoring/puzzle/analysis screenshots
were preserved separately under the ignored `output/playwright/engines/` tree.

The profile executes accessibility, variation tree, support, search, preferences,
recovery, locales, playback, common controlled board, file drop, repetition rules,
frameworks, editing, classic script, presentation, diagrams, scoring, puzzle,
analysis, sharing, texture consumers and animation consumers. No source SGF,
checkpoint, diagram, exported image, cancellation, disposal, request isolation or
focus assertion is omitted. It includes the current renamed package imports and
native React/Vue/Svelte consumers rather than relying on the older source's matrix.

Local checks passed lint, format, root typecheck and 5 browser-option/scenario-result
tests / 39 assertions. Rebuilt examples and the focused Chrome analysis route
passed. Documentation/boundaries/file signals and whitespace checks also passed.
Hosted Linux [CI run 38254254486](https://github.com/0disoft/banora/actions/runs/38254254486)
passed at `9f083df`: 234 tests / 3,277 assertions, installed SDK/classic consumers,
297 installed CLI checks and the full default Chrome production browser suite,
including native framework lifecycle flows. The existing change-aware job completed
in 3 minutes 16 seconds. There is no new Actions job, browser matrix or scheduled
download; the existing default Chrome CI covers shared harness changes.

## Limits and Owning Contracts

This is the complete declared 22-scope opt-in profile, not the entire Chrome suite.
Chromium CDP touch/zoom/performance and native controlled-consumer input remain
excluded. Emulated touchscreen taps verify browser-dispatched events/layout;
they do not simulate physical pen accuracy, mobile OS behavior or assistive speech.
WebKit's Safari/macOS-style user agent is not an actual Apple-device result.
Browser floors and other operating systems remain unverified. On October 12,
2026, the owner explicitly declined physical-device and screen-reader validation.
Those checks are outside the required completion scope and are not release gates;
no real-device or NVDA/VoiceOver support claim follows.

No SDK public API, package version, DB/storage schema, dependencies or repository
hygiene changes. The opt-in runner/profile and analysis fixture are the only code
changes. Owning documents are [compatibility](../sdk/compatibility.md),
[VALIDATION](../../VALIDATION.md) and the active
[readiness review](12-readiness-review.md). Playwright, test-hardening and SDK
procedures apply. The standalone contract runner is unconfigured; core/package
verification remains in the existing `check` route. No fresh publication, provider
execution, real-device or operational SLA claim follows from browser fixtures.
