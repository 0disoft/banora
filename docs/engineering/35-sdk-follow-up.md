# SDK Follow-up After External Review

- Status: In progress; local implementation does not establish npm publication.
- Source snapshot reviewed externally: `cacae6b`.
- Decisions are based on verified user workflows, not subjective competitor scores.

## Delivery Sequence

Each item is an independent implementation/verification/commit unit on existing
`main`. Preserve unrelated work, existing validation and ownership contracts.
No push or public publication is authorized by this improvement task.

1. Rendering: remove invisible read-only hover work and isolate ordinary mouse
   previews; then retain common Viewer outline elements during linear navigation.
   Compare actual browser work before/after and preserve touch, ink, keyboard,
   diagrams, focus, focused forks and lifecycle behavior.
2. Localization: connect puzzle/analysis widgets and board/touch system guidance
   to the existing twelve-locale contract, including update behavior. Never
   translate authored SGF, puzzle prompts, feedback or hints implicitly.
3. Large records: let Studio and common Viewer navigate the selected node's
   neighboring continuation and forks beyond the first 500 rows. Keep bounded
   rendering and existing indentation/folding rules; do not raise the whole-tree
   cap as a substitute for usable navigation.
4. Game information: add validated, undoable editing of players, game name,
   date, komi and result; integrate Studio and explicit confirmed scoring result
   persistence, preserving unknown SGF properties and export/reopen/checkpoints.
5. Release readiness: align API documentation, examples, release notes and a
   versioned publication plan after implemented changes pass installed-consumer
   validation. Registry/npm publication and Pages deployment remain separate,
   explicitly authorized actions.
6. Subsequent content tooling: DOM-free SVG generation and CLI diagram output,
   followed by explicit puzzle authoring/export from Studio's existing tree.
   Keep presentation, solution semantics and source preservation separate.

Streaming/bulk AI analysis, new compatibility targets and SGF conversion tools
remain proposals for later product decisions. They are not prerequisites for
the first usability delivery above, and are not claimed as implemented.

## Puzzle Localization Increment

The puzzle view now has explicit twelve-locale controls, accessible names, board
labels, progress, help and default/unlisted/rejected-action feedback. It exports
its own DOM-free `createPuzzleMessages` and optional locale/message configuration;
existing `UiMessages` callers acquire no new required fields. Headless puzzle
results and authored definitions are unchanged. Outcome identity distinguishes
system unlisted feedback from identical authored answer text.

Updates validate messages and board configuration before committing presentation
options; accepted overrides are copied. Locale changes preserve exact puzzle
state and emit no events. Chrome coverage extends the existing puzzle flow with
all-locale state/status/error transitions, authored text and safe overrides,
atomic invalid updates, explicit resets and owned/borrowed disposal. The focused
CI route retains the original puzzle validation and adds the new scenario.
Board live-region notices are next; large-record navigation,
game-information editing, release readiness and content tooling remain pending.

## Evidence

Mouse hover implementation/measurements are recorded in the
[performance budget](03-performance-budget.md#mouse-hover-projection).
Common Viewer outline reuse and measured DOM retention are recorded in the
[outline evidence](03-performance-budget.md#common-viewer-outline-reuse).
The first rendering increment is implemented locally; large-record windowing
and the remaining feature items below it in the sequence remain pending.
Touch confirmation prompt/group localization is implemented in all twelve
locales with backward-compatible optional label/message extensions. Puzzle and
analysis widgets now have their own twelve-locale feature catalogs and safe update
contracts. Board interaction notices remain pending; this is not a claim of
complete widget localization.
Other items remain pending until their implementation and verification are
recorded in [Validation](../../VALIDATION.md).

## Analysis Localization Increment

Analysis controls, accessible names, table headings, statuses, summaries,
ownership guidance, pass/PV captions and SDK failure explanations are localized
through `createAnalysisMessages` and optional view locale/messages. Public
`AnalysisError` diagnostics retain authored text using optional provenance on the
failure; headless reason/message fields and default transport redaction remain.
Puzzles and analysis share their literal override validation/copy policy. Language
updates preserve pending work, result identity, PV selection and source history.
The existing Chrome analysis flow is retained with an additional all-locale
scenario. Shared message policy changes select both puzzle and analysis scopes.
No public publication or push is included in this implementation increment.
