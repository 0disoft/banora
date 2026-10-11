# Record Playback and Navigation

- Status: Headless playback and shared Studio/Viewer controls implemented; six production consumers checked

`@0disoft/banora/playback` and the root/global export provide
`createRecordPlayback(controller,{intervalMs?})`, `normalizePlaybackInterval`,
`RecordPlayback`, `PlaybackOptions` and `PlaybackState`. Importing and using the
coordinator require no DOM; the runtime must provide standard timeout functions.
The default interval is 1,000 ms; valid integer intervals are 500 through 5,000 ms.

`getState()` returns an immutable snapshot of `playing`, `intervalMs` and `canPlay`.
`subscribe(callback)` immediately supplies that snapshot and returns cleanup.
`play()` advances from the current node only after the selected interval.
It follows each node's first child, matching the existing Next command. Select a
variation first to replay its continuation. It never creates a move or changes
SGF, dirty state or Undo history. At a leaf it pauses without wrapping to the start.

`pause()` cancels the pending step; `setInterval(milliseconds)` validates before
changing settings and restarts the pending delay if playing. Manual navigation,
record edits/reordering and successful import pause playback, including reentrant
host changes during a timed transition. Failed controller commands leave replay
alone because the record/selection did not change. `dispose()` cancels timers and
subscriptions, is idempotent and does not dispose the borrowed controller.

Hosts own their playback instance and dispose it before their controller. This
coordinator belongs to Banora-managed records; externally authoritative
controlled boards retain their host's navigation/transport semantics.

## Shared Browser Controls

`@0disoft/banora/playback-controls` and the root/global export provide
`mountPlaybackControls(container,{controller,scope?,intervalMs?,onAction?})`,
`PlaybackControlsOptions` and `PlaybackControls`. Importing is SSR-safe; mounting
requires a DOM. The returned handle exposes `playback` and idempotent `dispose`.
Dispose removes only the controls' own DOM/listeners/timer, not the controller.

Controls show Play/Pause, a 0.5–5 second interval selector in 0.5-second steps and
keyboard help. The default interval is 1 second. No playback starts on mount.
Viewer automatically includes these controls; Studio uses the same public mount.
`ViewerOptions.playback:{intervalMs}` sets the interval and
`ViewerView.playback` exposes the common coordinator to hosts. Invalid playback
updates leave the interval/presentation unchanged. Omitted playback updates retain
the selected interval. Native React/Vue/Svelte Viewer props forward this option;
the classic browser distribution exposes the same API.

Keyboard and interaction belong to a declared scope. Studio uses the page body;
each Viewer uses its own root so multiple viewers do not all navigate together.
Outside editable fields and the board, Left/Right navigate previous/next.
With SVG board focus, ordinary arrows retain cursor/ink navigation and
Alt+Left/Right navigate the record. The capture handler consumes handled keys
exactly once, preventing browser-history navigation for these Alt shortcuts.
Input/textarea/select/contenteditable and common ARIA editing controls retain
their native keys. Open native dialogs block the page shortcuts.
Focus entering a native modal dialog pauses replay even when the host places
that dialog outside the controls' input scope. This also covers keyboard-opened
confirmations; closing or cancelling a dialog does not resume replay.

Pointer interaction outside the playback controls, focus in an editable field,
manual navigation/edits/import, hidden-document transition and pagehide pause
replay. Changing the interval keeps playing with a fresh delay. Resuming is
explicit; there is no catch-up burst or automatic looping. SGF comments/setup/pass
nodes each consume one interval just like ordinary Next navigation.

Production Chrome checks Studio (including an original 162-move long record),
common Viewer, React, Vue, Svelte and classic-script consumers for timing, end,
speed changes, keyboard guards, imports and cleanup/remount. Exported SGF retains
all recorded moves/comments/unknown properties. Headless unit tests exercise real
timers, validation, cancellation and reentrant host navigation; installed types
check the DOM-free coordinator and SSR-safe browser API separately. Background
timer precision, physical devices and other browser engines are not guaranteed.

Playback keyboard guidance is provided through the controls' localized tooltip,
keeping the default toolbar compact without changing keyboard behavior.
