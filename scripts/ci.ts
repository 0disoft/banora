import { appendFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

export interface CheckPlan {
  readonly mode: 'docs' | 'code';
  readonly browser: readonly string[];
  readonly adapters: boolean;
  readonly starter: boolean;
  readonly audit: boolean;
}
const focused: readonly [RegExp, string][] = [
  [
    /^(examples\/studio\/(preferences|preference-controls)\.ts$|scripts\/preferences(-scenario\.js|\.test\.ts)$)/,
    '--preferences-only',
  ],
  [
    /^(examples\/studio\/(draft-store|draft-session|recovery-controls)\.ts$|scripts\/(recovery-scenario\.js|draft-(store|session)\.test\.ts)$)/,
    '--recovery-only',
  ],
  [
    /^(packages\/sdk\/src\/analysis|examples\/analysis\/|scripts\/analysis-scenario\.js$)/,
    '--analysis-only',
  ],
  [
    /^(packages\/sdk\/src\/puzzle|examples\/puzzle\/|scripts\/puzzle-scenario\.js$)/,
    '--puzzle-only',
  ],
  [/^(packages\/sdk\/src\/playback|scripts\/playback-scenario\.js$)/, '--playback-only'],
  [/^(packages\/sdk\/src\/locale|examples\/ui-|scripts\/locale-scenario\.js$)/, '--locale-only'],
  [
    /^(packages\/sdk\/src\/scoring|examples\/scoring-controls|scripts\/scoring-scenario\.js$)/,
    '--scoring-only',
  ],
  [
    /^(packages\/sdk\/src\/share|examples\/sharing-controls|scripts\/share-scenario\.js$)/,
    '--share-only',
  ],
  [
    /^(packages\/sdk\/src\/placement-animation|scripts\/animation-(consumer-)?scenario\.js$)/,
    '--animation-only',
  ],
  [
    /^(packages\/sdk\/src\/(stone-textures|texture-loader|textures)|examples\/texture-controls|scripts\/texture-(consumer-)?scenario\.js$)/,
    '--texture-only',
  ],
  [/^(examples\/studio\/board-menu\.ts$|scripts\/menu-scenario\.js$)/, '--menu-only'],
];
export function planChecks(paths: readonly string[] | null): CheckPlan {
  if (paths && paths.length && paths.every((path) => /\.(md|mmd)$/.test(path)))
    return { mode: 'docs', browser: [], adapters: false, starter: false, audit: false };
  if (!paths || !paths.length)
    return { mode: 'code', browser: ['all'], adapters: true, starter: true, audit: true };
  const browser = new Set<string>();
  let adapters = false,
    starter = false,
    audit = false;
  for (const path of paths.map((path) => path.replaceAll('\\', '/'))) {
    if (/\.(md|mmd)$/.test(path)) continue;
    if (path === 'bun.lock' || /(^|\/)package\.json$/.test(path)) {
      audit = true;
      adapters = true;
      starter = true;
      browser.add('all');
    } else if (/^packages\/(react|vue|svelte)\//.test(path)) {
      adapters = true;
      browser.add('all');
    } else if (
      path.startsWith('examples/standalone/') ||
      /^scripts\/(packed-starter\.ts|starter-browser-smoke\.ts|starter-scenario\.js)$/.test(path)
    ) {
      starter = true;
    } else if (path === 'scripts/packed-adapters.ts') {
      adapters = true;
    } else if (path === 'scripts/build-adapters.ts' || path.startsWith('.github/workflows/')) {
      adapters = true;
      starter = true;
      browser.add('all');
    } else if (/^scripts\/(packed-consumer|packed-cli|build-cli)\.ts$/.test(path)) {
      // These commands already execute inside check.
    } else if (/^packages\/cli\//.test(path) || /^packages\/sdk\/test\//.test(path)) {
      // Installed CLI and SDK tests are already part of check.
    } else {
      const match = focused.find(([pattern]) => pattern.test(path));
      if (match) browser.add(match[1]);
      else if (path.startsWith('packages/sdk/src/katago')) browser.add('--analysis-only');
      else if (
        /^(scripts\/(ci|security|repository-policy|development)(\.test)?\.ts|config\/|\.github\/dependabot\.yml)/.test(
          path,
        )
      ) {
        // Local policy/planner tests and security gates cover these changes.
      } else browser.add('all');
    }
  }
  return {
    mode: 'code',
    browser: browser.has('all') ? ['all'] : [...browser].sort(),
    adapters,
    starter,
    audit,
  };
}
export function changedPaths(base?: string, head = 'HEAD'): string[] | null {
  if (!base || /^0+$/.test(base)) return null;
  const commit = (ref: string): string | null => {
    const result = spawnSync(
      'git',
      ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`],
      { encoding: 'utf8', timeout: 5000 },
    );
    return result.status === 0 && /^[a-f\d]{40,64}\s*$/.test(result.stdout)
      ? result.stdout.trim()
      : null;
  };
  const before = commit(base),
    after = commit(head);
  if (!before || !after) return null;
  const changed = spawnSync(
    'git',
    ['diff', '--name-only', '--no-renames', '-z', before, after, '--'],
    { encoding: 'utf8', timeout: 5000 },
  );
  return changed.status === 0 ? changed.stdout.split('\0').filter(Boolean) : null;
}
export function commandsFor(plan: CheckPlan): string[][] {
  const commands =
    plan.mode === 'docs'
      ? [
          ['run', 'format'],
          ['run', 'docs'],
          ['run', 'security:files'],
        ]
      : [
          ['run', 'check'],
          ['run', 'security:files'],
        ];
  if (plan.audit) commands.push(['run', 'security:deps']);
  if (plan.adapters) commands.push(['run', 'smoke:adapters']);
  if (plan.browser.length) {
    commands.push(['run', 'build:examples']);
    for (const scope of plan.browser)
      commands.push(['scripts/browser-smoke.ts', ...(scope === 'all' ? [] : [scope])]);
  }
  if (plan.starter) commands.push(['run', 'smoke:starter']);
  return commands;
}
if (import.meta.main) {
  const [intent, ...args] = process.argv.slice(2);
  let base: string | undefined,
    head = 'HEAD',
    output: string | undefined,
    dryRun = false;
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (key === '--dry-run') dryRun = true;
    else if (['--base', '--head', '--github-output'].includes(key!) && args[index + 1]) {
      const value = args[++index]!;
      if (key === '--base') base = value;
      else if (key === '--head') head = value;
      else output = value;
    } else
      throw Error(
        'Expected --base <commit>, --head <commit>, --github-output <file> or --dry-run.',
      );
  }
  if (intent !== 'plan' && intent !== 'run') throw Error('Expected CI plan or run.');
  const paths = changedPaths(base, head),
    plan = planChecks(paths),
    commands = commandsFor(plan);
  console.log(JSON.stringify({ paths, plan, commands }, null, 2));
  if (output)
    await appendFile(
      output,
      `browser=${plan.browser.length > 0 || plan.starter}\nmode=${plan.mode}\n`,
    );
  if (intent === 'run' && !dryRun) {
    for (const command of commands) {
      const child = Bun.spawn([process.execPath, ...command], {
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const code = await child.exited;
      if (code) {
        process.exitCode = code;
        break;
      }
    }
  }
}
