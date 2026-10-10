import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {RecordController} from '@banora/sdk/controller';
import {AnalysisSession} from '@banora/sdk/analysis';
import type {AnalysisCompletion, AnalysisResult} from '@banora/sdk/analysis';
import {pass, play} from '@banora/sdk/core';
import type {Point, Position} from '@banora/sdk/core';
import type {KataGoPerspective} from '@banora/sdk/katago';
import {getRuleProfile} from '@banora/sdk/rules';
import type {RuleProfileId} from '@banora/sdk/rules';
import {startLocalKataGo} from '../examples/katago-cli/process.js';

const [binaryInput, modelInput] = process.argv.slice(2);
if (!binaryInput || !modelInput) throw Error('Usage: bun run smoke:katago <engine-path> <model-path>');
const binary = resolve(binaryInput), model = resolve(modelInput);
const root = resolve(import.meta.dirname, '..');
await mkdir(resolve(root, '.tmp'), {recursive: true});
const directory = await mkdtemp(resolve(root, '.tmp/live-katago-'));
const baseConfig = await readFile(resolve(root, 'examples/katago-cli/analysis.cfg'), 'utf8');
const version = execFileSync(binary, ['version'], {encoding: 'utf8', windowsHide: true, timeout: 5_000}).trim();
const modelHash = createHash('sha256');
for await (const chunk of createReadStream(model)) modelHash.update(chunk);
const evidence: Record<string, unknown> = {
  engine: version, engineSha256: createHash('sha256').update(await readFile(binary)).digest('hex'),
  modelSha256: modelHash.digest('hex'),
  runtime: typeof Bun === 'undefined' ? `Node ${process.version}` : `Bun ${Bun.version}`,
  nodeInstalledVersion: execFileSync('node', ['--version'], {encoding: 'utf8', windowsHide: true, timeout: 5_000}).trim(),
  cases: [] as unknown[], scopes: ['headless local stdio', 'selected engine/model/config only'],
};

interface WireMetrics {winrate: number; scoreLead: number; visits: number}
interface WireCandidate extends WireMetrics {move: string; order: number; pv: string[]}
interface Wire {
  id: string; action?: string; terminateId?: string; turnNumbers?: number[];
  turnNumber?: number; isDuringSearch?: boolean; rootInfo?: WireMetrics & {currentPlayer: 'B' | 'W'};
  moveInfos?: WireCandidate[]; ownership?: number[]; warning?: unknown; error?: unknown;
  initialStones?: [string, string][]; initialPlayer?: string; moves?: [string, string][];
  boardXSize?: number; boardYSize?: number; komi?: number;
}
const fixtures: {name: string; sgf: string; profile: RuleProfileId}[] = [
  {name: 'black-9x9', sgf: '(;SZ[9]KM[6.5]C[private note]PB[private player])', profile: 'japanese-territory'},
  {name: 'white-history', sgf: '(;SZ[9]KM[6.5];B[gc])', profile: 'japanese-territory'},
  {name: 'rectangular-setup', sgf: '(;SZ[5:7]KM[0.5]AB[bb]AW[bd]PL[W];W[aa])', profile: 'japanese-territory'},
  {name: 'capture-and-pass', sgf: '(;SZ[5]KM[0.5]AW[bb]AB[ab][ba][cb];B[bc];W[ee];B[])', profile: 'japanese-territory'},
  {name: 'setup-retained-capture', sgf: '(;SZ[5]KM[6.5]AW[bb]AB[ab][ba][cb];B[bc];AB[dd]PL[W];W[ee])', profile: 'japanese-territory'},
  {name: 'aga-area-handicap', sgf: '(;SZ[9]KM[7.5]HA[3]AB[cc][gg][cg]PL[W];W[])', profile: 'aga-area'},
  {name: 'tromp-taylor', sgf: '(;SZ[9]KM[7.5];B[gc];W[cg])', profile: 'tromp-taylor'},
];

function point(value: string, position: Position): Point | null {
  if (value.toLowerCase() === 'pass') return null;
  const match = /^([A-HJ-Z])([1-9][0-9]*)$/.exec(value);
  assert(match, `Unexpected live coordinate ${value}`);
  return {x: 'ABCDEFGHJKLMNOPQRSTUVWXYZ'.indexOf(match[1]!), y: position.height - Number(match[2])};
}
function verifyResult(result: AnalysisResult, raw: Wire, position: Position, perspective: KataGoPerspective): void {
  assert(raw.rootInfo && raw.moveInfos && raw.ownership);
  assert.equal(raw.isDuringSearch, false);
  assert.equal(raw.rootInfo.currentPlayer, position.toPlay === 'black' ? 'B' : 'W');
  const black = perspective === 'black' || (perspective === 'to-play' && position.toPlay === 'black');
  const metrics = (output: {winProbabilityBlack: number; scoreLeadBlack: number; visits: number}, input: WireMetrics) => {
    assert.equal(output.winProbabilityBlack, black ? input.winrate : 1 - input.winrate);
    assert.equal(output.scoreLeadBlack, black ? input.scoreLead : -input.scoreLead);
    assert.equal(output.visits, input.visits);
  };
  metrics(result.root, raw.rootInfo);
  assert(result.root.visits > 0 && result.candidates.length > 0);
  assert.equal(result.candidates.length, raw.moveInfos.length);
  assert.equal(result.ownership?.length, position.width * position.height);
  assert.deepEqual(result.ownership, raw.ownership.map(value => black ? value : -value));
  const sign = position.toPlay === 'black' ? 1 : -1;
  const best = Math.max(...result.candidates.map(candidate => sign * candidate.scoreLeadBlack));
  for (const candidate of result.candidates) {
    const input: WireCandidate | undefined = raw.moveInfos.find(value => value.order === candidate.rank);
    assert(input);
    metrics(candidate, input);
    assert.deepEqual(candidate.move, point(input.move, position));
    assert.deepEqual(candidate.principalVariation, input.pv.map(value => point(value, position)));
    assert.equal(candidate.scoreLoss, Math.max(0, best - sign * candidate.scoreLeadBlack));
    let current = position;
    for (const step of candidate.principalVariation) {
      const legal = step === null ? pass(current) : play(current, step);
      assert(legal.ok, 'Live PV must replay legally');
      current = legal.position;
    }
  }
}
async function deadline<T>(work: Promise<T>, label: string, ms = 25_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {timer = setTimeout(() => reject(Error(`${label} timed out`)), ms);})]);
  } finally {clearTimeout(timer);}
}

for (const perspective of ['black', 'white', 'to-play'] as const) {
  const cwd = resolve(directory, perspective);
  await mkdir(cwd);
  const config = baseConfig.replace(/^reportAnalysisWinratesAs = BLACK$/m,
    `reportAnalysisWinratesAs = ${perspective === 'to-play' ? 'SIDETOMOVE' : perspective.toUpperCase()}`);
  await writeFile(resolve(cwd, 'analysis.cfg'), config);
  const inputs: Wire[] = [], outputs: Wire[] = [];
  const listeners = new Set<() => void>();
  let stderr = '';
  const engine = startLocalKataGo({binary, model, config: resolve(cwd, 'analysis.cfg'), cwd, perspective,
    onStdinLine: line => {inputs.push(JSON.parse(line) as Wire);},
    onStdoutLine: line => {outputs.push(JSON.parse(line) as Wire); for (const notify of listeners) notify();},
    onStderr: text => {stderr = (stderr + text).slice(-65_536);},
  });
  function wire(predicate: (value: Wire) => boolean): Promise<Wire> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return new Promise((resolve, reject) => {
      const check = () => {
        const found = outputs.find(predicate);
        if (found) {clearTimeout(timer); listeners.delete(check); resolve(found);}
      };
      listeners.add(check);
      timer = setTimeout(() => {listeners.delete(check); reject(Error('Expected live engine response did not arrive'));}, 8_000);
      check();
    });
  }
  try {
    for (const fixture of fixtures) {
      const controller = new RecordController({sgf: fixture.sgf, rules: getRuleProfile(fixture.profile).play});
      while (controller.getState().node.children.length) controller.next();
      const before = controller.getState(), sgf = controller.prepareExport().text;
      const analysis = new AnalysisSession(controller, engine.provider, {profile: fixture.profile});
      try {
        const count = inputs.length;
        assert.equal(analysis.getState().status, 'idle');
        assert.equal(inputs.length, count, 'Creating a session must send nothing');
        const completion = await deadline(analysis.request({maxVisits: 32, maxPvLength: 6, includeOwnership: true}), fixture.name);
        assert(completion.ok, `Live ${perspective}/${fixture.name}: ${JSON.stringify(completion)}`);
        const raw = outputs.find(value => value.id === completion.result.requestId && value.isDuringSearch === false);
        const sent = inputs.find(value => value.id === completion.result.requestId);
        assert(raw && sent);
        assert.equal(raw.turnNumber, analysis.getState().context!.moves.length);
        assert.equal(sent.boardXSize, before.position.width);
        assert.equal(sent.boardYSize, before.position.height);
        assert(!JSON.stringify(sent).includes('private'), 'Private comments/player names leaked into engine input');
        if (fixture.name === 'setup-retained-capture') assert.equal(sent.komi, 5.5);
        if (fixture.name === 'aga-area-handicap') assert.equal(sent.komi, 9.5);
        verifyResult(completion.result, raw, before.position, perspective);
        assert.equal(controller.getState(), before, 'Analysis changed the source state');
        assert.equal(controller.prepareExport().text, sgf, 'Analysis changed source SGF');
        (evidence.cases as unknown[]).push({perspective, fixture: fixture.name, visits: completion.result.root.visits,
          candidates: completion.result.candidates.length, ownership: completion.result.ownership!.length});
      } finally {analysis.dispose(); controller.dispose();}
    }

    // These requests reach the real process, which acknowledges scoped termination.
    for (const action of ['cancel', 'stale', 'dispose'] as const) {
      const controller = new RecordController({sgf: '(;SZ[9]KM[6.5])'});
      const analysis = new AnalysisSession(controller, engine.provider, {profile: 'japanese-territory'});
      try {
        const pending = analysis.request({maxVisits: 1_000_000, maxPvLength: 6});
        const requestId = analysis.getState().requestId!;
        if (action === 'cancel') analysis.cancel();
        else if (action === 'stale') assert(controller.play({x: 0, y: 0}).ok);
        else analysis.dispose();
        const settled = await deadline(pending, action, 1_000);
        const expectedReason = action === 'cancel' ? 'cancelled' : action === 'dispose' ? 'disposed' : 'stale';
        assert(!settled.ok && settled.reason === expectedReason, `Live ${action} settled as ${JSON.stringify(settled)}`);
        const state = action === 'dispose' ? null : analysis.getState();
        const ack = await wire(value => value.action === 'terminate' && value.terminateId === requestId);
        assert.deepEqual(ack.turnNumbers, [0]);
        await wire(value => value.id === requestId && value.isDuringSearch === false);
        if (state) assert.equal(analysis.getState(), state, 'Late engine reply revived cancelled/stale state');
        (evidence.cases as unknown[]).push({perspective, fixture: action, immediateSettlement: true, terminateAcknowledged: true, lateFinalIgnored: true});
      } finally {analysis.dispose(); controller.dispose();}
    }

    // A stopped host settles active work and leaves the borrowed record usable.
    const controller = new RecordController({size: 9});
    const analysis = new AnalysisSession(controller, engine.provider, {profile: 'japanese-territory'});
    try {
      const pending = analysis.request({maxVisits: 1_000_000});
      await deadline(engine.stop(), 'engine stop', 7_000);
      const stopped: AnalysisCompletion = await deadline(pending, 'stopped work', 1_000);
      assert(!stopped.ok && stopped.reason === 'disposed');
      assert.equal((await engine.exited).code, 0);
      assert(controller.play({x: 0, y: 0}).ok);
      (evidence.cases as unknown[]).push({perspective, fixture: 'host-stop', exitCode: 0, borrowedRecordUsable: true});
    } finally {analysis.dispose(); controller.dispose();}
    await writeFile(resolve(cwd, 'transcript.json'), JSON.stringify({config, inputs, outputs, stderr}, null, 2) + '\n');
    console.log(`Live KataGo ${perspective}: seven contexts, cancel/stale/dispose/stop passed.`);
  } catch (error) {
    await writeFile(resolve(cwd, 'failure.json'), JSON.stringify({inputs, outputs, stderr, error: String(error)}, null, 2) + '\n');
    throw error;
  } finally {await engine.stop();}
}

for (const failure of ['missing-binary', 'missing-model'] as const) {
  const cwd = resolve(directory, failure);
  await mkdir(cwd);
  const engine = startLocalKataGo({
    binary: failure === 'missing-binary' ? resolve(cwd, 'absent-engine') : binary,
    model: failure === 'missing-model' ? resolve(cwd, 'absent-model.gz') : model,
    config: resolve(root, 'examples/katago-cli/analysis.cfg'), cwd, perspective: 'black',
  });
  const controller = new RecordController({size: 9});
  const analysis = new AnalysisSession(controller, engine.provider, {profile: 'japanese-territory'});
  try {
    const failed = await deadline(analysis.request(), failure, 5_000);
    assert(!failed.ok && failed.reason === 'provider');
    assert(!failed.message.includes(cwd), 'Raw process paths leaked into the SDK error');
    await deadline(engine.stop(), `${failure} cleanup`, 7_000);
    assert.notEqual((await engine.exited).code, 0);
    (evidence.cases as unknown[]).push({fixture: failure, pendingSettled: true, errorRedacted: true, processClosed: true});
  } finally {analysis.dispose(); controller.dispose(); await engine.stop();}
}

await writeFile(resolve(directory, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(`Live KataGo: ${(evidence.cases as unknown[]).length} cases passed; evidence ${directory}`);
