import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
await mkdir(resolve(root, '.tmp'), { recursive: true });
const directory = await mkdtemp(resolve(root, '.tmp/packed-consumer-'));
const run = (command: string[], cwd: string) => {
  const result = Bun.spawnSync(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) throw new Error(`${command.join(' ')} failed:\n${result.stdout.toString()}${result.stderr.toString()}`);
  return result.stdout.toString();
};
run([process.execPath, 'pm', 'pack', '--filename', resolve(directory, 'sdk.tgz'), '--ignore-scripts'], resolve(root, 'packages/sdk'));
await writeFile(resolve(directory, 'package.json'), JSON.stringify({
  name: 'banora-packed-consumer', private: true, type: 'module',
  dependencies: { '@banora/sdk': './sdk.tgz' },
}));
run([process.execPath, 'install', '--ignore-scripts'], directory);
const consumer = `import { RecordController, createPosition, play, stoneAt } from '@banora/sdk';
import { parseSgf } from '@banora/sdk/sgf';
import { opposite } from '@banora/sdk/core';
import type { ControllerState } from '@banora/sdk/controller';
const result = play(createPosition({ width: 9 }), { x: 4, y: 4 });
if (!result.ok || stoneAt(result.position, { x: 4, y: 4 }) !== 'black') throw Error('Core artifact failed');
if (opposite('black') !== 'white') throw Error('Core subpath failed');
const controller = new RecordController({ sgf: '(;SZ[9]XX[preserve];B[aa])' });
controller.next(); controller.setComment('public artifact');
controller.setMarker({ x: 3, y: 3 }, 'label', 'A:B');
const state: ControllerState = controller.getState();
if (!state.dirty) throw Error('Editing failed');
const exported = controller.prepareExport();
if (!parseSgf(exported.text).ok) throw Error('SGF subpath failed');
const reopened = new RecordController({ sgf: exported.text }); reopened.next();
if (reopened.getState().node.properties.C?.[0] !== 'public artifact') throw Error('Reopen failed');
controller.acknowledgeExport(exported.id);
if (controller.getState().dirty) throw Error('Export baseline failed');
controller.dispose(); reopened.dispose();
console.log('Packed public SDK consumer passed');
`;
await writeFile(resolve(directory, 'consumer.ts'), consumer);
await writeFile(resolve(directory, 'tsconfig.json'), JSON.stringify({
  extends: resolve(root, 'tsconfig.json'), compilerOptions: { types: [] }, include: ['consumer.ts'],
}));
run([process.execPath, 'run', 'typecheck', '--project', resolve(directory, 'tsconfig.json')], root);
// Node 24 can strip erasable types, so the exact typed consumer runs against the
// installed tarball rather than source files or workspace symlinks.
console.log(run(['node', resolve(directory, 'consumer.ts')], directory).trim());
const installed = JSON.parse(await readFile(resolve(directory, 'node_modules/@banora/sdk/package.json'), 'utf8'));
if (installed.dependencies && Object.keys(installed.dependencies).length) throw new Error('Unexpected SDK runtime dependencies');
await readFile(resolve(directory, 'node_modules/@banora/sdk/LICENSE'));
console.log(`Packed declarations, entrypoints and license checked in ${directory}`);
