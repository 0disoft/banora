/** Explicit task ordering without changing global timers or waiting on wall time. */
export class TestScheduler {
  now = 0;
  #tasks = new Set<{ at: number; task: () => void }>();
  get pending(): number {
    return this.#tasks.size;
  }
  after(delayMs: number, task: () => void): () => void {
    const entry = { at: this.now + delayMs, task };
    this.#tasks.add(entry);
    return () => {
      this.#tasks.delete(entry);
    };
  }
  advance(milliseconds: number): void {
    const end = this.now + milliseconds;
    while (true) {
      const next = [...this.#tasks].sort((a, b) => a.at - b.at)[0];
      if (!next || next.at > end) break;
      this.#tasks.delete(next);
      this.now = next.at;
      next.task();
    }
    this.now = end;
  }
}
