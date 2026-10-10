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
]);
let documents = 0;
let links = 0;
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
