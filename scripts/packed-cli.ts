import { mkdir, mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
await mkdir(resolve(root, '.tmp'), { recursive: true });
const directory = await mkdtemp(resolve(root, '.tmp/packed-cli-'));
function run(command: string[], cwd: string) {
  const result = Bun.spawnSync(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0)
    throw Error(`${command[0]} failed: ${result.stdout.toString()}${result.stderr.toString()}`);
}
for (const name of ['sdk', 'cli'])
  run(
    [
      process.execPath,
      'pm',
      'pack',
      '--filename',
      resolve(directory, `${name}.tgz`),
      '--ignore-scripts',
    ],
    resolve(root, 'packages', name),
  );
await writeFile(
  resolve(directory, 'package.json'),
  JSON.stringify({
    private: true,
    type: 'module',
    dependencies: { '@banora/sdk': './sdk.tgz', '@banora/cli': './cli.tgz' },
  }),
);
run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund'], directory);
let checks = 0;
const check = (value: unknown, message: string) => {
  if (!value) throw Error(message);
  checks++;
};
const cliPath = resolve(directory, 'node_modules/@banora/cli/dist/main.js');
function cli(args: string[], exit = 0, input?: string) {
  const result = spawnSync('node', [cliPath, ...args], {
    cwd: directory,
    input,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 15_000,
  });
  check(
    result.status === exit && !result.error,
    `CLI exit mismatch ${args[0]}: ${result.status} ${result.error ?? ''} ${result.stdout}`,
  );
  check(result.stderr === '', 'CLI printed unstructured stderr');
  check(
    result.stdout.trim().split('\n').length === 1,
    'CLI stdout was not exactly one JSON response',
  );
  return JSON.parse(result.stdout);
}
const bin = spawnSync(
  process.platform === 'win32' ? 'cmd.exe' : resolve(directory, 'node_modules/.bin/banora'),
  process.platform === 'win32'
    ? ['/d', '/s', '/c', 'node_modules\\.bin\\banora.cmd --help']
    : ['--help'],
  { cwd: directory, encoding: 'utf8', timeout: 15_000 },
);
check(
  bin.status === 0 &&
    JSON.parse(bin.stdout).commands.some((item: { name: string }) => item.name === 'run'),
  'Installed executable shim failed',
);
check(cli(['schema']).oneOf.length === 2, 'Missing request discovery');
check(JSON.stringify(cli(['schema'])).includes('comment-batch'), 'Missing comment-batch discovery');
check(
  cli(['--help']).commands.some((item: { name: string }) => item.name === 'search'),
  'Missing search command discovery',
);
const toolsSgf =
  '(;SZ[5]XX[keep];B[aa](;W[bb]C[Needle first])(;W[cc]C[needle second]))(;SZ[9]C[needle other])';
await writeFile(resolve(directory, 'tools.sgf'), toolsSgf);
const searched = cli([
  'search',
  '--input',
  'tools.sgf',
  '--query',
  'needle',
  '--properties',
  'C',
  '--limit',
  '2',
]);
check(
  searched.results[0].value.total === 3 &&
    searched.results[0].value.hasMore &&
    !searched.history.dirty &&
    searched.results[0].value.hits[1].target.path.join(',') === '0,1',
  'Installed search lost branches/pagination/selection',
);
check(
  cli(['search', '--input', 'tools.sgf', '--query', '', '--properties', 'C']).results[0].value
    .total === 3,
  'Installed explicit empty search query failed',
);
const caseSearch = cli(
  ['search', '--input', '-', '--query', 'Needle', '--case-sensitive'],
  0,
  toolsSgf,
);
check(caseSearch.results[0].value.total === 1, 'Installed case-sensitive stdin search failed');
check(
  cli(['search', '--input', 'tools.sgf', '--properties', 'C', '--game', '1']).results[0].value
    .total === 1,
  'Installed comment enumeration/game filter failed',
);
check(
  cli(['search', '--input', 'tools.sgf', '--offset', '-1'], 2).error.code === 'usage',
  'Negative search offset not rejected',
);
check(
  cli(['search', '--input', 'tools.sgf', '--limit', '101'], 3).error.code === 'invalid-request',
  'Search limit not rejected',
);
const changes = searched.results[0].value.hits.map((hit: { target: unknown; excerpt: string }) => ({
  target: hit.target,
  text: 'Reviewed 한국어',
  expectedText: hit.excerpt,
}));
const toolRequest = {
  schemaVersion: 'banora.automation/v1',
  kind: 'record',
  sgf: toolsSgf,
  selection: changes[1]!.target,
  operations: [{ op: 'comment-batch', changes, previewOnly: true }],
};
const previewed = cli(['run'], 0, JSON.stringify(toolRequest));
check(
  !previewed.history.dirty &&
    previewed.results[0].value.applied === false &&
    previewed.results[0].value.edits.length === 2 &&
    previewed.sgf.includes('C[Needle first]'),
  'Installed preview changed source',
);
await writeFile(
  resolve(directory, 'tool-ops.json'),
  JSON.stringify([{ op: 'comment-batch', changes, expectedSgf: previewed.sgf }]),
);
const appliedTools = cli([
  'edit',
  '--input',
  'tools.sgf',
  '--operations',
  'tool-ops.json',
  '--output',
  'tools-edited.sgf',
]);
check(
  appliedTools.history.dirty &&
    appliedTools.results[0].value.applied &&
    appliedTools.sgf.includes('XX[keep]'),
  'Installed batch apply failed',
);
check(
  cli(['search', '--input', 'tools-edited.sgf', '--query', 'Reviewed']).results[0].value.total ===
    2,
  'Installed edited SGF reopen lost batch comments',
);
const undoneTools = cli(
  ['run'],
  0,
  JSON.stringify({
    ...toolRequest,
    operations: [{ op: 'comment-batch', changes }, { op: 'undo' }],
  }),
);
check(
  !undoneTools.history.dirty &&
    undoneTools.history.canRedo &&
    undoneTools.selection.path.join(',') === '0,1',
  'Installed batch Undo changed selection or baseline',
);
await writeFile(
  resolve(directory, 'stale-tools.json'),
  JSON.stringify({
    ...toolRequest,
    operations: [{ op: 'comment-batch', changes: [{ ...changes[0], expectedText: 'stale' }] }],
  }),
);
const staleTools = cli(['run', '--request', 'stale-tools.json', '--output', 'stale-tools.sgf'], 3);
check(
  staleTools.error.reason === 'stale-preview' && !Object.hasOwn(staleTools, 'sgf'),
  'Installed stale batch returned partial output',
);
check(
  !(await Bun.file(resolve(directory, 'stale-tools.sgf')).exists()),
  'Failed batch published an output file',
);
check(
  (await readFile(resolve(directory, 'tools.sgf'), 'utf8')) === toolsSgf,
  'Record-tool commands changed the input file',
);
const replacedSource = cli(
  ['run'],
  3,
  JSON.stringify({
    ...toolRequest,
    sgf: toolsSgf.replace('XX[keep]', 'XX[intervening]'),
    operations: [{ op: 'comment-batch', changes, expectedSgf: previewed.sgf }],
  }),
);
check(
  replacedSource.error.reason === 'stale-preview' && !Object.hasOwn(replacedSource, 'sgf'),
  'Installed exact source guard accepted unrelated intervening changes',
);
const lateSgf = `(;SZ[5]${';B[];W[]'.repeat(180)};C[late needle])`;
await writeFile(resolve(directory, 'late-tools.sgf'), lateSgf);
const lateTools = cli(['search', '--input', 'late-tools.sgf', '--query', 'late needle']);
const lateTarget = lateTools.results[0].value.hits[0].target;
check(lateTarget.path.length === 361, 'Installed search truncated a long locator');
const lateEdited = cli(
  ['run'],
  0,
  JSON.stringify({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf: lateSgf,
    selection: lateTarget,
    operations: [
      {
        op: 'comment-batch',
        changes: [{ target: lateTarget, text: 'continued late', expectedText: 'late needle' }],
      },
    ],
  }),
);
check(
  lateEdited.selection.path.length === 361 &&
    lateEdited.selected.properties.C[0] === 'continued late',
  'Installed returned locator could not resume/apply',
);
const checkpointResult = cli(
  ['run'],
  0,
  JSON.stringify({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    size: 5,
    includeCheckpoint: true,
    operations: [
      { op: 'play', point: { x: 2, y: 2 } },
      { op: 'comment', text: 'interrupted' },
    ],
  }),
);
check(
  checkpointResult.checkpoint?.schemaVersion === 'banora.checkpoint/v1',
  'Checkpoint discovery/output failed',
);
await writeFile(
  resolve(directory, 'resume.json'),
  JSON.stringify({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    checkpoint: checkpointResult.checkpoint,
    includeCheckpoint: true,
    operations: [{ op: 'comment', text: 'continued' }],
  }),
);
const checkpointResumed = cli(['run', '--request', 'resume.json', '--output', 'resumed.sgf']);
check(
  checkpointResumed.snapshot.stones[12] === 'black' &&
    checkpointResumed.history.dirty &&
    checkpointResumed.selected.properties.C[0] === 'continued' &&
    checkpointResumed.checkpoint.baselineSgf === checkpointResult.checkpoint.baselineSgf,
  'Installed CLI checkpoint resume lost content or export baseline',
);
check(
  (await readFile(resolve(directory, 'resumed.sgf'), 'utf8')).includes('C[continued]'),
  'Checkpoint CLI output was not saved',
);
check(
  cli(
    ['run'],
    3,
    JSON.stringify({
      schemaVersion: 'banora.automation/v1',
      kind: 'record',
      checkpoint: { ...checkpointResult.checkpoint, schemaVersion: 'banora.checkpoint/v99' },
    }),
  ).error.code === 'invalid-request',
  'Future checkpoints must not be silently migrated',
);
check(cli(['--version']).version === '0.1.0-dev.0', 'Wrong packaged version');
check(cli(['create', '--size', '5', '--output', 'new.sgf']).snapshot.width === 5, 'Create failed');
await writeFile(resolve(directory, 'source.sgf'), '(;SZ[5]XX[retain])');
await writeFile(
  resolve(directory, 'shift-jis.sgf'),
  Buffer.from([
    ...Buffer.from('(;SZ[5]CA[Shift_JIS]PB['),
    0x83,
    0x5c,
    0x95,
    0x5c,
    ...Buffer.from(']C['),
    0x83,
    0x5c,
    0x95,
    0x5c,
    ...Buffer.from(']LB[aa:'),
    0x83,
    0x5c,
    ...Buffer.from('])'),
  ]),
);
const japanese = cli(['inspect', '--input', 'shift-jis.sgf']);
check(
  japanese.selected.properties.PB[0] === 'ソ表' &&
    japanese.selected.properties.C[0] === 'ソ表' &&
    japanese.snapshot.markers[0].label === 'ソ',
  'Installed CLI lost multibyte comments, player name or label',
);
await writeFile(
  resolve(directory, 'ops.json'),
  JSON.stringify([
    { op: 'play', point: { x: 2, y: 2 } },
    { op: 'comment', text: 'Agent 日本' },
    { op: 'marker', point: { x: 3, y: 1 }, kind: 'label', label: '<text>' },
  ]),
);
const edited = cli([
  'edit',
  '--input',
  'source.sgf',
  '--operations',
  'ops.json',
  '--output',
  'edited.sgf',
]);
cli(['edit', '--input', 'shift-jis.sgf', '--operations', 'ops.json', '--output', 'japanese.sgf']);
check(
  (await readFile(resolve(directory, 'japanese.sgf'), 'utf8')).includes('PB[ソ表]') &&
    cli(['inspect', '--input', 'japanese.sgf']).selected.properties.C[0] === 'ソ表',
  'Installed CLI edit/export/reopen lost Japanese root data',
);
check(
  edited.snapshot.stones[12] === 'black' && edited.sgf.includes('XX[retain]'),
  'Edit did not preserve record/state',
);
const reopened = cli(
  ['run'],
  0,
  JSON.stringify({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf: await readFile(resolve(directory, 'edited.sgf'), 'utf8'),
    selection: edited.selection,
  }),
);
check(
  reopened.snapshot.stones[12] === 'black' && reopened.selected.properties.C[0] === 'Agent 日本',
  'Portable selection/reopen failed',
);
const longRecord = cli(
  ['run'],
  0,
  JSON.stringify({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf: '(;SZ[5]XX[long]' + ';B[];W[]'.repeat(65) + ')',
    operations: Array.from({ length: 130 }, () => ({ op: 'next' })),
  }),
);
check(
  longRecord.selection.path.length === 130 && longRecord.snapshot.moveNumber === 130,
  'Long record replay returned the wrong location',
);
const resumed = cli(
  ['run', '--output', 'long-resumed.sgf'],
  0,
  JSON.stringify({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    sgf: longRecord.sgf,
    selection: longRecord.selection,
    operations: [{ op: 'comment', text: 'Resumed past move 128' }],
  }),
);
check(
  resumed.snapshot.moveNumber === 130 &&
    resumed.selected.properties.C[0] === 'Resumed past move 128',
  'Returned long location could not resume through installed CLI',
);
check(
  (await readFile(resolve(directory, 'long-resumed.sgf'), 'utf8')).includes(
    'C[Resumed past move 128]',
  ),
  'Resumed long record was not saved',
);
check(
  cli(['inspect', '--input', 'edited.sgf', '--tree']).games.length === 1,
  'Tree discovery failed',
);
const snapshot = {
  key: 'host/7',
  width: 2,
  height: 3,
  stones: Array(6).fill(null),
  visiblePoints: [],
};
check(
  cli(['snapshot', '--input', '-', '--output', 'snapshot.json'], 0, JSON.stringify(snapshot))
    .snapshot.key === 'host/7',
  'Snapshot stdin failed',
);
check(
  JSON.parse(await readFile(resolve(directory, 'snapshot.json'), 'utf8')).visiblePoints.length ===
    0,
  'Snapshot file failed',
);
const failed = cli(
  ['run', '--output', 'must-not-exist.sgf'],
  3,
  JSON.stringify({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    size: 5,
    operations: [
      { op: 'play', point: { x: 0, y: 0 } },
      { op: 'play', point: { x: 0, y: 0 } },
    ],
  }),
);
check(
  failed.error.reason === 'occupied' && failed.error.operationIndex === 1 && !('sgf' in failed),
  'Batch rejection leaked partial state',
);
check(
  await access(resolve(directory, 'must-not-exist.sgf')).then(
    () => false,
    () => true,
  ),
  'Failed batch wrote a file',
);
const original = await readFile(resolve(directory, 'edited.sgf'), 'utf8');
check(
  cli(['create', '--output', 'edited.sgf'], 4).error.code === 'output',
  'Overwrite was not exclusive',
);
check(
  (await readFile(resolve(directory, 'edited.sgf'), 'utf8')) === original,
  'Existing output was damaged',
);
check(
  cli(
    [
      'edit',
      '--input',
      'source.sgf',
      '--operations',
      'ops.json',
      '--output',
      'source.sgf',
      '--force',
    ],
    4,
  ).error.code === 'output',
  'Input overwrite was allowed',
);
check(
  (await readFile(resolve(directory, 'source.sgf'), 'utf8')) === '(;SZ[5]XX[retain])',
  'Input changed',
);
check(
  cli(['create', '--size', '9', '--output', 'edited.sgf', '--force']).snapshot.width === 9,
  'Explicit output replacement failed',
);
check(cli(['create', '--unexpected'], 2).error.code === 'usage', 'Unknown flag accepted');
check(
  cli(['create', '--size', '5', '--size', '9'], 2).error.code === 'usage',
  'Repeated flag accepted',
);
check(cli(['run'], 2, '{broken').error.code === 'input', 'Invalid JSON handling failed');
check(
  cli(['run'], 2, ' '.repeat(8 * 1024 * 1024 + 1)).error.code === 'limit',
  'Input bound failed',
);
check(
  cli(
    ['run'],
    3,
    JSON.stringify({
      schemaVersion: 'banora.automation/v1',
      kind: 'record',
      operations: [{ op: 'eval', code: 'throw 1' }],
    }),
  ).error.code === 'invalid-request',
  'Unknown command accepted',
);
await readFile(resolve(directory, 'node_modules/@banora/cli/LICENSE'));
check(
  (await readFile(resolve(directory, 'node_modules/@banora/cli/README.md'), 'utf8')).includes(
    'banora schema',
  ),
  'Packaged guide missing',
);
console.log(
  `Packed CLI passed ${checks} checks on ${process.platform}: installed bin, Node JSON/stdin, editing/reopen, snapshots, schema/errors, atomic output and input preservation.`,
);
