# UI Localization

The optional `@0disoft/banora/locale` module (also exported from the root and classic
browser global) provides `BanoraLocale`, `LocaleOptions`, `UiMessages`,
`createUiMessages(options)`, `formatUiMessage(template, values)` and
`createBoardLabels(options)` and the immutable `SUPPORTED_LOCALES` list. Built-in
languages are English (`en`), Chinese (`zh`, simplified characters), Hindi (`hi`),
Spanish (`es`), French (`fr`), Russian (`ru`), Indonesian (`id`), Japanese (`ja`),
Vietnamese (`vi`), Korean (`ko`), Thai (`th`) and Malay (`ms`). SDK defaults are
explicitly English; they never read navigator, local storage, or a machine locale.
These helpers are DOM-free.

`mountViewer`, `mountComparison` and `mountPlaybackControls` accept `locale` and an optional
`messages: Partial<UiMessages>` bag. Framework Viewer props forward both options.
`viewer.update({locale:'ko'})` changes labels in place, preserving record selection,
editing history and playback settings. `playbackControls.update({locale:'ko'})`
changes only control text. A direct controls update replaces the locale/message
configuration; Viewer updates merge its existing options.
Comparison updates retain their locale/message configuration when omitted;
`comparison.update({locale:'ko'})` relabels both selectors, summaries, comment
fallbacks and board accessibility without changing pins, cursor, record or Undo.
Invalid locale/message updates reject before changing presentation. Authored
node titles and comments remain literal. Selector move captions use board
coordinates, including localized empty/legacy passes; internal node IDs remain
option values rather than appearing in normal row captions.

```ts
import { mountViewer, mountBoard, createBoardLabels } from '@0disoft/banora';
const viewer = mountViewer(document.querySelector('#record')!, {
  locale: 'ko', messages: { variations: 'My variation list' },
});
viewer.update({ locale: 'en', messages: {} });
viewer.update({ locale: 'zh' });
viewer.update({ locale: 'ja' });
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

Studio detects all twelve supported browser language codes, including region tags
such as `hi-IN` or `es-MX`, on first load; unsupported languages use English.
Its header selector lists all twelve languages by their
native names, without a script qualifier on the Chinese label. Switching does not
reload or edit the record. An explicit selection is stored under `banora.studio.locale`; unavailable
storage falls back to session-only selection. `html.lang` and the document title
follow the selection. Authored SGF fields always retain their source language.

Studio's tools, navigation, variations, touch controls, file/unsaved-change dialogs,
texture controls, sharing and manual scoring use example-owned catalogs. Static
labels bind before authored data is populated; dynamic UI setters explicitly mark
UI text. No global DOM observer or heuristic translation of user data is used.
Every static catalog must cover the same keys as Korean at compile time.
Dynamic counts, board names, scoring results and error prefixes use shared typed
templates with literal placeholder substitution. Runtime diagnostics retain their
stable detail text, and locale codes also apply to diagnostic environment reports.
Underlying protocol/diagnostic details and rule IDs remain English/stable, and
linked puzzle/analysis consumer pages retain their current English UI. The comparison
widget follows Studio's current language, including when already open.
