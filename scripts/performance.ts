import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { RecordController } from '@0disoft/banora/controller';
import { parseSgf, serializeSgf } from '@0disoft/banora/sgf';
import type { SgfRecord, SgfResult } from '@0disoft/banora/sgf';
import { createPosition, play, pass } from '@0disoft/banora/core';
import { searchRecord } from '@0disoft/banora/record-search';
import { saveOutput } from '../packages/cli/src/io.js';
import metadata from '../packages/sdk/package.json';

interface Workload {
  name: string;
  sgf: string;
  record: SgfRecord;
  mainIds: string[];
  nodes: number;
  width: number;
  bytes: number;
  commentMatches: number;
}
interface Harness {
  run(): void;
  verify(): void;
  dispose(): void;
}
const assert = (ok: unknown) => {
  if (!ok) throw Error('Benchmark correctness check failed.');
};

/** Authored synthetic legal opening plus passes, not a tournament/engine dataset. */
export function syntheticReview(moves: number): string {
  if (!Number.isInteger(moves) || moves < 1 || moves > 5000)
    throw RangeError('Invalid benchmark size.');
  let position = createPosition(),
    text = '(;FF[4]GM[1]CA[UTF-8]SZ[19]XG[Authored benchmark])';
  const entries = [text.slice(0, -1)];
  for (let index = 0; index < moves; index++) {
    const color = position.toPlay === 'black' ? 'B' : 'W';
    const point = { x: index % 19, y: Math.floor(index / 19) };
    const placed = index < 128 ? play(position, point) : undefined;
    const coordinate = placed?.ok ? String.fromCharCode(97 + point.x, 97 + point.y) : '';
    const moved = placed?.ok ? placed : pass(position);
    if (!moved.ok) throw Error('Benchmark transition failed.');
    position = moved.position;
    entries.push(`;${color}[${coordinate}]${index % 25 === 0 ? 'C[review note]' : ''}`);
  }
  return entries.join('') + ')';
}
function workload(name: string, sgf: string): Workload {
  const parsed = parseSgf(sgf);
  if (!parsed.ok) throw Error('Benchmark fixture rejected.');
  const mainIds: string[] = [],
    pending = [...parsed.record.games];
  let nodes = 0,
    commentMatches = 0;
  while (pending.length) {
    const node = pending.pop()!;
    nodes++;
    if (node.properties.C?.[0]?.toLowerCase().includes('review')) commentMatches++;
    pending.push(...node.children);
  }
  for (let node = parsed.record.games[0]; node; node = node.children[0]) mainIds.push(node.id);
  return {
    name,
    sgf,
    record: parsed.record,
    mainIds,
    nodes,
    width: Number(parsed.record.games[0]!.properties.SZ![0]),
    bytes: Buffer.byteLength(sgf),
    commentMatches,
  };
}
function cases(input: Workload): [string, number, () => Harness][] {
  const controller =
    (
      run: (editor: RecordController) => void,
      verify: (editor: RecordController) => void,
      setup?: (editor: RecordController) => void,
    ): (() => Harness) =>
    () => {
      const editor = new RecordController({ sgf: input.sgf });
      try {
        setup?.(editor);
      } catch (error) {
        editor.dispose();
        throw error;
      }
      return {
        run: () => run(editor),
        verify: () => verify(editor),
        dispose: () => editor.dispose(),
      };
    };
  return [
    [
      'parse',
      1,
      () => {
        let result: SgfResult | undefined;
        return {
          run() {
            result = parseSgf(input.sgf);
          },
          verify() {
            assert(result?.ok);
          },
          dispose() {},
        };
      },
    ],
    [
      'controller-open',
      1,
      () => {
        let editor: RecordController | undefined;
        return {
          run() {
            editor = new RecordController({ sgf: input.sgf });
          },
          verify() {
            assert(editor?.getState().position.width === input.width);
          },
          dispose() {
            editor?.dispose();
          },
        };
      },
    ],
    [
      'serialize',
      1,
      () => {
        let text = '';
        return {
          run() {
            text = serializeSgf(input.record);
          },
          verify() {
            assert(parseSgf(text).ok && text.includes('CA[UTF-8]'));
          },
          dispose() {},
        };
      },
    ],
    [
      'sequential-next',
      input.mainIds.length - 1,
      controller(
        (editor) => {
          for (let index = 1; index < input.mainIds.length; index++) assert(editor.next().ok);
        },
        (editor) => {
          assert(editor.getState().node.id === input.mainIds.at(-1) && !editor.getState().dirty);
        },
      ),
    ],
    [
      'tail-roundtrip',
      40,
      controller(
        (editor) => {
          for (let index = 0; index < 20; index++) assert(editor.next().ok && editor.previous().ok);
        },
        (editor) => {
          assert(editor.getState().node.id === input.mainIds.at(-2) && !editor.getState().dirty);
        },
        (editor) => {
          assert(editor.goTo(input.mainIds.at(-2)!).ok);
        },
      ),
    ],
    [
      'comment-search',
      1,
      () => {
        let total = -1;
        return {
          run() {
            total = searchRecord(input.record, {
              query: 'review',
              properties: ['C'],
              limit: 20,
            }).total;
          },
          verify() {
            assert(total === input.commentMatches);
          },
          dispose() {},
        };
      },
    ],
    [
      'tail-comment-session',
      10,
      controller(
        (editor) => {
          editor.beginEditGroup();
          for (let index = 0; index < 10; index++)
            assert(editor.setComment(`Benchmark tail review ${index}`).ok);
          editor.endEditGroup();
        },
        (editor) => {
          assert(
            editor.getState().node.properties.C?.[0] === 'Benchmark tail review 9' &&
              editor.getState().position.moveNumber === input.mainIds.length - 1 &&
              editor.getState().dirty &&
              editor.undo().ok &&
              !editor.getState().dirty,
          );
        },
        (editor) => {
          assert(editor.goTo(input.mainIds.at(-1)!).ok);
        },
      ),
    ],
    [
      'comment-batch',
      1,
      controller(
        (editor) => {
          assert(
            editor.setComments(
              input.mainIds.slice(0, 25).map((nodeId) => ({ nodeId, text: 'Benchmark review' })),
            ).ok,
          );
        },
        (editor) => {
          assert(
            editor.getState().dirty &&
              editor.getState().canUndo &&
              editor.undo().ok &&
              !editor.getState().dirty,
          );
        },
      ),
    ],
    [
      'checkpoint-restore',
      1,
      () => {
        const source = new RecordController({ sgf: input.sgf });
        assert(source.goTo(input.mainIds.at(-1)!).ok);
        const checkpoint = source.createCheckpoint();
        source.dispose();
        const editor = new RecordController();
        let ok = false;
        return {
          run() {
            ok = editor.loadCheckpoint(checkpoint).ok;
          },
          verify() {
            assert(ok && JSON.stringify(editor.createCheckpoint()) === JSON.stringify(checkpoint));
          },
          dispose() {
            editor.dispose();
          },
        };
      },
    ],
  ];
}
export function measure(name: string, operations: number, setup: () => Harness) {
  const samples: number[] = [];
  for (let index = 0; index < 6; index++) {
    const current = setup();
    try {
      const start = performance.now();
      current.run();
      const elapsed = performance.now() - start;
      current.verify();
      assert(Number.isFinite(elapsed) && elapsed >= 0);
      if (index > 0) samples.push(elapsed);
    } finally {
      current.dispose();
    }
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    name,
    operations,
    samplesMs: samples,
    minMs: sorted[0]!,
    medianMs: sorted[2]!,
    maxMs: sorted[4]!,
  };
}
export async function runPerformance() {
  const fixtures = [
    workload('original-study-9', await readFile('examples/fixtures/study.sgf', 'utf8')),
    workload('authored-review-300', syntheticReview(300)),
    workload('pass-heavy-stress-5000', syntheticReview(5000)),
  ];
  const git = (args: string[]) => {
    const result = spawnSync('git', args, { encoding: 'utf8', timeout: 5000 });
    if (result.status !== 0) throw Error('Cannot identify benchmark worktree.');
    return result.stdout.trim();
  };
  return {
    schemaVersion: 'banora.performance/v1',
    sdkVersion: metadata.version,
    runtime: { node: process.versions.node, platform: process.platform, arch: process.arch },
    source: {
      commit: git(['rev-parse', 'HEAD']),
      dirty: !!git(['status', '--porcelain']),
      controllerSha256: createHash('sha256')
        .update(await readFile('packages/sdk/src/controller.ts'))
        .digest('hex'),
    },
    method: {
      warmups: 1,
      samples: 5,
      timing:
        'Synchronous SDK work; setup/assertions after run/disposal excluded. Navigation success checks inside run.',
      scope:
        'Desktop Node only; generated workloads are authored stress fixtures, not real games or browser frame latency. No performance pass/fail threshold.',
    },
    workloads: fixtures.map(({ name, nodes, width, bytes, commentMatches, mainIds, ...input }) => ({
      name,
      nodes,
      width,
      bytes,
      commentMatches,
      mainNodes: mainIds.length,
      cases: cases({ name, nodes, width, bytes, commentMatches, mainIds, ...input }).map(
        ([caseName, operations, setup]) => measure(caseName, operations, setup),
      ),
    })),
    memory: {
      ...process.memoryUsage(),
      scope: 'Process snapshot after workloads, not per-operation allocation or peak.',
    },
  };
}
if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    if (
      args.length &&
      (args.length !== 2 || args[0] !== '--output' || !args[1] || args[1].startsWith('--'))
    )
      throw Error('Expected optional --output FILE.');
    const report = await runPerformance(),
      text = JSON.stringify(report, null, 2) + '\n';
    if (args[1]) await saveOutput(args[1], text, ['examples/fixtures/study.sgf'], false);
    process.stdout.write(text);
  } catch {
    process.exitCode = 1;
    process.stdout.write(
      JSON.stringify({
        schemaVersion: 'banora.performance/v1',
        ok: false,
        error: 'Benchmark or exclusive report publication failed.',
      }) + '\n',
    );
  }
}
