export interface RegistryReadResult {
  status: number | null;
  stdout: string;
}
export type RegistryRead = (
  argv: readonly string[],
  cwd: string,
  signal?: AbortSignal,
) => Promise<RegistryReadResult>;
export type RegistryReadSource = {
  run(argv: readonly string[], cwd: string): RegistryReadResult;
  read?: RegistryRead;
};

/** Prefetch at most two reads, but yield for validation strictly in input order.
 * A rejected validation closes the generator, aborts and drains the current wave.
 * Legacy synchronous adapters remain serial and retain their refusal boundaries.
 */
export async function* registryReadSequence<T>(
  items: readonly T[],
  source: RegistryReadSource,
  argv: (item: T) => readonly string[],
  cwd: string,
) {
  const controller = new AbortController();
  const width = source.read ? 2 : 1;
  let pending: Promise<RegistryReadResult>[] = [];
  try {
    for (let offset = 0; offset < items.length; offset += width) {
      const wave = items.slice(offset, offset + width);
      pending = wave.map(async (item) => {
        try {
          return source.read
            ? await source.read(argv(item), cwd, controller.signal)
            : source.run(argv(item), cwd);
        } catch {
          // Provider details never cross into an operational receipt.
          return { status: null, stdout: '' };
        }
      });
      for (let index = 0; index < wave.length; index++)
        yield { item: wave[index]!, result: await pending[index]! };
      pending = [];
    }
  } finally {
    controller.abort();
    await Promise.allSettled(pending);
  }
}
