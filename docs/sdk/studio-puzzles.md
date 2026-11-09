# Studio puzzle authoring

Studio authoring uses the existing `banora.puzzle/v1` definition and canonical
`PuzzleSession` validator. It does not add a new puzzle format or infer success
from engine evaluation, SGF `TE`/`BM`, comments or the first variation.

## Write, try and download

1. In Studio, arrange the starting stones, choose the side to play and create
   alternative continuations with the existing board and variation tools.
2. Select the position immediately before the first answer move. Open the board
   or header menu and choose **Create puzzle**; this opens the authoring dialog directly.
3. Enter an ASCII puzzle ID, title and question. Select answer rows to inspect the
   resulting board, set explicit correct/incorrect endings, add feedback and one
   text hint per position, or exclude unwanted branches. On a continuing opponent
   turn, choose its automatic reply explicitly.
4. Choose **Test puzzle** and play the resulting exercise. Unlisted moves, hints,
   automatic replies, correct/incorrect outcomes and restart use the existing
   puzzle widget. **Edit answers** restores the authoring board. Changing a
   draft field invalidates the trial rather than leaving an outdated preview.
5. Choose **Download puzzle JSON** for `<id>.puzzle.json`. Loading this definition
   into `PuzzleSession` or `mountPuzzle` needs no conversion and no DOM for headless use.

All twelve Studio languages cover controls and validation. Language changes retain
exact authored title/question/feedback/hint text, choices and trial progress.
The selected game's name and selected comment seed the title and question;
move comments seed answer feedback but never determine answer correctness.

The dialog owns an ephemeral draft and preview, not a second editable record.
Authoring, trying and downloading never modify the source SGF, selection, undo
history or dirty/export baseline. Closing/Escape discards the draft. Any source
edit, navigation, import, board switch or board closure revokes the snapshot and
closes the dialog; late submissions cannot export a stale definition. Reopening
starts a fresh draft. Drafts are not autosaved or restored from puzzle JSON.
Owned views, subscriptions and pending download URLs/timers are disposed on close
and page teardown. The original controller remains borrowed and untouched.

## Draft conversion

The selected node becomes the starting position; its descendants become draft
answers. Export preserves only that game's selected ancestor path, including
metadata, comments, unknown properties and recorded move history. Other games
and unrelated branches are omitted. The initial portable locator is rewritten
against that pruned prefix. Position rules and solver color come from the
selected immutable state, preserving history for ko/superko and captures.

Each included ending needs an explicit correct/incorrect result. Continuing
opponent turns require an explicitly chosen automatic reply, even with one child.
An ending cuts off further descendants; excluded branches are omitted entirely.
At least one correct ending must remain reachable under the chosen reply policy.
Every included branch is checked by the existing strict normal-play puzzle
compiler, including alternatives not chosen as automatic replies. Historical SGF
replay permissiveness is not used to repair an illegal answer tree.

Annotation-only nodes do not become invented passes. Move-node comments seed
editable feedback. Comments on annotation-only descendants are not automatically
assigned to a different answer. Setup/turn/size edits after the initial position
remain visible unsupported draft entries: exclude those branches or select a
later initial position. No source node is modified or deleted by this conversion.

Limits remain 1000 answer nodes (including root), depth 128, title 256 characters,
prompt/feedback/hint 4096, ID 64 ASCII letters/digits/underscores/hyphens, and the
SDK's aggregate text/SGF limits. Studio additionally requires a nonblank title
and question and caps exported UTF-8 JSON at 8 MiB. Oversized trees are rejected,
never silently truncated. Preview positions replay only the selected answer path
from the immutable starting Position, without repeatedly parsing its SGF.

The exported JSON is directly accepted by `new PuzzleSession(definition)` or
`mountPuzzle(host, { definition })`. The answer tree is public client data; this
is a manually authored exercise, not automatic objective verification or a
concealed-answer service. Registry publication remains a separate action.
