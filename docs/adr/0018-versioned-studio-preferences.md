# ADR 0018: Versioned Studio Preferences

- Status: Accepted; preference model and Studio integration implemented

## Decision

Store supported presentation and autosave preferences as bounded scalar envelopes
with `schemaVersion: "banora.studio-preference/v1"`. Use a common typed model and
per-field keys under `banora.studio.preferences.`. Each interaction writes only
that field, so another tab changing theme cannot overwrite an independent language
or autosave choice. Same-field persistence is last explicit interaction wins;
already-open tabs keep their independent session values until reload.

Supported fields are language, board display size/theme, move-number visibility,
rotation/reflection, touch mode/magnifier, animation enablement/duration, recorded
playback interval and local autosave enablement. Do not persist document content,
Undo, selected tools/next player, scoring, provider credentials, images or filenames
in preferences. The SDK owns no storage; these are Studio consumer choices.

Validate shapes/versions and field values, bounding serialized envelopes to 4 KiB
in UTF-8 bytes (including multibyte content).
Unknown/invalid data stays untouched on ordinary edits, which remain session-only
for that field. Explicit reset may replace known preference keys only. Unknown
future fields, drafts, checkpoints and unrelated host storage are never cleared.
If the autosave preference cannot be read or decoded, default it off until a user
explicitly enables it. Never infer consent to retain authored content from corrupt
or unavailable preference data.

Migrate the three legacy language/display-size/draft-enable keys independently.
Validate values and publish the versioned value before removing its old source.
If a write fails, keep legacy data and the user's usable session choice. Supported
new-format values take precedence; future formats are neither downgraded nor
silently deleted. No background retry loop or account synchronization is added.

## Consumer Integration and Evidence

Unit checks cover migration, failed-write source retention, future/corrupt values,
independent field writes, explicit bounded reset and unavailable-storage sessions.
Studio applies validated input values before mounting the board/playback and shares
the model with draft autosave. Existing view handlers also apply explicit reset,
including the default playback interval followed by pause. **Settings → Reset saved
settings** is available both below the workspace and beside the board. Routine
success has no persistent help paragraph; failures have localized action text.

Production Chromium checks legacy migration/new-format precedence, all twelve
restored values, actual board theme/transform/numbering/size, independent simultaneous tabs,
reset with a dirty selected position, retained drafts and working Undo/Redo.
Downloaded before/after checkpoint payloads are identical, including the export
baseline, selection and rules. Future versions survive ordinary edits, corrupt
autosave fails closed, explicit reset recovers known fields, denied storage leaves
editing usable and all four reset translations fit the 320px board menu.
The scenario runs through `--preferences-only` and the full browser suite.

No account sync or live cross-tab application is implied. Physical devices,
non-Chromium storage policies and hosted CI execution remain unverified.
