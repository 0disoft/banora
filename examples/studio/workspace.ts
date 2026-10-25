import { RecordController } from '@0disoft/banora';
import type { ControllerState } from '@0disoft/banora';

export interface StudioBoard {
  readonly id: number;
  readonly controller: RecordController;
  filename: string;
  draftOwner: object;
}

/** Notify independent observers without allowing one failure to suppress saving. */
function notify<Args extends unknown[]>(
  listeners: ReadonlySet<(...args: Args) => void>,
  kind: 'change' | 'state',
  ...args: Args
): void {
  for (const listener of [...listeners]) {
    if (!listeners.has(listener)) continue;
    try {
      listener(...args);
    } catch {
      console.error(`Banora workspace ${kind} listener failed`);
    }
  }
}

/** Consumer-owned sessions; SDK controllers and their complete edit histories stay intact. */
export class StudioWorkspace {
  readonly controller: RecordController;
  #boards: StudioBoard[] = [];
  #active: StudioBoard;
  #sequence = 0;
  #generation = 0;
  #nativeGeneration = 0;
  #snapshot: ControllerState | undefined;
  #raw: ControllerState | undefined;
  #listeners = new Set<(state: ControllerState) => void>();
  #changes = new Set<() => void>();
  #before = new Set<() => void>();
  #unsubscribe: () => void;
  #disposed = false;

  constructor() {
    this.#active = this.#create(19);
    // Existing consumer widgets keep one subscription boundary. Calls always use
    // the currently selected real SDK controller, including its private fields.
    // A real tab as target would keep its record/history alive after close.
    // Retain the SDK prototype for instanceof dispatch, without owning tab state.
    this.controller = new Proxy(Object.create(RecordController.prototype) as RecordController, {
      get: (_target, key) => {
        if (key === 'getState') return () => this.getState();
        if (key === 'subscribe')
          return (listener: (state: ControllerState) => void) => {
            this.#assertLive();
            this.#listeners.add(listener);
            try {
              listener(this.getState());
            } catch (error) {
              this.#listeners.delete(listener);
              throw error;
            }
            return () => this.#listeners.delete(listener);
          };
        if (key === 'dispose') return () => this.dispose();
        if (key === 'inspectNode')
          return (id: string) => {
            const state = this.active.controller.inspectNode(id);
            return state ? { ...state, recordGeneration: this.#generation } : null;
          };
        const member: unknown = Reflect.get(this.active.controller, key);
        return typeof member === 'function'
          ? (...args: unknown[]) =>
              Reflect.apply(Reflect.get(this.active.controller, key), this.active.controller, args)
          : member;
      },
    });
    this.#unsubscribe = this.#attach();
  }
  #assertLive() {
    if (this.#disposed) throw Error('Studio workspace is disposed');
  }
  get active(): StudioBoard {
    this.#assertLive();
    return this.#active;
  }
  get boards(): readonly StudioBoard[] {
    this.#assertLive();
    return [...this.#boards];
  }
  get dirty(): boolean {
    return this.boards.some((board) => board.controller.getState().dirty);
  }
  #create(size: number): StudioBoard {
    if (![9, 13, 19].includes(size)) throw RangeError('Board size must be 9, 13 or 19');
    if (this.#boards.length >= 20) throw RangeError('Close a board before opening another.');
    const id = ++this.#sequence;
    const board = {
      id,
      controller: new RecordController({ size }),
      filename: `board-${id}.sgf`,
      draftOwner: {},
    };
    this.#boards.push(board);
    return board;
  }
  #attach(): () => void {
    this.#nativeGeneration = this.#active.controller.getState().recordGeneration;
    return this.#active.controller.subscribe((state) => {
      if (state.recordGeneration !== this.#nativeGeneration) {
        this.#nativeGeneration = state.recordGeneration;
        this.#generation++;
        this.#active.draftOwner = {};
      }
      this.#raw = state;
      this.#snapshot = undefined;
      this.#publish();
    });
  }
  getState(): ControllerState {
    this.#assertLive();
    const raw = this.#active.controller.getState();
    if (!this.#snapshot || this.#raw !== raw) {
      this.#raw = raw;
      this.#snapshot = Object.freeze({ ...raw, recordGeneration: this.#generation });
    }
    return this.#snapshot;
  }
  #publish() {
    notify(this.#changes, 'change');
    if (this.#disposed) return;
    const state = this.getState();
    notify(this.#listeners, 'state', state);
  }
  subscribe(listener: () => void): () => void {
    this.#assertLive();
    this.#changes.add(listener);
    try {
      listener();
    } catch (error) {
      this.#changes.delete(listener);
      throw error;
    }
    return () => this.#changes.delete(listener);
  }
  beforeSwitch(listener: () => void): () => void {
    this.#assertLive();
    this.#before.add(listener);
    return () => this.#before.delete(listener);
  }
  select(id: number): void {
    this.#assertLive();
    const next = this.#boards.find((board) => board.id === id);
    if (!next) throw Error('Board not found');
    if (next === this.#active) return;
    for (const listener of [...this.#before]) listener();
    this.#active.controller.endEditGroup();
    this.#unsubscribe();
    this.#active = next;
    this.#generation++;
    this.#raw = undefined;
    this.#snapshot = undefined;
    this.#unsubscribe = this.#attach();
  }
  add(size = 19): StudioBoard {
    this.#assertLive();
    const board = this.#create(size);
    this.select(board.id);
    return board;
  }
  rename(filename: string): void {
    this.active.filename = filename;
    notify(this.#changes, 'change');
  }
  /** A dirty board requires an explicit owner-approved discard or successful export. */
  close(id: number, discard = false): boolean {
    const index = this.boards.findIndex((board) => board.id === id);
    if (index < 0) return false;
    const board = this.#boards[index]!;
    if (board.controller.getState().dirty && !discard) return false;
    if (board === this.#active) {
      if (this.#boards.length === 1) this.#create(19);
      this.select(this.#boards[index + 1]?.id ?? this.#boards[index - 1]!.id);
    }
    this.#boards.splice(index, 1);
    board.controller.dispose();
    notify(this.#changes, 'change');
    return true;
  }
  dispose(): void {
    if (this.#disposed) return;
    this.#unsubscribe();
    for (const board of this.#boards) board.controller.dispose();
    this.#listeners.clear();
    this.#changes.clear();
    this.#before.clear();
    this.#disposed = true;
  }
}
