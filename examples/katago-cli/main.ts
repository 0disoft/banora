import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {RecordController} from '@banora/sdk/controller';
import {AnalysisSession} from '@banora/sdk/analysis';
import {startLocalKataGo} from './process.js';

const [binary, model] = process.argv.slice(2);
if (!binary || !model) throw Error('Usage: bun run example:katago <engine-path> <model-path>');
const root = resolve(import.meta.dirname, '../..');
const cwd = resolve(root, '.tmp/katago-example');
await mkdir(cwd, {recursive: true});
const engine = startLocalKataGo({
  binary: resolve(binary), model: resolve(model), config: resolve(import.meta.dirname, 'analysis.cfg'),
  cwd, perspective: 'black', onStderr: text => process.stderr.write(text),
});
const controller = new RecordController({sgf: '(;SZ[9]KM[6.5];B[gc];W[cg])'});
controller.next(); controller.next();
const analysis = new AnalysisSession(controller, engine.provider, {profile: 'japanese-territory'});
let timeout: ReturnType<typeof setTimeout> | undefined;
const interrupted = () => {analysis.cancel(); void engine.stop();};
process.once('SIGINT', interrupted);
process.once('SIGTERM', interrupted);
try {
  timeout = setTimeout(interrupted, 30_000);
  const result = await analysis.request({maxVisits: 32, maxPvLength: 6, includeOwnership: true});
  if (!result.ok) throw Error(`Analysis failed: ${result.reason}: ${result.message}`);
  console.log(JSON.stringify({
    perspective: 'black', root: result.result.root, candidates: result.result.candidates,
    ownershipPoints: result.result.ownership?.length,
  }, null, 2));
} finally {
  clearTimeout(timeout);
  process.removeListener('SIGINT', interrupted);
  process.removeListener('SIGTERM', interrupted);
  analysis.dispose();
  controller.dispose();
  await engine.stop();
}
