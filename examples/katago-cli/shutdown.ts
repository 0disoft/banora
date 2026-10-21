interface EngineProcess {
  stdin: { end(): unknown; destroy(): unknown };
  stdout: { destroy(): unknown };
  stderr: { destroy(): unknown };
  kill(signal: 'SIGKILL'): boolean;
  unref(): void;
}

/** Graceful EOF, then an unignorable stop and a bounded close confirmation. */
export async function stopEngineProcess(
  child: EngineProcess,
  exited: Promise<unknown>,
  flushed: Promise<void>,
  closing: () => void,
  graceMs = 5_000,
  confirmationMs = 1_000,
): Promise<void> {
  let confirmation: ReturnType<typeof setTimeout> | undefined;
  let grace: ReturnType<typeof setTimeout> | undefined;
  let acceptingFlush = true;
  const deadline = new Promise<never>((_resolve, reject) => {
    const failed = () => {
      child.unref();
      reject(new Error('Engine exit could not be confirmed after forced termination'));
    };
    grace = setTimeout(() => {
      acceptingFlush = false;
      closing();
      child.stdin.destroy();
      try {
        child.kill('SIGKILL');
        confirmation = setTimeout(failed, confirmationMs);
      } catch {
        failed();
      } finally {
        // Inherited pipes must not keep close confirmation or the host alive.
        child.stdout.destroy();
        child.stderr.destroy();
      }
    }, graceMs);
  });
  void flushed
    .then(() => {
      if (!acceptingFlush) return;
      acceptingFlush = false;
      closing();
      child.stdin.end();
    })
    .catch(() => {
      /* The force deadline still covers failed/blocked writes. */
    });
  try {
    await Promise.race([exited, deadline]);
  } finally {
    clearTimeout(grace);
    clearTimeout(confirmation);
    acceptingFlush = false;
  }
}
