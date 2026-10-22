import { expect, test } from 'bun:test';
import { recordBoardBinding } from '../src/board-record.js';
import { RecordController } from '../src/controller.js';

test('move numbers retain setup, annotations, passes, MN, branches and game selection', () => {
  const controller = new RecordController({
    sgf:
      '(;SZ[9]AB[cc];B[aa]MN[10];C[note];W[];AE[aa]AW[ee]MN[20]' +
      '(;B[bb];W[tt];B[dd])(;B[hh]MN[7];W[ii]))(;SZ[13];W[ll]MN[50];B[])',
  });
  const binding = recordBoardBinding(controller, false);
  try {
    const root = controller.getState().record.games[0]!;
    const move = root.children[0]!,
      comment = move.children[0]!;
    controller.goTo(comment.id);
    expect([...binding.getState().numbers()]).toEqual([[0, 10]]);
    const setup = comment.children[0]!.children[0]!;
    controller.goTo(setup.id);
    expect([...binding.getState().numbers()]).toEqual([]);
    const main = setup.children[0]!.children[0]!.children[0]!;
    controller.goTo(main.id);
    const frame = binding.getState();
    expect([...frame.numbers()]).toEqual([
      [10, 21],
      [30, 23],
    ]);
    expect(binding.getState()).toBe(frame);
    expect(frame.numbers()).toBe(frame.numbers());
    const branch = setup.children[1]!.children[0]!;
    expect([...binding.inspectNode(branch.id)!.numbers()]).toEqual([
      [70, 7],
      [80, 8],
    ]);
    controller.goTo(branch.id);
    controller.setComment('edited');
    expect([...binding.getState().numbers()]).toEqual([
      [70, 7],
      [80, 8],
    ]);
    controller.undo();
    expect([...binding.getState().numbers()]).toEqual([
      [70, 7],
      [80, 8],
    ]);
    controller.redo();
    expect([...binding.getState().numbers()]).toEqual([
      [70, 7],
      [80, 8],
    ]);
    const other = controller.getState().record.games[1]!.children[0]!.children[0]!;
    controller.goTo(other.id);
    expect([...binding.getState().numbers()]).toEqual([[154, 50]]);
    expect([...frame.numbers()]).toEqual([
      [10, 21],
      [30, 23],
    ]);
  } finally {
    controller.dispose();
  }
});

test('number projection does not traverse other games or unselected branch descendants', () => {
  const controller = new RecordController({ sgf: '(;SZ[9](;B[aa])(;B[bb];W[cc]))(;SZ[13];B[dd])' });
  try {
    const root = controller.getState().record.games[0]!;
    controller.goTo(root.children[0]!.id);
    const state = controller.getState();
    let unselectedReads = 0;
    const observe = (node: typeof state.node) => ({
      ...node,
      get children() {
        unselectedReads++;
        return node.children;
      },
    });
    const projected = {
      ...state,
      record: {
        ...state.record,
        games: [
          { ...root, children: [root.children[0]!, observe(root.children[1]!)] },
          observe(state.record.games[1]!),
        ],
      },
    };
    const binding = recordBoardBinding(
      { getState: () => projected } as unknown as RecordController,
      false,
    );
    expect([...binding.getState().numbers()]).toEqual([[0, 1]]);
    expect(unselectedReads).toBe(0);
  } finally {
    controller.dispose();
  }
});
