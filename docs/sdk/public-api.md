# SDK Public API

- Status: Proposed API responsibilities; exact symbols/signatures UNDECIDED
- Product contract: [Specification](../product/02-spec.md)
- Architecture: [ADR 0001](../adr/0001-initial-architecture-boundaries.md)

## Logical API Surfaces

| Surface | Responsibility |
| --- | --- |
| Core | Create positions/rule policies, apply actions, validate moves, inspect captures and navigate history |
| Records / SGF | Parse/export SGF, inspect metadata/properties, edit branches, select a node/path |
| SVG renderer | Mount a board, update snapshots, theme/crop/transform it, emit logical input, dispose resources |
| Viewer / editor | Load records, navigate branches, bind controls/comments, select editing modes |
| React adapter | Component lifecycle and host-controlled bindings over the same model/controller |
| Scoring | Dead-stone selection and score calculation with explicit rules |
| Puzzles | Authored answers, scripted responses, hints, restart and feedback |
| Analysis | Provider requests/results, cancellation, freshness and overlay normalization |

These are responsibilities, not finalized npm subpaths or exported type names.
Resolve names while implementing the first consumer example, then document actual
signatures here before publication.

## Contract Principles

- Prefer small typed configuration objects and composable interfaces.
- Keep plain-browser use straightforward; advanced consumers can supply their own
  state/controller and controls. Document who owns and mutates each object.
- Return structured move rejection reasons without partial mutation. Define parse
  diagnostics, import failures, and adapter errors explicitly.
- Publish read-only state views and action/change events. Renderers do not decide
  captures, enforce ko or maintain a competing record model.
- Use logical board coordinates in public actions/events. Display rotation,
  reflection and cropping must not change those meanings.
- Specify subscription cleanup and disposal. A destroyed view rejects late work
  while host-owned records remain available.
- Separate scoring input/output from uncertain AI evaluations. Document score
  perspective, win-probability units and ownership conventions for each adapter.
- Never require a remote provider for local board, record or viewer operations.

## API Validation Priorities

Use real consumers to cover headless imports, browser mounting, React lifecycle,
SGF export and selective imports. Once analysis ships, include delayed responses,
context changes and cancellation. Migration examples must accompany breaking
changes to actions, coordinates, events, serialization or ownership semantics.
