import type { AnalysisCancellation } from './analysis-types.js';
export class AnalysisToken implements AnalysisCancellation {
  #cancelled = false;
  #finished = false;
  #listeners = new Set<() => void>();
  get cancelled(): boolean {
    return this.#cancelled;
  }
  onCancel(listener: () => void): () => void {
    if (this.#cancelled) {
      try {
        listener();
      } catch {
        console.error('Banora analysis cancellation listener failed');
      }
      return () => {};
    }
    if (!this.#finished) this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }
  cancel(): void {
    if (this.#finished) return;
    this.#cancelled = true;
    this.#finished = true;
    const listeners = [...this.#listeners];
    try {
      for (const listener of listeners) {
        if (!this.#listeners.has(listener)) continue;
        try {
          listener();
        } catch {
          console.error('Banora analysis cancellation listener failed');
        }
      }
    } finally {
      this.#listeners.clear();
    }
  }
  finish(): void {
    this.#finished = true;
    this.#listeners.clear();
  }
}
