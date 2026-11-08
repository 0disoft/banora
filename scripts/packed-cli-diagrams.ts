import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Exercise the installed Node executable using the main packed runner's JSON/exit assertions. */
export async function packedCliDiagrams(
  directory: string,
  cli: (args: string[], exit?: number, input?: string) => any,
  check: (value: unknown, message: string) => void,
): Promise<void> {
  const sgf = '(;SZ[5]XX[preserve];B[aa](;W[bb]LB[bb:Main])(;W[dd]TR[aa]))(;SZ[3];B[cc])';
  const options = JSON.stringify({
    width: 240,
    moveNumbers: true,
    title: '<Diagram> "&"',
    theme: 'flat',
  });
  const external = JSON.stringify({
    key: 'external',
    width: 2,
    height: 2,
    stones: ['black', null, null, null],
  });
  await writeFile(resolve(directory, 'diagram.sgf'), sgf);
  await writeFile(resolve(directory, 'diagram-options.json'), options);
  await writeFile(resolve(directory, 'diagram-state.json'), external);
  check(
    cli(['--help']).commands.some((item: { name: string }) => item.name === 'diagram'),
    'Missing diagram discovery',
  );
  const defaultDiagram = cli([
    'diagram',
    '--input',
    'diagram.sgf',
    '--options',
    'diagram-options.json',
  ]);
  check(
    defaultDiagram.schemaVersion === 'banora.cli/v1' &&
      defaultDiagram.kind === 'diagram' &&
      defaultDiagram.format === 'svg' &&
      defaultDiagram.source === 'sgf',
    'Diagram result contract failed',
  );
  check(
    JSON.stringify(defaultDiagram.selection) === JSON.stringify({ gameIndex: 0, path: [0, 0] }),
    'Diagram default did not select mainline end',
  );
  check(
    defaultDiagram.svg.includes('width="240" height="240"') &&
      defaultDiagram.svg.includes('data-move-number="2"') &&
      defaultDiagram.svg.includes('&lt;Diagram&gt; &quot;&amp;&quot;'),
    'Diagram options, numbers or XML text failed',
  );
  const branch = cli(['diagram', '--input', 'diagram.sgf', '--path', '0,1']);
  check(
    branch.svg.includes('data-stone="3,3"') && !branch.svg.includes('Main'),
    'Diagram selected the wrong variation',
  );
  check(
    !cli(['diagram', '--input', 'diagram.sgf', '--path', 'root']).svg.includes('data-stone'),
    'Diagram root selector failed',
  );
  check(
    cli(['diagram', '--input', '-'], 0, '(;SZ[3]AB[ab][ba][cb][bc]PL[W];W[bb];B[aa])').svg.match(
      /data-stone=/g,
    ).length === 5,
    'Historical self-capture diagram replay failed',
  );
  check(
    cli(['diagram', '--input', 'diagram.sgf', '--game', '1']).svg.includes('data-stone="2,2"'),
    'Diagram collection selector failed',
  );
  check(
    cli(['diagram', '--input', '-'], 0, sgf).svg === cli(['diagram', '--input', 'diagram.sgf']).svg,
    'SGF stdin differs from file rendering',
  );
  const snapshot = cli(['diagram', '--state', '-'], 0, external);
  check(
    snapshot.source === 'snapshot' &&
      !('selection' in snapshot) &&
      snapshot.svg.includes('data-stone="0,0"'),
    'Snapshot stdin diagram failed',
  );
  const saved = cli([
    'diagram',
    '--input',
    'diagram.sgf',
    '--options',
    'diagram-options.json',
    '--output',
    'diagram.svg',
  ]);
  check(
    saved.output === resolve(directory, 'diagram.svg') && !('svg' in saved),
    'Saved diagram response duplicated SVG or lost the path',
  );
  check(
    (await readFile(saved.output, 'utf8')) === defaultDiagram.svg,
    'Saved diagram differs from JSON SVG',
  );
  check(
    cli(['diagram', '--input', 'diagram.sgf', '--output', 'diagram.svg'], 4).error.code ===
      'output',
    'Existing SVG overwritten without force',
  );
  cli(['diagram', '--state', 'diagram-state.json', '--output', 'diagram.svg', '--force']);
  check((await readFile(saved.output, 'utf8')) === snapshot.svg, 'Forced SVG replacement failed');
  for (const [sourceFlag, input, optionFlag] of [
    ['--input', 'diagram.sgf', undefined],
    ['--state', 'diagram-state.json', undefined],
    ['--input', 'diagram.sgf', 'diagram-options.json'],
  ] as const) {
    const target = optionFlag ?? input;
    check(
      cli(
        [
          'diagram',
          sourceFlag,
          input,
          ...(optionFlag ? ['--options', optionFlag] : []),
          '--output',
          target,
          '--force',
        ],
        4,
      ).error.code === 'output',
      'Diagram overwrote a source/options input',
    );
  }
  check(
    (await readFile(resolve(directory, 'diagram.sgf'), 'utf8')) === sgf &&
      (await readFile(resolve(directory, 'diagram-options.json'), 'utf8')) === options &&
      (await readFile(resolve(directory, 'diagram-state.json'), 'utf8')) === external,
    'Diagram source files changed',
  );
  for (const args of [
    [],
    ['--input', 'diagram.sgf', '--state', 'diagram-state.json'],
    ['--state', 'diagram-state.json', '--game', '0'],
    ['--input', 'diagram.sgf', '--path', '0,-1'],
    ['--input', 'diagram.sgf', '--game', '1e3'],
    ['--input', 'diagram.sgf', '--path', '0,,1'],
    ['--input', '-', '--options', '-'],
    ['--input', 'diagram.sgf', '--force'],
    ['--input', 'diagram.sgf', '--unknown'],
  ])
    check(
      cli(['diagram', ...args], 2, sgf).error.code === 'usage',
      'Invalid diagram usage was accepted',
    );
  for (const args of [
    ['--game', '999'],
    ['--path', '0,99'],
  ])
    check(
      cli(['diagram', '--input', 'diagram.sgf', ...args], 2).error.code === 'input',
      'Missing diagram target was accepted',
    );
  check(
    cli(['diagram', '--input', '-'], 2, 'invalid secret SGF').error.message ===
      'SGF input is invalid, unsupported or exceeds supported limits.',
    'Invalid SGF leaked authored input',
  );
  await writeFile(resolve(directory, 'diagram-invalid.json'), '{"width":0}');
  check(
    cli(['diagram', '--input', 'diagram.sgf', '--options', 'diagram-invalid.json'], 2).error
      .code === 'input',
    'Invalid diagram dimensions were accepted',
  );
  await writeFile(resolve(directory, 'diagram-invalid.json'), '{"width":null,"crop":null}');
  check(
    cli(['diagram', '--input', 'diagram.sgf', '--options', 'diagram-invalid.json'], 2).error
      .code === 'input',
    'Null diagram settings were silently defaulted',
  );
  check(
    cli(['diagram', '--state', '-'], 2, '{broken').error.code === 'input',
    'Invalid snapshot JSON was accepted',
  );
  check(
    cli(['diagram', '--input', 'diagram.sgf', '--output', 'missing/diagram.svg'], 4).error.code ===
      'output',
    'SVG publication failure was not structured',
  );
  const large = JSON.stringify({
    key: 'large',
    width: 52,
    height: 52,
    stones: Array(2704).fill(null),
    markers: Array.from({ length: 2704 }, (_, index) => ({
      kind: 'label',
      point: { x: index % 52, y: Math.floor(index / 52) },
      label: '&'.repeat(1024),
    })),
  });
  check(
    cli(['diagram', '--state', '-', '--output', 'oversized.svg'], 2, large).error.code === 'limit',
    'SVG byte limit was not enforced',
  );
  let partial = false;
  try {
    await access(resolve(directory, 'oversized.svg'));
    partial = true;
  } catch {
    /* Absence is required after rejected rendering. */
  }
  check(!partial, 'Rejected SVG left a partial output');
  const packagePath = resolve(directory, 'node_modules/@0disoft/banora/package.json');
  const originalPackage = await readFile(packagePath, 'utf8');
  try {
    const olderExports = JSON.parse(originalPackage);
    delete olderExports.exports['./diagram'];
    await writeFile(packagePath, JSON.stringify(olderExports));
    check(
      cli(['--help']).ok && cli(['snapshot', '--input', 'diagram-state.json']).ok,
      'Missing optional SDK capability broke existing CLI commands',
    );
    check(
      cli(['diagram', '--input', 'diagram.sgf'], 2).error.message.includes('matching Banora SDK'),
      'Missing SVG capability lacked safe upgrade guidance',
    );
  } finally {
    await writeFile(packagePath, originalPackage);
  }
}
