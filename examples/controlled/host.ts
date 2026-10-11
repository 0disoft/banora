import { createBoardSnapshot } from '@0disoft/banora/board-state';
import type { BoardIntent } from '@0disoft/banora/board-state';
import type { ControlledBoardOptions, ControlledBoardView } from '@0disoft/banora/controlled-board';

/** A deliberately small host simulator, not a Go rules engine or a transport client. */
export function createHost() {
  let revision = 0;
  const position = () =>
    createBoardSnapshot({
      key: `host:${++revision}`,
      width: 5,
      height: 3,
      stones: ['black', null, null, null, 'white', ...Array<null>(10).fill(null)],
      toPlay: 'black',
      moveNumber: 0,
      overlays: [
        {
          kind: 'badge',
          point: { x: 4, y: 2 },
          color: '#147d66',
          label: 'Host',
          ariaLabel: 'Host annotation',
        },
      ],
    });
  let current = {
    board: position(),
    pending: null as BoardIntent | null,
    message: 'Waiting for a host decision.',
    mounted: true,
    readOnly: false,
    alternate: false,
    callback: '',
    confirm: false,
  };
  let borrowed: ControlledBoardView | null = null;
  const listeners = new Set<() => void>();
  const update = (patch: Partial<typeof current>) => {
    current = { ...current, ...patch };
    for (const listener of listeners) listener();
  };
  const receive = (callback: string) => (intent: BoardIntent) =>
    update({ pending: intent, callback, message: 'Pending host approval.' });
  const receiveA = receive('A'),
    receiveB = receive('B');
  const immediateTouch = Object.freeze({ mode: 'direct' as const });
  const confirmTouch = Object.freeze({ mode: 'confirm' as const });
  const labels = Object.freeze({
    board: 'Host-controlled Go board',
    confirm: 'Send intention',
    cancel: 'Cancel intention',
  });
  return {
    getState: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    options(session = current): ControlledBoardOptions {
      return {
        state: session.board,
        onIntent: session.alternate ? receiveB : receiveA,
        readOnly: session.readOnly,
        contextMenu: true,
        labels,
        touch: session.confirm ? confirmTouch : immediateTouch,
      };
    },
    bindView: (view: ControlledBoardView | null) => {
      borrowed = view;
    },
    getView: () => borrowed,
    reject: () => update({ pending: null, message: 'Host rejected the intention.' }),
    replace: () =>
      update({
        board: position(),
        message: 'Host replaced the position; pending intentions retain their original key.',
      }),
    toggleMount: () => update({ mounted: !current.mounted }),
    toggleReadOnly: () => update({ readOnly: !current.readOnly }),
    toggleCallback: () => update({ alternate: !current.alternate }),
    toggleConfirm: () => update({ confirm: !current.confirm }),
    approve() {
      const intent = current.pending;
      if (!intent) return;
      if (intent.stateKey !== current.board.key) {
        update({ pending: null, message: 'Host rejected a stale state key.' });
        return;
      }
      if (intent.type !== 'point') {
        update({
          pending: null,
          message: `Host received ${intent.type}; this simulator only accepts point intentions.`,
        });
        return;
      }
      const index = intent.point.y * current.board.width + intent.point.x;
      if (current.board.stones[index] !== null) {
        update({ pending: null, message: 'Host rejected an occupied point.' });
        return;
      }
      const stones = [...current.board.stones];
      stones[index] = current.board.toPlay;
      update({
        board: createBoardSnapshot({
          ...current.board,
          key: `host:${++revision}`,
          stones,
          toPlay: current.board.toPlay === 'black' ? 'white' : 'black',
          moveNumber: current.board.moveNumber + 1,
          lastMove: intent.point,
        }),
        pending: null,
        message: 'Host accepted the point and supplied a new snapshot.',
      });
    },
  };
}
export type Host = ReturnType<typeof createHost>;
export type HostSession = ReturnType<Host['getState']>;
