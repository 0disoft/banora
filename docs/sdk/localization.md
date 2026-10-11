# UI Localization

The optional `@banora/sdk/locale` module (also exported from the root and classic
browser global) provides `BanoraLocale`, `LocaleOptions`, `UiMessages`,
`createUiMessages(options)`, `formatUiMessage(template, values)` and
`createBoardLabels(options)`. The initial built-in languages are English (`en`)
and Korean (`ko`). SDK defaults are explicitly English; they never read navigator,
local storage, or a machine locale. These helpers are DOM-free.

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
