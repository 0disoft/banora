# ADR 0007: Manual Scoring and Named Profile Coverage

- Status: Accepted; implementation evidence tracked separately
- Owner: UNASSIGNED
- Scope: M3 in the [specification](../product/02-spec.md)
- Related: [repetition boundaries](0006-explicit-repetition-and-rule-profile-boundaries.md)

## Decision

1. Supply immutable, explicitly selected presets for Japanese territory, AGA
   territory, AGA area and Tromp-Taylor area. Each contains play and scoring
   policies. These are SDK presets for agreed positions, not complete tournament
   adjudicators. Unknown profile IDs fail explicitly; SGF `RU` remains metadata.
2. Add `RulePolicy.passStones`, default false. A pass under an enabled policy adds
   one prisoner to the opponent's separate `Position.passPrisoners` ledger; ordinary
   captures remain separate. Preserve this ledger through setup and recorded replay.
   Add `consecutivePasses`, reset by play/setup. Neither field automatically ends a
   game or forces a further move. Default legal play remains unchanged.
3. Score an immutable position and explicit manual dead/seki selections. A selected
   stone represents its entire connected same-color group. Empty/outside selections,
   overlapping dead/seki groups and invalid numeric inputs fail atomically. Never
   estimate life/death or automatically treat an engine's ownership as certainty.
4. Remove agreed dead groups from a derived board; credit their stones as prisoners
   to the opponent. Flood-fill empty regions: only regions adjacent exclusively to
   one color are owned. Mixed-border/no-border regions remain neutral. Japanese
   territory excludes regions adjacent to manually marked seki groups; area and
   AGA territory include otherwise single-color surrounded regions.
5. Territory totals use territory plus prisoners; area totals use territory plus
   remaining stones. Prisoners have separate capture, dead and pass components.
   Komi is explicit, default zero, and credited to White. AGA area adds the explicit
   handicap count minus one to White, bounded below by zero. AGA territory has no
   such area adjustment. Hosts can supply explicit per-color score adjustments.
6. Reports expose component totals, neutral count, selections, ownership, winner
   and margin, plus whether the recorded pass sequence satisfies the selected
   preset. AGA requires White's last pass. Missing passes produce a warning, not
   silent synthetic passes or a refusal to calculate a provisional score. A valid
   pass sequence is not proof that the players agreed on status or finished dame.
7. AGA scoring requires an AGA pass-stone ledger (enabled play policy); otherwise
   report a profile mismatch. Scoring does not certify that every prior move was
   legal under a chosen named profile. Static diagrams and incomplete histories
   require explicit host context; do not manufacture missing prisoner counts.
8. Scoring selections/reports are transient host state. Calculations do not edit
   SGF, move a record cursor, acknowledge export, or write a result property. A
   consumer clears or revalidates selections when its source position changes.
   Record-result persistence and player agreement remain explicit host operations.
9. Add selective headless `rules` and `scoring` entrypoints in the common SDK.
   Both are optional and require no DOM, framework or third-party runtime dependency.
   Framework consumers share the same calculator rather than duplicating formulas.

## Source Basis and Boundaries

The [Japanese 1989 rules](https://www.nihonkiin.or.jp/match/kiyaku/zenbun.html)
distinguish seki territory and agreed dead stones, and contain post-stop ko/life-death
and no-result procedures. The
[AGA summary](https://www.usgo.org/content.aspx?club_id=454497&module_id=563542&page_id=22)
describes pass stones, White's last pass, area handicap adjustment and situational
repetition. [Tromp-Taylor](https://tromp.github.io/go.html) defines positional
repetition and area counting, with an agreed-dead-stone shortcut.

Banora does not implement Japanese hypothetical post-stop play, bent-four/special
ko adjudication, automatic life/death/seki detection, no-result rulings, tournament
penalties, forced White-last-pass moves, automatic handicap placement, or player
agreement. Hosts must finish dame/status questions before treating a report as a
final result. Other named systems are not inferred from similar policy settings.

## Validation

Use small exact fixtures for area/territory differences, prisoners/self-capture,
whole-group corrections, neutral regions, seki, negative/fractional komi, handicap
adjustments, AGA pass accounting and invalid-input retention. Core/controller
fixtures cover pass ledger replay, setup and branch/Undo isolation. Installed
headless exports and a public browser consumer must calculate identical components.
Browser selection/lifecycle evidence is pending until the UI increment ships.
