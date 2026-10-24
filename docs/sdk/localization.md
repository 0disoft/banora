# UI Localization

The optional `@0disoft/banora/locale` module (also exported from the root and classic
browser global) provides `BanoraLocale`, `LocaleOptions`, `UiMessages`,
`createUiMessages(options)`, `formatUiMessage(template, values)` and
`createBoardLabels(options)`, `formatUiFailure(code, {locale?})` and the immutable
`SUPPORTED_LOCALES` list. Built-in
languages are English (`en`), Chinese (`zh`, simplified characters), Hindi (`hi`),
Spanish (`es`), French (`fr`), Russian (`ru`), Indonesian (`id`), Japanese (`ja`),
Vietnamese (`vi`), Korean (`ko`), Thai (`th`) and Malay (`ms`). SDK defaults are
explicitly English; they never read navigator, local storage, or a machine locale.
These helpers are DOM-free.

`formatUiFailure` presents controller reasons directly (for example `occupied`),
SGF diagnostic categories as `sgf-${code}`, score reasons as `score-${reason}` and
share reasons as `share-${reason}`. Texture and file feedback use `texture`,
`io-read`, `io-write` and `io-diagram`. Every category has a human explanation in
all twelve languages. Unknown codes use a localized generic explanation; arbitrary
error text is never echoed. Unsupported locales and nonstring codes throw
`TypeError`. Existing command results, diagnostic details and machine codes are
unchanged. No new required fields are added to custom `UiMessages` bags.

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

Touch confirmation also uses localized `pointSelected` and `placementAt` message
templates, each with `{coordinate}`. `createBoardLabels` exposes these as optional
`selected` and `placement` BoardLabels alongside the existing confirm/cancel
templates. Native and controlled boards use them for the visible selection prompt
and confirmation-group accessible name; missing labels retain English defaults.
Controlled-board copies validate and snapshot both templates with the existing
1,024-character text bound. Updating labels replaces them for subsequent input;
as before, a board option update cancels pending touch placement.
The two new keys are optional in the public `UiMessages` type so existing complete
message bags still typecheck. `createUiMessages` returns all resolved fields as
`Required<UiMessages>`; every built-in locale supplies both translations.
These keys do not yet translate board live-region interaction notices or the
separate analysis widget.

## Puzzle Widget Messages

`mountPuzzle` accepts `locale` and `messages: Partial<PuzzleMessages>` from its
own feature catalog. `createPuzzleMessages`, `PuzzleMessages` and
`PuzzleLocaleOptions` are exported by `@0disoft/banora/puzzle-view` and the root.
The helper is DOM-free and returns a complete frozen catalog for the same twelve
locales. Default language is English and never depends on the browser.

```ts
import { mountPuzzle } from '@0disoft/banora/puzzle-view';
const view = mountPuzzle(container, { session: puzzle, locale: 'ko' });
view.update({ locale: 'ja', messages: { hint: 'ヒントを見る' } });
view.update({ locale: undefined, messages: undefined }); // Reset to English defaults.
```

Controls, accessible group names, board labels, keyboard/marker help, progress,
default feedback, unlisted-answer guidance and rejected-action explanations are
localized. `progress` accepts `{color}`, `{status}`, `{attempts}` and `{moves}`;
`rejected` accepts `{reason}`. Overrides are literal text, defensively copied and
limited to 4,096 characters per known string field. Invalid locale/message/crop
updates retain the previous language, presentation, callbacks and puzzle state.
Omitted options retain the prior configuration; explicit `undefined` resets the
locale or messages. Existing English callers and headless `PuzzleSession` results
remain compatible. Feature messages do not add required keys to `UiMessages`.

Language updates preserve the exact puzzle state, attempts, hints, authored
feedback and source definition, without emitting puzzle events. A rejected action
remains visible in the new language until a subsequent action changes the state.
System unlisted feedback is identified by its outcome, never by matching English
text: identical text authored for a successful answer is preserved as authored.

Authored SGF names, player names, comments, coordinates, metadata, rule identifiers,
CLI machine output and protocol/error diagnostics retain their original content.
Localization changes presentation only; no record rewrite or remote translation
service is used. Analysis widget messages and board live-region interaction
notices still have their existing English text; their localization remains pending.

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
Search, help and draft modals bind their original static labels after moving into
their permanent document owner. A non-English initial mount therefore keeps
working when switching to any supported language, including back to English.
Every static catalog must cover the same keys as Korean at compile time.
Dynamic counts, board names and scoring results use shared typed templates with
literal placeholder substitution. Rejected moves, SGF imports, file/diagram exports,
sharing, textures and scoring failures display localized explanations rather than
raw machine reasons or exception text. Visible feedback follows language changes;
switching languages does not restart or revive Studio's three-second action notice.
Viewer failures also follow `viewer.update({locale})`. Diagnostic collection retains
its stable machine codes and detail contract, and locale codes also apply to diagnostic environment reports.
Underlying protocol/diagnostic details and rule IDs remain English/stable, and
linked puzzle/analysis consumer pages retain their current English UI. The comparison
widget follows Studio's current language, including when already open.
