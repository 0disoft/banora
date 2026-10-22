export const ENGINE_WRITE_LIMITS = Object.freeze({ entries: 64, bytes: 8 * 1024 * 1024 });

interface WriteEntry {
  readonly id: string;
  readonly line: string;
  readonly bytes: number;
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
}

/** Host-owned bounded FIFO, including its one in-flight write. */
export class EngineWriter {
  #queue: WriteEntry[] = [];
  #active: WriteEntry | undefined;
  #bytes = 0;
  #closed = false;
  #waiters: (() => void)[] = [];
  constructor(
    private readonly write: (line: string) => Promise<void>,
    private readonly failed: () => void,
  ) {}

  sendLine(line: string): Promise<void> {
    if (this.#closed) return Promise.reject(new Error('Engine writer is closed'));
    const value = JSON.parse(line) as { id: string; action?: string; terminateId?: string };
    if (value.action === 'terminate') {
      const index = this.#queue.findIndex((entry) => entry.id === value.terminateId);
      if (index >= 0) {
        const [cancelled] = this.#queue.splice(index, 1);
        this.#bytes -= cancelled!.bytes;
        cancelled!.resolve();
        this.#settleIdle();
        return Promise.resolve(); // Neither the unsent query nor its termination needs writing.
      }
    }
    const bytes = Buffer.byteLength(line, 'utf8') + 1;
    if (
      this.#queue.length + Number(!!this.#active) >= ENGINE_WRITE_LIMITS.entries ||
      this.#bytes + bytes > ENGINE_WRITE_LIMITS.bytes
    ) {
      // An unsendable termination cannot leave real engine work running indefinitely.
      if (value.action === 'terminate') this.#fail();
      return Promise.reject(new Error('Engine write queue capacity reached'));
    }
    return new Promise<void>((resolve, reject) => {
      this.#queue.push({ id: value.id, line, bytes, resolve, reject });
      this.#bytes += bytes;
      this.#pump();
    });
  }

  idle(): Promise<void> {
    if (!this.#active && !this.#queue.length) return Promise.resolve();
    return new Promise((resolve) => this.#waiters.push(resolve));
  }

  close(): void {
    this.#closed = true;
    const error = new Error('Engine writer is closed');
    this.#active?.reject(error);
    this.#active = undefined;
    for (const entry of this.#queue) entry.reject(error);
    this.#queue = [];
    this.#bytes = 0;
    this.#settleIdle();
  }

  #settleIdle(): void {
    if (this.#active || this.#queue.length) return;
    for (const resolve of this.#waiters.splice(0)) resolve();
  }

  #pump(): void {
    if (this.#active || this.#closed) return;
    const entry = this.#queue.shift();
    if (!entry) {
      this.#settleIdle();
      return;
    }
    this.#active = entry;
    let written: Promise<void>;
    try {
      written = this.write(entry.line);
    } catch {
      this.#fail();
      return;
    }
    Promise.resolve(written).then(
      () => {
        if (this.#active !== entry) return;
        this.#active = undefined;
        this.#bytes -= entry.bytes;
        entry.resolve();
        this.#pump();
      },
      () => {
        if (this.#active === entry) this.#fail();
      },
    );
  }

  #fail(): void {
    this.close();
    this.failed();
  }
}
