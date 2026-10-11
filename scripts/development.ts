import { spawnSync } from 'node:child_process';
import { lstat, readFile, realpath, rm } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

export const CLEAN_TARGETS = [
  'dist',
  '.tmp',
  '.cache',
  ...['sdk', 'cli', 'react', 'vue', 'svelte'].map((name) => `packages/${name}/dist`),
  'packages/svelte/.svelte-kit',
] as const;
export function supportedVersion(version: string, major: number): boolean {
  return new RegExp(`^v?${major}\\.\\d+\\.\\d+$`).test(version.trim());
}
async function repository(root: string) {
  const metadata = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')) as {
    name?: unknown;
    scripts: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  if (metadata.name !== 'banora-workspace')
    throw Error('Run this command from the Banora repository root.');
  return metadata;
}
export async function clean(root: string, apply: boolean): Promise<string[]> {
  await repository(root);
  const workspace = await realpath(root),
    targets: string[] = [];
  // Validate every target before deleting any of them. Never follow an artifact link.
  for (const target of CLEAN_TARGETS) {
    const path = resolve(workspace, target);
    let info;
    try {
      info = await lstat(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    if (info.isSymbolicLink()) throw Error(`Refusing to clean linked artifact: ${target}`);
    const actual = await realpath(path);
    if (!actual.startsWith(workspace + sep))
      throw Error(`Artifact escapes the repository: ${target}`);
    targets.push(actual);
  }
  if (apply) for (const target of targets) await rm(target, { recursive: true, force: true });
  return targets.map((target) => relative(workspace, target).replaceAll('\\', '/'));
}
export async function doctor(root: string): Promise<boolean> {
  const metadata = await repository(root);
  const tools = Bun.TOML.parse(await readFile(resolve(root, 'mise.toml'), 'utf8')) as {
    tools: { bun: string; node: string };
  };
  const node = spawnSync('node', ['--version'], { encoding: 'utf8', timeout: 5000 });
  const dependencyChecks = await Promise.all(
    Object.keys(metadata.devDependencies ?? {}).map(async (name) => ({
      name,
      installed: await Bun.file(resolve(root, 'node_modules', name, 'package.json')).exists(),
    })),
  );
  const missing = dependencyChecks
    .filter((dependency) => !dependency.installed)
    .map((dependency) => dependency.name);
  const checks = [
    {
      name: 'Bun',
      ok: supportedVersion(Bun.version, Number(tools.tools.bun)),
      detail: Bun.version,
    },
    {
      name: 'Node',
      ok: node.status === 0 && supportedVersion(node.stdout, Number(tools.tools.node)),
      detail: node.status === 0 ? node.stdout.trim() : 'missing or could not run',
    },
    {
      name: 'Lockfile',
      ok: await Bun.file(resolve(root, 'bun.lock')).exists(),
      detail: 'bun.lock',
    },
    {
      name: 'Dependencies',
      ok: missing.length === 0,
      detail: missing.length
        ? `missing ${missing.join(', ')}; run bun run setup`
        : `${dependencyChecks.length} declared development dependencies installed`,
    },
    {
      name: 'npm',
      ok: Bun.which(process.platform === 'win32' ? 'npm.cmd' : 'npm') !== null,
      detail: 'required by isolated installed-consumer checks',
    },
  ];
  for (const check of checks)
    console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.name}: ${check.detail}`);
  if (checks.some((check) => !check.ok))
    console.error(
      'Install the declared tools with mise install, then use mise exec -- bun run setup.',
    );
  return checks.every((check) => check.ok);
}
if (import.meta.main) {
  const [intent, ...args] = process.argv.slice(2),
    root = process.cwd();
  const metadata = await repository(root);
  if (intent === 'commands' && !args.length) {
    console.log(JSON.stringify({ tools: 'mise.toml', commands: metadata.scripts }, null, 2));
  } else if (
    intent === 'clean' &&
    (args.length === 0 || (args.length === 1 && args[0] === '--apply'))
  ) {
    const targets = await clean(root, args[0] === '--apply');
    console.log(JSON.stringify({ applied: args[0] === '--apply', targets }, null, 2));
    if (!args.length)
      console.log('Preview only. Use bun run clean --apply to delete listed generated artifacts.');
  } else if (intent === 'doctor' && !args.length) {
    if (!(await doctor(root))) process.exitCode = 1;
  } else if (intent === 'setup' && !args.length) {
    const tools = Bun.TOML.parse(await readFile(resolve(root, 'mise.toml'), 'utf8')) as {
      tools: { bun: string; node: string };
    };
    const node = spawnSync('node', ['--version'], { encoding: 'utf8', timeout: 5000 });
    if (
      !supportedVersion(Bun.version, Number(tools.tools.bun)) ||
      node.status !== 0 ||
      !supportedVersion(node.stdout, Number(tools.tools.node))
    ) {
      console.error(
        'Tool versions do not match mise.toml. Run mise install, then mise exec -- bun run setup.',
      );
      process.exitCode = 1;
    } else {
      const installed = Bun.spawn([process.execPath, 'install', '--frozen-lockfile'], {
        cwd: root,
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const code = await installed.exited;
      if (code || !(await doctor(root))) process.exitCode = code || 1;
    }
  } else {
    console.error('Expected setup, doctor, commands or clean [--apply].');
    process.exitCode = 2;
  }
}
