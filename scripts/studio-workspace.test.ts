import { describe, expect, spyOn, test } from 'bun:test';
import { RecordController } from '@0disoft/banora';
import { StudioWorkspace } from '../examples/studio/workspace.js';

test('a nested tab switch cannot deliver the previous board after the selected board', () => {
  const workspace = new StudioWorkspace();
  const first = workspace.active;
  const second = workspace.add(9);
  workspace.select(first.id);
  let armed = false;
  workspace.controller.subscribe(() => {
    if (!armed) return;
    armed = false;
    workspace.select(second.id);
  });
  const widths: number[] = [];
  workspace.controller.subscribe((state) => widths.push(state.position.width));
  try {
    armed = true;
    expect(workspace.controller.setComment('outgoing edit').ok).toBe(true);
    expect(workspace.active.id).toBe(second.id);
    expect(widths).toEqual([19, 9]);
    expect(widths.at(-1)).toBe(workspace.controller.getState().position.width);
  } finally {
    workspace.dispose();
  }
});

test('a switch during immediate attachment cannot retain the wrong board subscription', () => {
  const workspace = new StudioWorkspace();
  const first = workspace.active;
  const second = workspace.add(9);
  const third = workspace.add(13);
  workspace.select(first.id);
  let armed = false;
  workspace.controller.subscribe((state) => {
    if (!armed || state.position.width !== 9) return;
    armed = false;
    workspace.select(third.id);
  });
  const widths: number[] = [];
  workspace.controller.subscribe((state) => widths.push(state.position.width));
  try {
    armed = true;
    workspace.select(second.id);
    expect(workspace.active.id).toBe(third.id);
    const switchedWidths = [...widths];
    workspace.select(first.id);
    const count = widths.length;
    expect(third.controller.setComment('inactive edit').ok).toBe(true);
    const owner = first.draftOwner;
    const generation = workspace.controller.getState().recordGeneration;
    expect(third.controller.loadSgf('(;SZ[13];B[aa])', { discardChanges: true }).ok).toBe(true);
    expect(first.draftOwner).toBe(owner);
    expect(workspace.controller.getState().recordGeneration).toBe(generation);
    expect(widths).toHaveLength(count);
    expect(switchedWidths).toEqual([19, 13]);
    expect(workspace.controller.setComment('active edit').ok).toBe(true);
    expect(widths).toHaveLength(count + 1);
    expect(workspace.controller.getState().position.width).toBe(19);
  } finally {
    workspace.dispose();
  }
});

for (const channel of ['workspace', 'controller'] as const)
  test(`${channel} nested switches drain synchronously without recursive observer calls`, () => {
    const workspace = new StudioWorkspace();
    const first = workspace.active;
    for (let index = 1; index < 20; index++) workspace.add(index % 2 ? 9 : 13);
    const boards = workspace.boards;
    workspace.select(first.id);
    let armed = false;
    let depth = 0;
    let maximum = 0;
    const switchNext = () => {
      if (!armed) return;
      const next = boards.findIndex((board) => board.id === workspace.active.id) + 1;
      if (next >= boards.length) return;
      depth++;
      maximum = Math.max(maximum, depth);
      try {
        workspace.select(boards[next]!.id);
      } finally {
        depth--;
      }
    };
    if (channel === 'workspace') workspace.subscribe(switchNext);
    else workspace.controller.subscribe(switchNext);
    const observed: number[] = [];
    workspace.controller.subscribe((state) => observed.push(state.position.width));
    try {
      armed = true;
      expect(workspace.controller.setComment('start').ok).toBe(true);
      expect(workspace.active.id).toBe(boards.at(-1)!.id);
      expect(maximum).toBe(1);
      expect(observed).toEqual([19, 9]);
    } finally {
      workspace.dispose();
    }
  });

for (const channel of ['workspace', 'controller'] as const) {
  test(`${channel} initial failure removes the registration and preserves the thrown value`, () => {
    const workspace = new StudioWorkspace();
    const subscribe =
      channel === 'workspace'
        ? workspace.subscribe.bind(workspace)
        : workspace.controller.subscribe.bind(workspace.controller);
    const failure = { private: 'Never inspect or log this thrown value' };
    let calls = 0;
    try {
      let caught: unknown;
      try {
        subscribe(() => {
          calls++;
          throw failure;
        });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBe(failure);
      expect(workspace.controller.setComment('edit').ok).toBe(true);
      expect(() => workspace.rename('renamed.sgf')).not.toThrow();
      expect(calls).toBe(1);
    } finally {
      workspace.dispose();
    }
  });

  test(`${channel} notification skips observers removed during delivery`, () => {
    const workspace = new StudioWorkspace();
    const subscribe =
      channel === 'workspace'
        ? workspace.subscribe.bind(workspace)
        : workspace.controller.subscribe.bind(workspace.controller);
    let armed = false;
    let stop = () => {};
    let calls = 0;
    subscribe(() => {
      if (armed) stop();
    });
    stop = subscribe(() => calls++);
    try {
      armed = true;
      expect(workspace.controller.setComment('edit').ok).toBe(true);
      expect(calls).toBe(1);
    } finally {
      workspace.dispose();
    }
  });
}

test('workspace change failures cannot interrupt rename, switching, close or later state observers', () => {
  const workspace = new StudioWorkspace();
  const log = spyOn(console, 'error').mockImplementation(() => {});
  const first = workspace.active;
  let armed = false;
  let changes = 0;
  const widths: number[] = [];
  workspace.subscribe(() => {
    if (armed) throw { secret: 'Private callback data' };
  });
  workspace.subscribe(() => changes++);
  workspace.controller.subscribe((state) => widths.push(state.position.width));
  try {
    armed = true;
    expect(() => workspace.rename('renamed.sgf')).not.toThrow();
    expect(first.filename).toBe('renamed.sgf');
    const second = workspace.add(9);
    expect(workspace.active.id).toBe(second.id);
    expect(workspace.close(first.id)).toBe(true);
    expect(workspace.boards).toHaveLength(1);
    expect(() => first.controller.getState()).toThrow('disposed');
    expect(changes).toBe(4);
    expect(widths).toEqual([19, 9]);
    expect(log.mock.calls).toEqual(
      Array.from({ length: 3 }, () => ['Banora workspace change listener failed']),
    );
  } finally {
    workspace.dispose();
    log.mockRestore();
  }
});

test('disposal during a change notification stops remaining delivery without reading disposed state', () => {
  const workspace = new StudioWorkspace();
  const log = spyOn(console, 'error').mockImplementation(() => {});
  let armed = false;
  let calls = 0;
  workspace.subscribe(() => {
    if (armed) workspace.dispose();
  });
  workspace.controller.subscribe(() => calls++);
  try {
    armed = true;
    expect(workspace.controller.setComment('edit').ok).toBe(true);
    expect(calls).toBe(1);
    expect(log.mock.calls).toEqual([]);
  } finally {
    workspace.dispose();
    log.mockRestore();
  }
});

describe('Studio multi-board sessions', () => {
  test('closing the initial and later tabs preserves the facade and detached snapshots', () => {
    const workspace = new StudioWorkspace();
    const controller = workspace.controller;
    const play = controller.play;
    expect(controller).toBeInstanceOf(RecordController);
    play({ x: 3, y: 3 });
    const snapshot = controller.getState();
    const first = workspace.active.id;
    const second = workspace.add(9);
    expect(workspace.close(first, true)).toBe(true);
    play({ x: 1, y: 1 });
    expect(controller.getState().position.width).toBe(9);
    expect(controller.getState().position.moveNumber).toBe(1);
    controller.undo();
    expect(controller.getState().position.moveNumber).toBe(0);
    const generation = controller.getState().recordGeneration;
    expect(workspace.close(second.id, true)).toBe(true);
    expect(controller.getState().recordGeneration).toBeGreaterThan(generation);
    expect(controller).toBeInstanceOf(RecordController);
    play({ x: 2, y: 2 });
    expect(controller.getState().position.width).toBe(19);
    expect(controller.getState().position.moveNumber).toBe(1);
    expect(snapshot.position.moveNumber).toBe(1);
    expect(snapshot.node.properties.B).toEqual(['dd']);
    workspace.dispose();
  });
  test('starts at 19 and retains independent position, comments, undo and export baselines', () => {
    const workspace = new StudioWorkspace();
    const controller = workspace.controller;
    const first = workspace.active.id;
    expect(controller.getState().position.width).toBe(19);
    controller.play({ x: 3, y: 3 });
    controller.setComment('first board');
    const second = workspace.add(13);
    expect(controller.getState().position.width).toBe(13);
    expect(controller.getState().dirty).toBe(false);
    controller.play({ x: 2, y: 2 });
    controller.setComment('second board');
    const ticket = controller.prepareExport();
    controller.acknowledgeExport(ticket.id);
    workspace.select(first);
    expect(controller.getState().position.moveNumber).toBe(1);
    expect(controller.getState().node.properties.C).toEqual(['first board']);
    expect(controller.getState().dirty).toBe(true);
    controller.undo();
    expect(controller.getState().node.properties.C).toBeUndefined();
    workspace.select(second.id);
    expect(controller.getState().node.properties.C).toEqual(['second board']);
    expect(controller.getState().dirty).toBe(false);
    controller.undo();
    expect(controller.getState().dirty).toBe(true);
    workspace.dispose();
  });
  test('stable subscribers and captured methods follow selection with increasing generations', () => {
    const workspace = new StudioWorkspace();
    const controller = workspace.controller;
    const play = controller.play;
    const generations: number[] = [];
    const dispose = controller.subscribe((state) => generations.push(state.recordGeneration));
    const first = workspace.active;
    workspace.add(9);
    play({ x: 0, y: 0 });
    expect(first.controller.getState().position.moveNumber).toBe(0);
    expect(controller.getState().position.moveNumber).toBe(1);
    workspace.select(first.id);
    expect(generations.at(-1)).toBeGreaterThan(generations[0]!);
    expect(controller.getState()).toBe(controller.getState());
    dispose();
    workspace.dispose();
  });
  test('flush hooks observe the outgoing session and draft identities survive switches', () => {
    const workspace = new StudioWorkspace();
    const first = workspace.active;
    const owner = first.draftOwner;
    const outgoing: number[] = [];
    workspace.beforeSwitch(() => outgoing.push(workspace.active.id));
    const second = workspace.add();
    workspace.select(first.id);
    expect(outgoing).toEqual([first.id, second.id]);
    expect(workspace.active.draftOwner).toBe(owner);
    workspace.controller.loadSgf('(;SZ[9])');
    expect(workspace.active.draftOwner).not.toBe(owner);
    workspace.dispose();
  });
  test('rejects invalid sizes and dirty closes, resets the last tab without silently evicting work', () => {
    const workspace = new StudioWorkspace();
    expect(() => workspace.add(12)).toThrow();
    workspace.controller.setComment('keep');
    expect(workspace.close(workspace.active.id)).toBe(false);
    expect(workspace.close(workspace.active.id, true)).toBe(true);
    expect(workspace.boards).toHaveLength(1);
    expect(workspace.controller.getState().position.width).toBe(19);
    for (let index = 1; index < 20; index++) workspace.add();
    expect(() => workspace.add()).toThrow('Close a board');
    expect(workspace.boards).toHaveLength(20);
    workspace.dispose();
  });
});
