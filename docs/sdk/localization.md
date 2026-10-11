# UI Localization

The optional `@banora/sdk/locale` module (also exported from the root and classic
browser global) provides `BanoraLocale`, `LocaleOptions`, `UiMessages`,
`createUiMessages(options)`, `formatUiMessage(template, values)` and
`createBoardLabels(options)`. The built-in languages are English (`en`),
Korean (`ko`) and Chinese (`zh`, using simplified characters). SDK defaults are
explicitly English; they never read navigator, local storage, or a machine locale.
These helpers are DOM-free.

`mountViewer` and `mountPlaybackControls` accept `locale` and an optional
`messages: Partial<UiMessages>` bag. Framework Viewer props forward both options.
`viewer.update({locale:'ko'})` changes labels in place, preserving record selection,
editing history and playback settings. `playbackControls.update({locale:'ko'})`
changes only control text. A direct controls update replaces the locale/message
configuration; Viewer updates merge its existing options.

```ts
import { mountViewer, mountBoard, createBoardLabels } from '@banora/sdk';
const viewer = mountViewer(document.querySelector('#record')!, {
  locale: 'ko', messages: { variations: 'My variation list' },
});
viewer.update({ locale: 'en', messages: {} });
viewer.update({ locale: 'zh' });
const board = mountBoard(document.querySelector('#board')!, {
  labels: createBoardLabels({ locale: 'ko' }),
});
```

Record/native Board `labels` and controlled-board `labels` accept the same
`BoardLabels` templates. Viewer supplies localized board labels; explicit
`board.labels` take precedence. Values are rendered as text, never interpreted as
HTML. Message overrides are defensively copied/frozen; unknown keys, nonstrings,
values longer than 4,096 characters and unsupported locales throw before applying
an update. Template placeholders are replaced literally, without expression
execution. Existing BoardLabels customization stays independent of locale helpers.

Authored SGF names, player names, comments, coordinates, metadata, rule identifiers,
CLI machine output and protocol/error diagnostics retain their original content.
Localization changes presentation only; no record rewrite or remote translation
service is used. Puzzle and analysis widgets currently have their existing English
labels and are outside the built-in Viewer language bundle.

## Studio Language Selection

Studio detects Korean (`ko*`) and Chinese (`zh*`) browser languages on first load,
otherwise English. Its header selector lists English, Korean and Chinese by their
native names, without a script qualifier on the Chinese label. Switching does not
reload or edit the record. An explicit selection is stored under `banora.studio.locale`; unavailable
storage falls back to session-only selection. `html.lang` and the document title
follow the selection. Authored SGF fields always retain their source language.

Studio's tools, navigation, variations, touch controls, file/unsaved-change dialogs,
texture controls, sharing and manual scoring use example-owned catalogs. Static
labels bind before authored data is populated; dynamic UI setters explicitly mark
UI text. No global DOM observer or heuristic translation of user data is used.
The Chinese static catalog must cover the same keys as Korean at compile time.
Underlying protocol/diagnostic details and rule IDs remain English/stable, and
linked puzzle/analysis consumer pages and the comparison widget retain their current English UI.
