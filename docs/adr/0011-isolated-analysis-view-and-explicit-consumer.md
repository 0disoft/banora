# ADR 0011: Isolated Analysis View and Explicit Consumer

- Status: Accepted direction; implementation evidence tracked separately
- Scope: M4 analysis display and runnable consumer

## Decision

Provide `mountAnalysis` through a selective SSR-safe `analysis-view` entrypoint.
Mount with an existing `AnalysisSession`, or with a borrowed controller/provider
and explicit settings to create an owned session. Never submit on mount, navigation,
presentation update or remount. Only the Analyze control or explicit host request
submits. Disposing a borrowed view releases only its own resources; disposing an
owned view also cancels/disposes its session. Neither owns the controller/provider.
Expose the session's borrowed source through a live read-only `controller` getter.

Render an isolated read-only display record, rather than adding predictions or PV
nodes to the source SGF. Show ranked legal candidates, Black win probability,
Black score lead, current-player score loss, visits and ownership. A candidate
selection previews its legal PV through core transitions with previous/next/return
controls and move numbers, including passes/captures. When a provider supplies no
PV, preview only its candidate and explicitly describe the missing continuation.
Never infer a puzzle answer or commit a predicted move to the record.

Draw candidate ranks and ownership in a separate SVG presentation layer using
the common board transform/crop and shared padding. The layer survives board focus/
cursor redraws, does not intercept input and is excluded from exported position
diagrams. Ownership is a prediction of the analyzed root only: hide it during PV
steps instead of transferring it to a different hypothetical board. Positive favors
Black, negative White; disclose colors and offer numeric point inspection through
keyboard/pointer input. The candidate table also exposes all move metrics in text.

On a new result identity or any context invalidation, clear selected PV, inspected
point and overlays immediately. Comment-only updates preserve the matching result.
Presentation controls never request analysis or edit/acknowledge the source. Use
plain text for provider diagnostics. Mount failure must clean up detached DOM,
display resources and owned session; invalid presentation updates retain prior
configuration. Changing sessions requires a remount, not a hidden owner swap.

Provide an English runnable `examples/analysis` consumer using public package exports.
Its offline mode uses explicitly labeled, repository-authored illustrative protocol
fixtures for known positions; no engine-derived quality claims or generated secrets.
A manual KataGo JSON mode displays the real outgoing query and accepts host-pasted
stdout responses through `KataGoProvider`. No automatic URL/process/credentials or
connection. Local play/Undo/navigation/export remain usable during failure or delay.
The host chooses request limits/ownership explicitly and demonstrates disposal/remount.

## Validation

Test isolated legal PV captures/passes and safe display serialization. Verify installed
SSR-safe entrypoint/types; mounting still requires a DOM. A focused real-browser
scenario must exercise candidate selection/metrics, PV steps, ownership/point values,
logical transform/crop alignment, keyboard/emulated touch, explicit submission,
source preservation, error recovery, cancellation, delayed results after context
change/destruction and owned/borrowed lifecycle. Require the exact completion Result
and actual SVG download. No live engine/model or physical-device compatibility is
established by offline protocol fixtures. Native Analysis component exports are
not required for this common SDK view and must not be claimed unless implemented.
