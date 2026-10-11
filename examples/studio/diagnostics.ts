import { DiagnosticJournal } from '@banora/sdk/diagnostics';
import type {
  DiagnosticInput,
  DiagnosticOperation,
  DiagnosticReport,
  DiagnosticFailure,
} from '@banora/sdk/diagnostics';

type Completion =
  | { readonly status: 'success' | 'cancelled' }
  | { readonly status: 'failure'; readonly failure: DiagnosticFailure };
/** Session-only consent and freshness boundary for explicitly instrumented Studio operations. */
export class StudioDiagnostics {
  #journal = new DiagnosticJournal();
  #enabled = false;
  #generation = 0;
  #disposed = false;
  #listeners = new Set<() => void>();
  constructor(private readonly clock: () => number = () => performance.now()) {}
  get enabled(): boolean {
    return this.#enabled;
  }
  setEnabled(enabled: boolean): void {
    if (this.#disposed || enabled === this.#enabled) return;
    this.#generation++;
    this.#enabled = enabled;
    this.#journal.clear();
    this.#notify();
  }
  clear(): void {
    this.#generation++;
    this.#journal.clear();
    this.#notify();
  }
  record(input: DiagnosticInput): string | undefined {
    if (!this.#enabled || this.#disposed) return;
    try {
      const event = this.#journal.record(input);
      this.#notify();
      return event.id;
    } catch {
      // Diagnostic failure must not change the outcome of an authored-data operation.
      return undefined;
    }
  }
  begin(operation: DiagnosticOperation): (result: Completion) => string | undefined {
    const generation = this.#generation;
    const active = this.#enabled && !this.#disposed;
    let start: number | undefined;
    if (active) {
      try {
        start = this.clock();
      } catch {
        /* Timing is optional. */
      }
    }
    let completed = false;
    return (result) => {
      if (completed || !active || generation !== this.#generation) return;
      completed = true;
      let durationMs: number | undefined;
      try {
        const elapsed = start === undefined ? NaN : this.clock() - start;
        if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 86_400_000) durationMs = elapsed;
      } catch {
        /* Timing is optional. */
      }
      return this.record({
        ...result,
        operation,
        ...(durationMs === undefined ? {} : { durationMs }),
      } as DiagnosticInput);
    };
  }
  createReport(locale: 'en' | 'ko' | 'zh' | 'ja'): DiagnosticReport {
    return this.#journal.createReport({ runtime: 'browser', locale });
  }
  subscribe(listener: () => void): () => void {
    if (!this.#disposed) this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }
  #notify(): void {
    for (const listener of [...this.#listeners]) {
      try {
        listener();
      } catch {
        /* Isolate inspection UI. */
      }
    }
  }
  dispose(): void {
    this.#enabled = false;
    this.#disposed = true;
    this.clear();
    this.#listeners.clear();
  }
}
