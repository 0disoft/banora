# Analysis View

`@banora/sdk/analysis-view` and root exports provide `mountAnalysis`, `AnalysisView`,
`AnalysisViewOptions` and `AnalysisBoardOptions`. Import is safe without runtime
browser globals; mounting requires a browser DOM. The view displays the common
[analysis session](analysis.md), without an engine, network or framework dependency.

```ts
import {mountAnalysis} from '@banora/sdk/analysis-view';

// Borrow an existing model; mounting never submits its position.
const view = mountAnalysis(element, {
  session: analysis,
  board: {theme:'flat', transform:{rotation:90}},
  request: {maxVisits:1000, maxPvLength:16, includeOwnership:true},
  onComplete: completion => console.log(completion.ok)
});
view.dispose(); // Existing analysis/controller/provider remain live.
```

Alternatively supply `controller`, `provider` and `settings` instead of `session`.
The view creates/owns that session and disposes it on cleanup/failed mount; the
controller/provider are still borrowed. Supplying both forms, or an incomplete
construction form, throws. The public `view.session` lets the host call settings,
provider, cancellation and request methods directly. `AnalysisSession.controller`
is its borrowed live source; access throws after session disposal. Dispose a view
before externally disposing its borrowed model/controller.

## Requests, Metrics and Ownership

The Analyze position button explicitly requests the captured source context. View
request defaults are 1,000 visits, 16 PV continuation moves and ownership requested
(`AnalysisSession.request()` alone defaults to no requested ownership). Use the
common request bounds; options never cause a submission on mount/update/remount.
Analyze is disabled while loading or when the model context is unavailable. Cancel
analysis settles pending work through the model; host-owned transport cancellation
remains advisory. Provider/validation errors remain plain-text analysis diagnostics,
leaving the source's local play/edit/Undo/export available.

Display root Black win probability, predicted Black score lead and visits. The
candidate table shows provider rank, logical move/pass, Black win probability/lead,
visits and nonnegative estimated score loss for the actual current player. Loss is
relative to the best candidate score estimate, not a claim about a played historical
move. Ranking can use different provider utility. See the common result contract
for exact metric/legality bounds and Black perspective normalization.

At the analyzed root, numbered circles identify on-board candidates; pass appears
in the table. An independent SVG layer overlays ownership squares: blue favors
Black, orange White, opacity scales with magnitude. Positive values favor Black,
negative White. Toggle ownership display without changing analysis or the record.
Root keyboard/pointer activation selects a candidate if one occupies the point;
otherwise it displays that point's numeric ownership when available. Arrow keys
move the shared board cursor, and Enter activates the point. Candidate buttons,
table metrics and textual PV controls remain available without color perception.
Ownership is predicted root data, not life/death confirmation or manual scoring.

## Isolated Principal Variations

Selecting a candidate previews its first move. Previous/Next PV move steps through
the validated line, including legal captures/passes and move labels. Return to
analyzed position clears the selection. If the provider supplies an empty PV,
preview only the candidate and explicitly state that no continuation was supplied.
No predicted move is applied to the source record or added as an SGF branch.

The private display record contains only the visible position/turn and PV labels,
without source comments/player metadata, capture ledgers or repetition history.
Actual preview positions use the captured full core state and normal legality;
the display record is a drawing, not a replacement game context. Hide root candidate/
ownership overlays during PV steps; do not reinterpret a root prediction as a
prediction for a hypothetical future board. Preview navigation never submits again.

New result/context identities reset selected PV, inspected point and overlays.
Navigation, play, setup, import, rules/komi or provider changes invalidate the common
model and immediately clear old display data. Comment-only edits preserve a
semantically matching result. The view reads the model's current state during
notification, preventing an earlier queued state from restoring obsolete content.

## Presentation, Export and Lifetime

`board` accepts theme, coordinate visibility, crop, transform, touch configuration
and ready stone textures. Logical points remain unchanged by presentation. Candidate/
ownership geometry uses the same transform/crop/padding as the common SVG board;
focus/cursor redraws cannot erase the separate prediction layer. On a smaller source
board, reset an incompatible old crop to full board. Presentation alone does not
edit the source, change its export baseline or request analysis.

`update({board,request,showOwnership,onComplete})` merges configuration and snapshots
mutable crop/transform/touch/texture maps and request limits. Invalid board/request
configuration retains prior presentation/model. Callback changes apply to later
completions of requests initiated by this view's Analyze button; explicit host
requests are not reported by that callback. Listener exceptions are isolated and
pending completion delivery is detached when the view is disposed. Replacing its
session/controller/provider/settings ownership through `update` throws; remount or
use the public session's own settings/provider methods.

`exportSvg`/`exportPng` export the currently displayed root/PV position using common
bounded diagram options. PV move labels are included; candidate/ownership layers
and the interactive cursor are excluded. They do not export/save/acknowledge the
source SGF. Disposed views reject exports/updates; disposal is idempotent and removes
DOM, input/subscription/display resources. A borrowed session can complete after
unmount and display its matching result on a later remount, but cannot update a
destroyed view. An owned session is cancelled/disposed with its view.

The common view can be mounted from React/Vue/Svelte host lifecycles; native Analysis
component exports are not shipped. Browser consumer evidence is recorded in
[implementation status](../engineering/08-implementation-status.md). No physical
device, broad browser floor, live engine quality or throughput guarantee is implied.
See [ADR 0011](../adr/0011-isolated-analysis-view-and-explicit-consumer.md).
