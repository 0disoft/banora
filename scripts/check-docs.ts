import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const ignored = new Set([
  'node_modules',
  '.git',
  '.ssealed',
  '.svelte-kit',
  'dist',
  '.cache',
  '.tmp',
  '.artifacts',
]);
let documents = 0;
let links = 0;
const repository = process.cwd();
const metadata = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
async function inspect(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory() && !ignored.has(entry.name)) await inspect(file);
    if (!entry.isFile() || !/\.(md|mmd)$/.test(entry.name)) continue;
    const content = await readFile(file, 'utf8');
    if (content.includes('\r') || !content.endsWith('\n'))
      throw new Error(`Expected LF and final newline: ${file}`);
    if (/[\u3131-\u318e\uac00-\ud7a3]/u.test(content))
      throw new Error(`Documentation must be English: ${file}`);
    if (
      file.startsWith(resolve(repository, 'docs') + '/') ||
      file.startsWith(resolve(repository, 'docs') + '\\') ||
      ['README.md', 'DEVELOPMENT.md', 'VALIDATION.md'].some(
        (name) => file === resolve(repository, name),
      )
    )
      for (const match of content.matchAll(/\bbun run ([a-z][a-z\d:-]*)/g))
        if (!Object.hasOwn(metadata.scripts, match[1]!))
          throw new Error(`Missing root script: ${file} -> ${match[1]}`);
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)) {
      const target = match[1]!;
      if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('#')) continue;
      if (!existsSync(resolve(dirname(file), target.split('#')[0]!)))
        throw new Error(`Broken link: ${file} -> ${target}`);
      links++;
    }
    documents++;
  }
}
await inspect(process.cwd());
console.log(`docs: ${documents} documents, ${links} relative links checked`);
