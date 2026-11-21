import { expect, test } from 'bun:test';
import { RecordController } from '../src/controller.js';
import { createVariationTreeModel } from '../src/variation-tree-model.js';
import type { VariationRow } from '../src/variations.js';

test('one tree model handles window reuse, presentation equality and invalidation', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9];B[aa](;W[bb];B[dd])(;W[cc];B[ee]))(;SZ[5];B[aa])',
  });
  const model = createVariationTreeModel();
  const describe = ({ node, collapsed }: VariationRow) => ({
    id: node.id,
    collapsed,
    hasComment: !!node.properties.C?.[0]?.trim(),
  });
  const update = (presentationScope = 'en', focused = true) =>
    model.update(controller.getState(), { focused, presentationScope, describe });
  try {
    const root = controller.getState().node.id;
    expect(update()).toMatchObject({ reusedWindow: false, sameRows: false, truncated: false });
    expect(update()).toBeUndefined();
    controller.next();
    expect(update()).toMatchObject({
      previousSelection: root,
      reusedWindow: true,
      sameRows: true,
      rows: undefined,
    });
    controller.next();
    expect(update()).toMatchObject({ reusedWindow: false, sameRows: false });
    controller.setComment('first');
    expect(update()).toMatchObject({ reusedWindow: false, sameRows: false });
    controller.setComment('second');
    expect(update()).toBeUndefined();
    expect(update('ko')).toMatchObject({ reusedWindow: false, sameRows: false });
    expect(update('ko', false)).toMatchObject({ reusedWindow: false, sameRows: false });
    controller.goTo(controller.getState().record.games[1]!.id);
    expect(update('ko', false)).toMatchObject({ reusedWindow: false, sameRows: false });
    model.reset();
    expect(update('ko', false)).toMatchObject({
      previousSelection: undefined,
      reusedWindow: false,
    });
  } finally {
    controller.dispose();
  }
});
