# Position Analysis Consumer

Run the repository's `bun run dev`, then open `/analysis/`. For a static build use
`bun run build:examples`; this page is emitted under `dist/examples/analysis/`.
It imports only built public `@0disoft/banora` entrypoints. No account, credentials,
engine asset or remote endpoint is required for the offline mode.

## Offline Protocol Illustrations

Choose one of the two original positions, then Analyze position. The host feeds an
authored response through the actual `KataGoProvider` JSON boundary and displays
the common `AnalysisSession`/`mountAnalysis` result. Numbers/ownership are explicitly
illustrative; they were not computed or recorded from an engine and establish no
move-quality claim. Other edited positions intentionally fail instead of inventing
predictions; return to First record node or switch to manual mode.

Select a candidate or pass to preview its continuation, use Previous/Next PV move,
inspect numeric ownership at a root intersection, toggle ownership, rotate/change
theme and download the preview SVG. Source moves/comments/Undo/navigation/export
remain separate. Source SGF retains its comments/unknown properties and never stores
prediction overlays or speculative PV branches. Unmount/remount borrows the model,
so a matching completed result can be shown again without another request.

## Manual KataGo JSON

1. Configure your own KataGo analysis process/model, using Black reporting
   (`reportAnalysisWinratesAs=BLACK`) and `preventCleanupPhase=true`. Engine setup,
   models, hardware and credentials remain your responsibility. Read KataGo's
   [official analysis protocol](https://github.com/lightvector/KataGo/blob/master/docs/Analysis_Engine.md)
   and Banora's [supported-context contract](../../docs/sdk/katago.md).
2. Choose Manual KataGo JSON, then Analyze position. Copy the single JSON line in
   Latest outgoing KataGo JSON line to the engine's stdin, followed by one newline.
3. Paste one complete stdout response line into Incoming KataGo stdout JSON line
   and select Process response line. Matching interim reports are ignored; only
   the exact ID/epoch turn/current player final updates the result. Warnings/errors
   fail the request without exposing their raw engine text in the analysis panel.
4. Cancel analysis produces a scoped termination JSON line. Deliver it to your
   engine too; the page cannot stop a separately owned process itself. Late data is
   ignored immediately even before engine termination. Navigation/play/provider
   replacement similarly invalidates pending data.

This mode is a manual host bridge, not an automatic connection. It permits real
external analysis without embedding server/process policy into the SDK. For a
production host, connect ordered writes/stdout framing and call `provider.fail()`
on EOF/disconnect. Own transport deadlines/backpressure/authentication explicitly;
do not feed stderr logs or silently retry. No default URL/socket is created here.
Textarea data is temporary page state; source SGF export does not include it.

## Local Evidence

After building, `bun scripts/browser-smoke.ts --analysis-only` checks actual
production controls plus an independent public-SDK fixture. It requires the exact
`banora-analysis-complete` CLI Result, identical before/after downloaded source SGF,
and a six-stone PV SVG excluding predictions/cursor. It covers keyboard, emulated
mobile touch/layout, Black/White metrics, captures/pass/steps, ownership, transforms/
crop, invalid updates, callback replacement, explicit submission, manual errors,
stale/cancelled/destroyed-view replies and owned/borrowed lifetime. Screenshots and
download artifacts are ignored under `output/playwright/`.

No engine binary/model was run by this fixture. Broader browsers, physical devices,
screen readers and model/version compatibility remain separate evidence. Native
React/Vue/Svelte Analysis components are not exported; hosts can mount the shared
view from their lifecycle. See the [view contract](../../docs/sdk/analysis-view.md).
