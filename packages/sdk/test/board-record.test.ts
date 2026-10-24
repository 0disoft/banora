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

test('adjacent number projections read each node once instead of rereading the prefix', () => {
  const controller = new RecordController({ sgf: '(;SZ[9]' + ';B[aa];W[]'.repeat(100) + ')' });
  try {
    const state = controller.getState();
    const path = [];
    for (let node = state.node; node; node = node.children[0]!) path.push(node);
    let reads = 0;
    const observed = new Map<string, typeof state.node>();
    for (let index = path.length - 1; index >= 0; index--) {
      const node = path[index]!;
      observed.set(node.id, {
        ...node,
        get properties() {
          reads++;
          return node.properties;
        },
        children: index + 1 < path.length ? [observed.get(path[index + 1]!.id)!] : [],
      });
    }
    const record = { games: [observed.get(state.node.id)!] };
    let current = { ...state, record, node: observed.get(state.node.id)! };
    const binding = recordBoardBinding(
      { getState: () => current } as unknown as RecordController,
      false,
    );
    let totalReads = 0;
    do {
      const snapshot = controller.getState();
      current = { ...snapshot, record, node: observed.get(snapshot.node.id)! };
      const frame = binding.getState();
      reads = 0;
      const numbers = [...frame.numbers()];
      totalReads += reads;
      const move = snapshot.position.moveNumber;
      expect(numbers).toEqual(move ? [[0, move % 2 ? move : move - 1]] : []);
    } while (controller.next().ok);
    expect(totalReads).toBeLessThanOrEqual(path.length * 10);
  } finally {
    controller.dispose();
  }
});

test('incremental numbers preserve path fallback, old frames and private checkpoint isolation', () => {
  const controller = new RecordController({
    sgf: '(;SZ[9];B[aa]MN[10];C[note];W[];AE[aa]MN[0](;B[bb];W[tt])(;B[cc]MN[30];W[dd]))(;SZ[52];B[tt];W[])',
  });
  const binding = recordBoardBinding(controller, false);
  const oracle = () => [...recordBoardBinding(controller, false).getState().numbers()];
  const check = () => expect([...binding.getState().numbers()]).toEqual(oracle());
  try {
    check();
    const root = controller.getState().node;
    const delayed = binding.inspectNode(root.children[0]!.children[0]!.id)!;
    while (controller.next().ok) check();
    expect([...delayed.numbers()]).toEqual([[0, 10]]);
    check();
    controller.previous();
    check();
    controller.previous();
    check();
    controller.next(1);
    check();
    const old = binding.getState();
    (old.numbers() as Map<number, number>).set(80, 999);
    controller.next();
    check();
    expect([...binding.getState().numbers()].some(([point]) => point === 80)).toBe(false);
    controller.setComment('edit');
    check();
    controller.undo();
    check();
    controller.redo();
    check();
    controller.goTo(controller.getState().record.games[1]!.id);
    check();
    controller.next();
    check();
    expect([...binding.getState().numbers()]).toEqual([[1007, 1]]);
    controller.next();
    check();
    expect(controller.loadSgf('(;SZ[13];B[ll]MN[42];W[])', { discardChanges: true }).ok).toBe(true);
    check();
    controller.next();
    check();
    controller.next();
    check();
    expect([...binding.getState().numbers()]).toEqual([[154, 42]]);
  } finally {
    controller.dispose();
  }
});
