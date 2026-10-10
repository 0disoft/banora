# ADR 0006: Explicit Repetition and Rule Profile Boundaries

- Status: Accepted; repetition and the subsequent ADR 0007 profile/scoring scope
  have local evidence in the [delivery audit](../engineering/10-delivery-audit.md)
- Owner: UNASSIGNED
- Scope: M3 in the [product specification](../product/02-spec.md)

## Decision

1. Extend the explicit ko policy with `positional-superko` and
   `situational-superko`, retaining the existing `simple` default and `none`.
   Positional superko rejects a placement that restores any earlier stone layout
   in the current setup epoch. Situational superko additionally requires the same
   next player. The epoch's initial position is included.
2. Pass is always exempt from repetition rejection. Its resulting board/next-player
   situation is remembered, without clearing superko history. Only simple ko is
   released by passing. The repetition slice introduces no automatic game-end or
   pass-prisoner rule; [ADR 0007](0007-manual-scoring-and-named-profile-coverage.md)
   later adds explicit opt-in pass accounting while retaining the default behavior.
3. Successful setup/explicit turn editing starts a new repetition epoch, even for
   an unchanged layout. Preserve existing move/capture counters. Invalid setup
   leaves the entire position and its history unchanged.
   Controller commands that commit no semantic record change remain no-ops; they
   cannot create an SGF setup epoch. An explicit PL/setup child after a move can.
4. Store an immutable, structurally shared set of exact encoded board/next-player
   situations in superko positions. A compact hash trie indexes keys, but collisions
   are resolved by exact equality. Hash equality alone never rejects a move.
   Simple/no-ko positions need no full-history index. The set records membership,
   not chronological moves or controller edit Undo entries.
5. Recorded SGF moves continue to bypass legal-play rejection, including repeated,
   out-of-turn and occupied-point moves. Remember their resulting situations under
   the host's chosen policy. Future legal play uses that path's observed history;
   sibling variations and other games cannot contaminate it. Setup/PL resets it.
6. Controllers derive repetition from authoritative path replay. Cached positions,
   Undo/Redo, inspection and imports retain the same rules contract. `RU` remains
   preserved metadata and does not silently change the explicit host policy.
7. Named profiles must specify suicide, repetition, pass, handicap, scoring and
   unsupported adjudication behavior. The repetition slice alone does not claim
   full Japanese, Chinese, AGA, New Zealand or Tromp-Taylor rules. Select names and
   remaining details with their implementations rather than guessing from `RU`.

## Basis and Consequences

[Tromp-Taylor](https://tromp.github.io/go.html) distinguishes
stone placement from passing and checks earlier stone patterns. The
[AGA rules summary](https://www.usgo.org/content.aspx?club_id=454497&module_id=563542&page_id=22)
include the next player in repetition and additional pass/scoring procedures.
These sources motivate the explicit positional/situational distinction; Banora's
setup-epoch and recorded-playback behavior are SDK policies, not tournament rulings.

`Position.repetitionHistory` adds read-only state and `MoveFailure` adds `superko`.
Consumers enumerating failure reasons must handle it. Use SDK-produced positions;
do not substitute a visible-board snapshot for a position's repetition context.
Ordinary default play, SGF serialization and existing share-link payloads keep
their current behavior. SGF export does not implicitly persist a custom host policy.

## Verification

Cover immediate ko and longer cycles, positional/situational distinctions, suicide,
passes, setup epochs, exact hash collisions and immutable old snapshots. Controller
fixtures must cover branch/game isolation, recorded repetitions, cache eviction,
Undo/Redo and import atomicity. Installed headless exports and a mounted browser
consumer must demonstrate the same policy. Named profiles and scoring are pending
until their own fixtures and public consumers prove the documented coverage.
