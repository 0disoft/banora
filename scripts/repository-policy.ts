import { readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import boundaries from '../config/module-boundaries.json';

const normalize = (path: string) => path.replaceAll('\\', '/');
const modules = new Map<string, string>(
  Object.entries(boundaries).flatMap(([group, names]) => names.map((name) => [name, group])),
);
const transpilers = {
  ts: new Bun.Transpiler({ loader: 'ts', trimUnusedImports: false }),
  tsx: new Bun.Transpiler({ loader: 'tsx', trimUnusedImports: false }),
};
export interface PolicyResult {
  readonly errors: string[];
  readonly warnings: string[];
}
export function inspectSource(file: string, source: string): PolicyResult {
  file = normalize(file);
  const errors: string[] = [],
    warnings: string[] = [];
  if (Buffer.byteLength(source) > 40_000)
    warnings.push(`${file}: exceeds 40 KB; review for a cohesive extraction`);
  const scripts = file.endsWith('.svelte')
    ? [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]!)
    : [source];
  for (const script of scripts) {
    let imports: string[];
    try {
      const transpiler =
        file.endsWith('.tsx') || file.endsWith('.jsx') ? transpilers.tsx : transpilers.ts;
      const scanned = script.replace(/^#![^\r\n]*(?:\r?\n|$)/, '\n');
      imports = [
        ...new Set([
          ...transpiler.scan(scanned).imports.map((item) => item.path),
          ...transpiler.scanImports(scanned).map((item) => item.path),
        ]),
      ];
    } catch {
      errors.push(`${file}: import scanner could not parse this source`);
      continue;
    }
    const sdk = /^packages\/sdk\/src\/([^/]+)\.ts$/.exec(file);
    if (file.startsWith('packages/sdk/src/') && !sdk)
      errors.push(
        `${file}: SDK modules require explicit classification in the flat source directory`,
      );
    const group = sdk ? modules.get(sdk[1]!) : undefined;
    if (sdk && !group) errors.push(`${file}: classify the module in config/module-boundaries.json`);
    for (const dependency of imports) {
      const target = dependency.startsWith('.')
        ? normalize(relative(process.cwd(), resolve(process.cwd(), dirname(file), dependency)))
        : dependency;
      if (sdk) {
        const internal = /^packages\/sdk\/src\/([^/]+)\.js$/.exec(target);
        if (!internal) {
          errors.push(
            `${file}: SDK runtime import must stay in its source directory: ${dependency}`,
          );
          continue;
        }
        const targetGroup = modules.get(internal[1]!);
        if (!targetGroup) errors.push(`${file}: unclassified dependency: ${dependency}`);
        else if (
          (group === 'core' && targetGroup !== 'core') ||
          (group === 'headless' && targetGroup === 'browser')
        )
          errors.push(`${file}: ${group} cannot depend on ${targetGroup}: ${dependency}`);
      }
      if (
        /^(examples\/|packages\/(react|vue|svelte|cli)\/src\/)/.test(file) &&
        (/packages\/sdk\/(src|dist)\//.test(target) ||
          /^@banora\/sdk\/(src|dist)\//.test(dependency))
      )
        errors.push(`${file}: consumers must use public SDK exports: ${dependency}`);
      const adapter = /^packages\/(react|vue|svelte)\/src\//.exec(file);
      if (adapter && /^(react|react-dom|vue|svelte)(\/|$)/.test(dependency)) {
        const framework =
          dependency.split('/')[0] === 'react-dom' ? 'react' : dependency.split('/')[0];
        if (framework !== adapter[1])
          errors.push(`${file}: unrelated framework dependency: ${dependency}`);
      }
    }
  }
  return { errors, warnings };
}
export async function inspectRepository(root: string): Promise<PolicyResult> {
  const result: PolicyResult = { errors: [], warnings: [] };
  async function walk(directory: string) {
    for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
      if (
        ['node_modules', 'dist', '.svelte-kit', '.git'].includes(entry.name) ||
        entry.isSymbolicLink()
      )
        continue;
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await walk(file);
      else if (/\.(ts|js|svelte)$/.test(entry.name)) {
        const inspected = inspectSource(file, await readFile(resolve(root, file), 'utf8'));
        result.errors.push(...inspected.errors);
        result.warnings.push(...inspected.warnings);
      }
    }
  }
  for (const directory of ['packages', 'examples', 'scripts']) await walk(directory);
  const sdkFiles = new Set(
    (await readdir(resolve(root, 'packages/sdk/src')))
      .filter((name) => name.endsWith('.ts'))
      .map((name) => name.slice(0, -3)),
  );
  for (const name of modules.keys())
    if (!sdkFiles.has(name)) result.errors.push(`module-boundaries: missing module ${name}`);
  for (const [name, groups] of Object.entries(boundaries))
    for (const module of groups)
      if (
        Object.values(boundaries)
          .flat()
          .filter((item) => item === module).length !== 1
      )
        result.errors.push(`module-boundaries: duplicate ${module} in ${name}`);
  return result;
}
if (import.meta.main) {
  const result = await inspectRepository(process.cwd());
  for (const warning of result.warnings) console.warn(warning);
  for (const error of result.errors) console.error(error);
  if (result.errors.length) process.exitCode = 1;
  else
    console.log(`Repository boundaries passed; ${result.warnings.length} size review candidates.`);
}
