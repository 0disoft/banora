import { readFile, lstat, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

/** Signal-only gate: never print credential material or surrounding content. */
export function secretSignals(path: string, text: string): string[] {
  const signals: string[] = [];
  path = path.replaceAll('\\', '/');
  if (
    /(^|\/)(\.env(?:\..*)?|\.npmrc|\.netrc)$/.test(path) &&
    !path.endsWith('.env.example') &&
    !path.endsWith('.npmrc')
  )
    signals.push('private configuration file');
  if (/\.(pem|p12|pfx|key)$/.test(path)) signals.push('private credential artifact');
  if (/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(text))
    signals.push('private key marker');
  if (/\bAKIA[A-Z0-9]{16}\b/.test(text)) signals.push('AWS access key pattern');
  if (/\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/.test(text))
    signals.push('GitHub credential pattern');
  if (path.endsWith('.npmrc') && /(?:_authToken|_password)\s*=\s*(?!\$\{)[^\s#;]+/.test(text))
    signals.push('literal registry credential');
  return signals;
}
export function workflowSignals(input: unknown): string[] {
  const workflow = input as Record<string, unknown>;
  if (!workflow || typeof workflow !== 'object') return ['invalid workflow'];
  const signals: string[] = [];
  if (/\$\{\{\s*secrets\./.test(JSON.stringify(workflow)))
    signals.push('secret injection requires a reviewed workflow policy change');
  const event = workflow.on;
  if (
    event === 'pull_request_target' ||
    (Array.isArray(event) && event.includes('pull_request_target')) ||
    (event && typeof event === 'object' && Object.hasOwn(event, 'pull_request_target'))
  )
    signals.push('privileged pull_request_target trigger');
  const permissions = (value: unknown) => {
    if (value === undefined) return;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      signals.push('unbounded workflow permissions');
      return;
    }
    for (const access of Object.values(value))
      if (access !== 'read' && access !== 'none')
        signals.push('write workflow permission requires a reviewed policy change');
  };
  if (!Object.hasOwn(workflow, 'permissions'))
    signals.push('explicit workflow permissions required');
  permissions(workflow.permissions);
  const jobs = workflow.jobs as
    | Record<
        string,
        { permissions?: unknown; steps?: { uses?: string; with?: Record<string, unknown> }[] }
      >
    | undefined;
  for (const job of Object.values(jobs ?? {})) {
    permissions(job.permissions);
    for (const step of job.steps ?? []) {
      if (
        step.uses?.startsWith('actions/checkout@') &&
        step.with?.['persist-credentials'] !== false
      )
        signals.push('checkout must not persist credentials');
    }
  }
  return signals;
}
if (import.meta.main) {
  const root = process.cwd(),
    tracked = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      encoding: 'utf8',
      timeout: 5000,
    });
  if (tracked.status !== 0)
    throw Error('Could not enumerate repository files for the security gate.');
  let inspected = 0,
    failures = 0;
  for (const file of [...new Set(tracked.stdout.split('\0').filter(Boolean))]) {
    if (
      !/\.(ts|js|json|toml|yml|yaml|md|html|cfg|pem|p12|pfx|key)$|(^|\/)(\.env(?:\..*)?|\.npmrc|\.netrc)$/.test(
        file,
      )
    )
      continue;
    const path = resolve(root, file);
    let info;
    try {
      info = await lstat(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    if (!info.isFile() || info.isSymbolicLink()) continue;
    const signals = secretSignals(file, await readFile(path, 'utf8'));
    inspected++;
    for (const signal of signals) {
      failures++;
      console.error(`${file}: ${signal}`);
    }
  }
  const workflows = resolve(root, '.github/workflows');
  for (const file of await readdir(workflows)) {
    if (!/\.ya?ml$/.test(file)) continue;
    let parsed: unknown;
    try {
      parsed = Bun.YAML.parse(await readFile(resolve(workflows, file), 'utf8'));
    } catch {
      failures++;
      console.error(`.github/workflows/${file}: invalid YAML; content redacted`);
      continue;
    }
    for (const signal of workflowSignals(parsed)) {
      failures++;
      console.error(`.github/workflows/${file}: ${signal}`);
    }
  }
  if (failures) process.exitCode = 1;
  else
    console.log(
      `Security file/permission signals passed (${inspected} files). Not a complete secret or vulnerability scan.`,
    );
}
