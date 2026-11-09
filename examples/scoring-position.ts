import { RecordController, recordNodeAt, serializeSgf } from '@0disoft/banora';
import type { ControllerState, Position } from '@0disoft/banora';
import { getRuleProfile } from '@0disoft/banora/rules';
import type { RuleProfileId } from '@0disoft/banora/rules';
import { selectedRecordPrefix } from './record-prefix.js';

/** Replay the required history under counting rules; never borrow the live move-rule ledger. */
export function deriveScoringPosition(state: ControllerState, profile: RuleProfileId): Position {
  const model = new RecordController({
    sgf: serializeSgf(selectedRecordPrefix(state)),
    // Recorded moves bypass legal rejection; counting does not need a superko index.
    rules: { ...getRuleProfile(profile).play, ko: 'none' },
  });
  try {
    const target = recordNodeAt(model.getState().record, {
      gameIndex: 0,
      path: Array<number>(state.path.length - 1).fill(0),
    });
    if (!target) throw Error('Position is unavailable');
    return model.inspectNode(target.id)!.position;
  } finally {
    model.dispose();
  }
}
