import type { Position } from './core.js';

const POSITION_CHECKPOINT_INTERVAL = 256;
const POSITION_CHECKPOINT_LIMIT = 32;

/** Keep sparse ancestors within the intermediate replay budget. */
export class RecordPositionCache {
  #recent = new Map<string, Position>();
  #checkpoints = new Map<string, Position>();

  get(id: string, depth: number): Position | undefined {
    return (depth % POSITION_CHECKPOINT_INTERVAL ? this.#recent : this.#checkpoints).get(id);
  }

  remember(id: string, depth: number, position: Position): void {
    if (depth % POSITION_CHECKPOINT_INTERVAL) this.#recent.set(id, position);
    else {
      this.#checkpoints.set(id, position);
      if (this.#checkpoints.size > POSITION_CHECKPOINT_LIMIT)
        this.#checkpoints.delete(this.#checkpoints.keys().next().value!);
    }
    if (this.#recent.size + this.#checkpoints.size > 120)
      this.#recent.delete(this.#recent.keys().next().value!);
  }

  clear(): void {
    this.#recent.clear();
    this.#checkpoints.clear();
  }
}
