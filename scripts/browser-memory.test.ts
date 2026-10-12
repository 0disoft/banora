import { expect, test } from 'bun:test';
import { validateMemoryReport } from './browser-memory.js';

function fixture() {
  const metric = (controllers?: number) => ({
    heapBytes: 1000,
    documents: 1,
    nodes: 10,
    listeners: 0,
    controllers,
  });
  return {
    browserVersion: 'test',
    viewport: { width: 1280, height: 900 },
    warmups: 3,
    iterations: 15,
    cases: [
      'framework/react',
      'framework/vue',
      'framework/svelte',
      ...[300, 5000].flatMap((moves) => [
        `viewer/owned/${moves}`,
        `viewer/borrowed/${moves}`,
        `studio/${moves}`,
      ]),
    ].map((id) => ({
      id,
      baseline: metric(id.startsWith('viewer/') ? (id.includes('/borrowed/') ? 2 : 1) : undefined),
      samples: Array.from({ length: 15 }, (_, index) => ({
        iteration: index + 1,
        active: metric(id.startsWith('viewer/') ? 2 : undefined),
        released: metric(
          id.startsWith('viewer/') ? (id.includes('/borrowed/') ? 2 : 1) : undefined,
        ),
      })),
    })),
  };
}
test('memory evidence requires every lifecycle and ordered active/released measurement', () => {
  const valid = fixture();
  expect(validateMemoryReport(valid)).toBe(valid);
  for (const mutate of [
    (value: ReturnType<typeof fixture>) => {
      value.cases.pop();
    },
    (value: ReturnType<typeof fixture>) => {
      value.cases[1]!.id = value.cases[0]!.id;
    },
    (value: ReturnType<typeof fixture>) => {
      value.cases[0]!.samples.pop();
    },
    (value: ReturnType<typeof fixture>) => {
      value.cases[0]!.samples[0]!.iteration = 2;
    },
    (value: ReturnType<typeof fixture>) => {
      value.cases[0]!.samples[1]!.active.heapBytes = NaN;
    },
    (value: ReturnType<typeof fixture>) => {
      value.cases[0]!.samples[1]!.released.heapBytes = 0;
    },
    (value: ReturnType<typeof fixture>) => {
      value.cases[0]!.baseline.listeners = -1;
    },
    (value: ReturnType<typeof fixture>) => {
      value.cases[0]!.baseline.nodes = 1.5;
    },
    (value: ReturnType<typeof fixture>) => {
      value.warmups = 0;
    },
    (value: ReturnType<typeof fixture>) => {
      value.cases[3]!.samples[0]!.released.controllers = 2;
    },
    (value: ReturnType<typeof fixture>) => {
      value.cases[4]!.baseline.controllers = 1;
    },
    (value: ReturnType<typeof fixture>) => {
      value.cases[3]!.samples[0]!.active.controllers = undefined;
    },
  ]) {
    const value = fixture();
    mutate(value);
    expect(() => validateMemoryReport(value)).toThrow('Incomplete or invalid');
  }
});
