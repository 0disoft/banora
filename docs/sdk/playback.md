# Record Playback and Navigation

- Status: Headless playback implemented; shared Studio/Viewer controls follow

`@banora/sdk/playback` and the root/global export provide
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
