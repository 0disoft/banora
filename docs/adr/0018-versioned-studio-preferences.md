# ADR 0018: Versioned Studio Preferences

- Status: Accepted; preference model implemented, UI/browser integration pending

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

Validate shapes/versions and field values, bounding serialized envelopes to 4 KiB.
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

## Evidence and Next Consumer Step

Unit checks cover migration, failed-write source retention, future/corrupt values,
independent field writes, explicit bounded reset and unavailable-storage sessions.
Studio mounting, control updates, record preservation and actual browser persistence
still need the next integration increment. This model does not itself claim that
the displayed controls are already restored or that reset is user-accessible.
