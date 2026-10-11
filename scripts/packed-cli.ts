import { mkdir, mkdtemp, readFile, writeFile, access, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { releaseInput } from './release-artifacts.js';

const root = process.cwd();
await mkdir(resolve(root, '.tmp'), { recursive: true });
const directory = await mkdtemp(resolve(root, '.tmp/packed-cli-'));
function run(command: string[], cwd: string) {
  const result = Bun.spawnSync(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0)
    throw Error(`${command[0]} failed: ${result.stdout.toString()}${result.stderr.toString()}`);
}
const release = await releaseInput();
for (const name of ['sdk', 'cli']) {
  if (release)
    await copyFile(resolve(release, `packages/${name}.tgz`), resolve(directory, `${name}.tgz`));
  else
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
}
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
check(
  cli(['--help']).commands.some((item: { name: string }) => item.name === 'recipe'),
  'Missing recipe command discovery',
);
const recipeNames = [
  'create-study',
  'inspect-branches',
  'review-preview',
  'score-agreed',
  'occupied-point',
];
const catalog = cli(['recipe']);
check(
  catalog.schemaVersion === 'banora.cli-recipes/v1' &&
    JSON.stringify(catalog.recipes.map((item: { name: string }) => item.name)) ===
      JSON.stringify(recipeNames) &&
    catalog.recipes.at(-1).expected === 'command-failed',
  'Incomplete recipe catalog or unmarked failure fixture',
);
const recipe = (name: string) => cli(['recipe', '--name', name]);
const automate = (request: unknown, exit = 0) => cli(['run'], exit, JSON.stringify(request));
const createdStudy = automate(recipe('create-study'));
check(
  createdStudy.snapshot.moveNumber === 2 &&
    createdStudy.snapshot.stones[20] === 'black' &&
    createdStudy.snapshot.stones[60] === 'white' &&
    createdStudy.results[0].value.total === 1 &&
    createdStudy.history.dirty &&
    createdStudy.checkpoint &&
    createdStudy.sgf.includes('CR[cc]'),
  'Create/annotate/search/checkpoint recipe did not produce its authored study',
);
const resumedStudy = automate({
  schemaVersion: 'banora.automation/v1',
  kind: 'record',
  checkpoint: createdStudy.checkpoint,
});
check(
  resumedStudy.sgf === createdStudy.sgf &&
    resumedStudy.history.dirty &&
    !resumedStudy.history.canUndo &&
    JSON.stringify(resumedStudy.selection) === JSON.stringify(createdStudy.selection),
  'Recipe checkpoint did not resume across actual processes with a fresh Undo boundary',
);
const inspectedBranches = automate(recipe('inspect-branches'));
check(
  inspectedBranches.games.length === 2 &&
    inspectedBranches.results[0].value.total === 3 &&
    inspectedBranches.selected.properties.C[0] === 'Original branch note' &&
    !inspectedBranches.history.dirty &&
    inspectedBranches.sgf.includes('XX[keep]'),
  'Read-only collection/branch recipe edited or omitted its authored data',
);
const previewRequest = recipe('review-preview');
const previewResult = automate(previewRequest);
check(
  !previewResult.results[0].value.applied &&
    previewResult.results[0].value.edits.length === 2 &&
    !previewResult.history.dirty &&
    previewResult.sgf.includes('C[Obsolete note]'),
  'Preview recipe applied changes prematurely',
);
const approvedRequest = {
  ...previewRequest,
  operations: [
    { ...previewRequest.operations[0], previewOnly: false, expectedSgf: previewResult.sgf },
  ],
};
const approved = automate(approvedRequest);
check(
  approved.results[0].value.applied &&
    approved.history.dirty &&
    approved.sgf.includes('C[Reviewed note]') &&
    !approved.sgf.includes('C[Obsolete note]') &&
    approved.sgf.includes('XX[keep]') &&
    JSON.stringify(approved.selection) === JSON.stringify(previewResult.selection),
  'Explicit approval recipe failed to preserve selection/unknown properties',
);
check(
  automate({ ...approvedRequest, operations: [...approvedRequest.operations, { op: 'undo' }] })
    .sgf === previewResult.sgf,
  'Approved recipe batch did not Undo as one request-local edit',
);
const staleApproval = automate(
  { ...approvedRequest, sgf: previewRequest.sgf.replace('XX[keep]', 'XX[changed]') },
  3,
);
check(
  staleApproval.error.reason === 'stale-preview' && !('sgf' in staleApproval),
  'Recipe approval silently accepted intervening changes or exposed partial edits',
);
const agreedScore = automate(recipe('score-agreed'));
check(
  agreedScore.results[0].value.method === 'area' &&
    agreedScore.results[0].value.winner === 'white' &&
    agreedScore.results[0].value.margin === 6.5 &&
    !agreedScore.history.dirty,
  'Explicitly agreed area-score recipe used incorrect values or edited input',
);
const occupiedRecipe = automate(recipe('occupied-point'), 3);
check(
  occupiedRecipe.error.code === 'command-failed' &&
    occupiedRecipe.error.operationIndex === 1 &&
    !('sgf' in occupiedRecipe) &&
    !('snapshot' in occupiedRecipe),
  'Failure recipe returned partial authored state or an incorrect failed operation',
);
for (const args of [
  ['recipe', '--name', '../outside'],
  ['recipe', '--name', 'missing'],
  ['recipe', '--name', 'create-study', '--name', 'score-agreed'],
  ['recipe', '--output', 'recipe.json'],
])
  check(
    cli(args, 2).error.code === 'usage',
    'Recipe discovery accepted invalid flags or a filesystem lookup',
  );
const toolsSgf =
  '(;SZ[5]XX[keep];B[aa](;W[bb]C[Needle first])(;W[cc]C[needle second]))(;SZ[9]C[needle other])';
check(
  cli(['--help']).commands.some((item: { name: string }) => item.name === 'diagnose'),
  'Missing diagnostic command discovery',
);
const diagnosticRequest = JSON.stringify({
  schemaVersion: 'banora.automation/v1',
  kind: 'record',
  sgf: '(;SZ[5]PB[PRIVATE PLAYER]C[PRIVATE COMMENT])',
  stateKey: 'PRIVATE KEY',
  includeTree: true,
  operations: [
    { op: 'search', query: 'PRIVATE QUERY' },
    { op: 'play', point: { x: 0, y: 0 } },
    { op: 'play', point: { x: 0, y: 0 } },
  ],
});
await writeFile(resolve(directory, 'private-request.json'), diagnosticRequest);
const diagnosed = cli(
  ['diagnose', '--request', 'private-request.json', '--output', 'failure-report.json'],
  3,
);
check(
  diagnosed.schemaVersion === 'banora.cli-diagnostics/v1' &&
    diagnosed.operationIndex === 2 &&
    diagnosed.diagnostics.events.at(-1).failure.code === 'occupied',
  'Missing actual failure evidence/index',
);
check(
  !/PRIVATE|sgf|snapshot|properties|message|stack|output|query/.test(JSON.stringify(diagnosed)),
  'Diagnostic output included private request or error data',
);
check(
  diagnosed.diagnostics.environment.runtime === 'node' &&
    diagnosed.diagnostics.environment.runtimeMajor ===
      Number(
        spawnSync('node', ['-p', 'process.versions.node.split(".")[0]'], {
          encoding: 'utf8',
        }).stdout.trim(),
      ) &&
    diagnosed.durationMs >= 0 &&
    diagnosed.durationMs <= 86_400_000,
  'Missing safe execution environment/timing',
);
check(
  JSON.stringify(JSON.parse(await readFile(resolve(directory, 'failure-report.json'), 'utf8'))) ===
    JSON.stringify(diagnosed),
  'Failed SDK report was not explicitly saved',
);
check(
  (await readFile(resolve(directory, 'private-request.json'), 'utf8')) === diagnosticRequest,
  'Diagnostic execution overwrote input',
);
check(
  cli(['diagnose', '--request', 'private-request.json', '--output', 'failure-report.json'], 4).error
    .code === 'output',
  'Diagnostic report replaced an existing output without force',
);
const blockedDiagnostic = cli(
  ['diagnose', '--request', 'private-request.json', '--output', 'private-request.json', '--force'],
  4,
);
check(
  blockedDiagnostic.error.code === 'output' &&
    blockedDiagnostic.operationIndex === 2 &&
    blockedDiagnostic.diagnostics.events.at(-1).failure.code === 'occupied',
  'Publication failure lost actual SDK evidence',
);
check(
  (await readFile(resolve(directory, 'private-request.json'), 'utf8')) === diagnosticRequest,
  'Forced diagnostic publication replaced input',
);
check(
  cli(
    ['diagnose', '--request', 'private-request.json', '--output', 'failure-report.json', '--force'],
    3,
  ).operationIndex === 2,
  'Explicit diagnostic replacement failed',
);
const successfulDiagnostic = cli(
  ['diagnose', '--output', 'success-report.json'],
  0,
  JSON.stringify({
    schemaVersion: 'banora.automation/v1',
    kind: 'record',
    size: 9,
    operations: [{ op: 'comment', text: 'PRIVATE EDIT' }],
    includeCheckpoint: true,
  }),
);
check(
  successfulDiagnostic.ok &&
    !('sgf' in successfulDiagnostic) &&
    successfulDiagnostic.diagnostics.events.at(-1).operation === 'checkpoint',
  'Successful stdin diagnostic failed',
);
for (const [args, input, code] of [
  [['diagnose'], 'PRIVATE MALFORMED JSON', 'input'],
  [['diagnose', '--request', 'PRIVATE MISSING PATH'], undefined, 'input'],
  [['diagnose', '--PRIVATE'], undefined, 'usage'],
  [['diagnose', '--force'], undefined, 'usage'],
  [['diagnose', '--request', 'private-request.json', '--request', 'PRIVATE'], undefined, 'usage'],
] as const) {
  const rejected = cli([...args], 2, input);
  check(
    rejected.schemaVersion === 'banora.cli-diagnostics/v1' &&
      rejected.error.code === code &&
      !/PRIVATE|message|stack/.test(JSON.stringify(rejected)),
    'Transport diagnostic leaked content or wrong envelope',
  );
}
check(
  cli(['diagnose'], 3, '{}').diagnostics.events[0].failure.code === 'invalid-request',
  'Schema diagnostic failure was not projected',
);
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
