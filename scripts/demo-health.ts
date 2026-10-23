import { createHash } from 'node:crypto';
import { appendFile, open } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  demoArchiveLimit,
  demoPath,
  readDemoInventory,
  regularDemoDirectory,
  type DemoInventory,
  type DemoFile,
} from './demo-archive.js';
import { recoveryWorkflowContext, verifyDemoArchive } from './demo-recovery.js';

type Code =
  | 'usage'
  | 'archive'
  | 'http'
  | 'transport'
  | 'content'
  | 'bound'
  | 'deadline'
  | 'receipt';
export class DemoHealthError extends Error {
  constructor(
    readonly code: Code,
    public checkedFiles = 0,
    public attempts = 0,
  ) {
    super(code);
  }
}
interface HealthIO {
  fetch(url: string, init: RequestInit): Promise<Response>;
  wait(milliseconds: number): Promise<void>;
  now(): number;
}
const defaultIO: HealthIO = {
  fetch,
  wait: (milliseconds) => new Promise((done) => setTimeout(done, milliseconds)),
  now: () => performance.now(),
};
const digest = (value: string) => /^[a-f0-9]{64}$/.test(value);

export function demoHealthRequest(args: readonly string[]) {
  const [action, ...options] = args;
  const keys =
    action === 'fingerprint'
      ? ['--archive']
      : action === 'check'
        ? ['--directory', '--sha256', '--receipt']
        : [];
  const values = new Map<string, string>();
  if (!keys.length || options.length % 2) throw new DemoHealthError('usage');
  for (let i = 0; i < options.length; i += 2) {
    const key = options[i]!,
      value = options[i + 1]!;
    if (
      !keys.includes(key) ||
      values.has(key) ||
      !value ||
      value.startsWith('--') ||
      value.includes('\0')
    )
      throw new DemoHealthError('usage');
    values.set(key, value);
  }
  if (action === 'fingerprint' && values.size === 1)
    return { action, archive: values.get('--archive')! } as const;
  const directory = values.get('--directory'),
    sha256 = values.get('--sha256'),
    receipt = values.get('--receipt');
  if (
    action !== 'check' ||
    !directory ||
    !sha256 ||
    !digest(sha256) ||
    (receipt !== undefined &&
      !/^\.artifacts\/[A-Za-z0-9_-][A-Za-z0-9_.-]{0,100}\.json$/.test(receipt))
  )
    throw new DemoHealthError('usage');
  return { action, directory, sha256, receipt } as const;
}

async function readLive(
  file: DemoFile,
  tarSha256: string,
  deadline: number,
  io: HealthIO,
  absent = false,
) {
  const budget = Math.min(10000, Math.ceil(deadline - io.now()));
  if (budget <= 0) throw new DemoHealthError('deadline');
  const url = new URL(file.name, 'https://0disoft.github.io/banora/');
  url.searchParams.set('banora-health', tarSha256.slice(0, 16));
  const controller = new AbortController();
  let finished = false;
  let body: Response['body'] | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cleanupBody = () => {
    const ownedReader = reader,
      ownedBody = body;
    reader = undefined;
    body = undefined;
    if (ownedReader) {
      void ownedReader.cancel().catch(() => {});
      ownedReader.releaseLock();
    } else if (ownedBody) void ownedBody.cancel().catch(() => {});
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new DemoHealthError('transport'));
    }, budget);
  });
  try {
    await Promise.race([
      (async () => {
        let response: Response;
        try {
          response = await io.fetch(url.href, {
            redirect: 'error',
            credentials: 'omit',
            cache: 'no-store',
            signal: controller.signal,
          });
        } catch {
          throw new DemoHealthError('transport');
        }
        body = response.body;
        // A timed-out attempt can receive a response after its outer finally ran.
        if (finished || controller.signal.aborted) {
          cleanupBody();
          throw new DemoHealthError('transport');
        }
        if (response.redirected || (response.url && response.url !== url.href))
          throw new DemoHealthError('bound');
        if (absent) {
          if (response.status === 404) return;
          throw new DemoHealthError(response.status === 200 ? 'content' : 'http');
        }
        if (response.status !== 200) {
          const error = new DemoHealthError(
            [404, 502, 503, 504].includes(response.status) ? 'content' : 'http',
          );
          throw error;
        }
        const length = response.headers.get('content-length');
        if (length !== null && (!/^\d+$/.test(length) || Number(length) > demoArchiveLimit))
          throw new DemoHealthError('bound');
        const hash = createHash('sha256');
        let bytes = 0;
        const activeReader = body?.getReader();
        reader = activeReader;
        if (activeReader)
          while (true) {
            const chunk = await activeReader.read();
            if (finished || controller.signal.aborted) throw new DemoHealthError('transport');
            if (chunk.done) break;
            bytes += chunk.value.byteLength;
            if (bytes > file.bytes) throw new DemoHealthError('bound');
            hash.update(chunk.value);
          }
        if (bytes !== file.bytes || hash.digest('hex') !== file.sha256)
          throw new DemoHealthError('content');
      })(),
      expired,
    ]);
  } finally {
    finished = true;
    if (timer) clearTimeout(timer);
    controller.abort();
    cleanupBody();
  }
}

export async function checkDemoFiles(inventory: DemoInventory, io: HealthIO = defaultIO) {
  if (
    !digest(inventory.tarSha256) ||
    inventory.tarBytes < 1024 ||
    inventory.tarBytes > demoArchiveLimit ||
    !inventory.files.length ||
    inventory.files.length > 512 ||
    new Set(inventory.files.map((file) => file.name)).size !== inventory.files.length ||
    inventory.files.some(
      (file) =>
        !demoPath(file.name) ||
        !digest(file.sha256) ||
        !Number.isSafeInteger(file.bytes) ||
        file.bytes < 0 ||
        file.bytes > demoArchiveLimit,
    )
  )
    throw new DemoHealthError('archive');
  const deadline = io.now() + 120000;
  let checkedFiles = 0,
    attempts = 0;
  const check = async (file: DemoFile, absent = false) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (io.now() >= deadline) throw new DemoHealthError('deadline');
      attempts++;
      try {
        await readLive(file, inventory.tarSha256, deadline, io, absent);
        if (!absent) checkedFiles++;
        return;
      } catch (error) {
        if (
          !(error instanceof DemoHealthError) ||
          !['content', 'transport'].includes(error.code) ||
          attempt === 2
        )
          throw error;
        if (io.now() + 2000 >= deadline) throw new DemoHealthError('deadline');
        await io.wait(2000);
      }
    }
  };
  for (let offset = 0; offset < inventory.files.length; offset += 4) {
    const results = await Promise.allSettled(
      inventory.files.slice(offset, offset + 4).map((file) => check(file)),
    );
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected')
      throw new DemoHealthError(
        failed.reason instanceof DemoHealthError ? failed.reason.code : 'transport',
        checkedFiles,
        attempts,
      );
  }
  const buildIdentityAbsent = !inventory.files.some((file) => file.name === 'banora-build.json');
  if (buildIdentityAbsent) {
    try {
      await check({ name: 'banora-build.json', bytes: 0, sha256: '' }, true);
    } catch (error) {
      throw new DemoHealthError(
        error instanceof DemoHealthError ? error.code : 'transport',
        checkedFiles,
        attempts,
      );
    }
  }
  return {
    tarSha256: inventory.tarSha256,
    checkedFiles,
    htmlFiles: inventory.files.filter((file) => file.name.endsWith('.html')).length,
    attempts,
    buildIdentityAbsent,
  };
}

export async function reserveDemoReceipt(path: string) {
  if (!/^\.artifacts\/[A-Za-z0-9_-][A-Za-z0-9_.-]{0,100}\.json$/.test(path))
    throw new DemoHealthError('receipt');
  await regularDemoDirectory(resolve('.artifacts'));
  return open(resolve(path), 'wx');
}

if (import.meta.main) {
  let receipt: Awaited<ReturnType<typeof reserveDemoReceipt>> | undefined;
  let phase: Code = 'usage';
  let output: Record<string, unknown>;
  try {
    const request = demoHealthRequest(process.argv.slice(2));
    if (request.action === 'check' && request.receipt) {
      phase = 'receipt';
      receipt = await reserveDemoReceipt(request.receipt);
    }
    phase = 'archive';
    let inventory: DemoInventory;
    if (request.action === 'fingerprint') {
      inventory = await readDemoInventory(request.archive);
      if (process.env.GITHUB_OUTPUT) {
        recoveryWorkflowContext(process.env);
        await appendFile(process.env.GITHUB_OUTPUT, `tar_sha256=${inventory.tarSha256}\n`);
      }
    } else {
      await verifyDemoArchive(request.directory, request.sha256);
      inventory = await readDemoInventory(resolve(request.directory, 'artifact.tar'));
      if (inventory.tarSha256 !== request.sha256) throw new DemoHealthError('archive');
    }
    const result =
      request.action === 'check'
        ? await checkDemoFiles(inventory)
        : {
            tarSha256: inventory.tarSha256,
            totalFiles: inventory.files.length,
            htmlFiles: inventory.files.filter((file) => file.name.endsWith('.html')).length,
          };
    if (request.action === 'check') await verifyDemoArchive(request.directory, request.sha256);
    output = {
      schemaVersion: 'banora.demo-health/v1',
      ok: true,
      operation: request.action,
      ...result,
    };
  } catch (error) {
    output = {
      schemaVersion: 'banora.demo-health/v1',
      ok: false,
      code: error instanceof DemoHealthError ? error.code : phase,
      checkedFiles: error instanceof DemoHealthError ? error.checkedFiles : 0,
      attempts: error instanceof DemoHealthError ? error.attempts : 0,
    };
  }
  if (receipt) {
    try {
      await receipt.writeFile(JSON.stringify(output) + '\n');
    } catch {
      output = { ...output, ok: false, code: 'receipt' };
    }
    try {
      await receipt.close();
    } catch {
      output = { ...output, ok: false, code: 'receipt' };
    }
  }
  console.log(JSON.stringify(output));
  if (!output.ok) process.exitCode = 1;
}
