import { expect, test } from 'bun:test';
import { createBoardSnapshot } from '../src/board-state.js';
import type { BoardSnapshot } from '../src/board-state.js';

const fixture = (): BoardSnapshot => ({
  key: 'document/node/revision',
  width: 3,
  height: 2,
  stones: ['black', null, null, null, null, 'white'],
  toPlay: 'white',
  markers: [{ kind: 'label', point: { x: 0, y: 0 }, label: '<script>host text</script>' }],
  overlays: [{ kind: 'badge', point: { x: 1, y: 1 }, color: '#FFAA00', label: 'A' }],
  visiblePoints: [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
  dimPoints: [{ x: 1, y: 1 }],
});

test('external display data owns frozen copies without a rules engine or record', () => {
  const source = fixture(),
    snapshot = createBoardSnapshot(source);
  (source.stones as (string | null)[])[0] = null;
  (source.markers![0]!.point as { x: number }).x = 2;
  expect(snapshot.stones[0]).toBe('black');
  expect(snapshot.markers[0]!.point.x).toBe(0);
  expect(snapshot.markers[0]!.label).toBe('<script>host text</script>');
  expect(snapshot.overlays[0]!.color).toBe('#ffaa00');
  expect(Object.isFrozen(snapshot.stones)).toBe(true);
  expect(Object.isFrozen(snapshot.overlays[0]!.point)).toBe(true);
  expect(Object.isFrozen(snapshot.visiblePoints![0])).toBe(true);
  expect('rules' in snapshot).toBe(false);
  expect('record' in snapshot).toBe(false);
});
test('all/none masks and bounded host annotations are explicit', () => {
  expect(createBoardSnapshot({ ...fixture(), visiblePoints: undefined }).visiblePoints).toBeNull();
  expect(createBoardSnapshot({ ...fixture(), visiblePoints: [] }).visiblePoints).toEqual([]);
  const snapshot = createBoardSnapshot({
    ...fixture(),
    numbers: [{ point: { x: 0, y: 0 }, value: 42 }],
    connections: [{ kind: 'arrow', from: { x: 0, y: 0 }, to: { x: 2, y: 1 } }],
    strokes: [
      {
        id: 'host-ink',
        points: [
          { x: 0.1, y: 0.5 },
          { x: 2, y: 1 },
        ],
        color: '#112233',
        width: 0.1,
      },
    ],
  });
  expect(snapshot.numbers[0]!.value).toBe(42);
  expect(snapshot.strokes[0]!.points[0]!.x).toBe(0.1);
});
test('malformed host state, sparse arrays and unsafe visual values are rejected', () => {
  const patches: unknown[] = [
    { key: '' },
    { width: 53 },
    { height: NaN },
    { stones: Array(6) },
    { stones: ['black'] },
    { toPlay: 'red' },
    { captures: null },
    { lastMove: { x: 3, y: 0 } },
    {
      visiblePoints: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
    },
    { dimPoints: [{ x: 0.5, y: 1 }] },
    { numbers: [{ point: { x: 0, y: 0 }, value: Infinity }] },
    { connections: [{ kind: 'arrow', from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }] },
    {
      overlays: [
        { kind: 'badge', point: { x: 0, y: 0 }, color: 'url(https://example.test/image)' },
      ],
    },
    { overlays: [{ kind: 'heatmap', point: { x: 0, y: 0 }, color: '#112233', opacity: 2 }] },
    {
      strokes: [
        {
          id: 'bad',
          points: [
            { x: -1, y: 0 },
            { x: 1, y: 1 },
          ],
          color: '#112233',
          width: 0.1,
        },
      ],
    },
  ];
  for (const patch of patches)
    expect(() => createBoardSnapshot({ ...fixture(), ...(patch as object) })).toThrow();
});
