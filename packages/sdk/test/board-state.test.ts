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
test.each(['stones', 'overlays'] as const)(
  'snapshot %s copy cannot exceed its indexed length through an iterator',
  (field) => {
    const source = fixture(),
      values = source[field]!;
    let yielded = 0;
    Object.defineProperty(values, Symbol.iterator, {
      value: function* () {
        for (let index = 0; index < 10_000; index++) {
          yielded++;
          yield values[0];
        }
      },
    });
    const snapshot = createBoardSnapshot(source);
    expect(snapshot[field]).toHaveLength(values.length);
    expect(yielded).toBe(0);
  },
);

const collectionBounds = {
  stones: 6,
  numbers: 6,
  markers: 4096,
  connections: 4096,
  strokes: 64,
  visiblePoints: 6,
  dimPoints: 6,
  overlays: 8192,
} as const;

test.each(Object.entries(collectionBounds))(
  'snapshot %s rejects invalid lengths before any indexed read',
  (field, maximum) => {
    for (const length of [maximum + 1, -1, 1.5, NaN, Infinity]) {
      let lengths = 0,
        indices = 0;
      const values = new Proxy([], {
        get(target, key, receiver) {
          if (key === 'length') {
            lengths++;
            return length;
          }
          if (key === '0') indices++;
          return Reflect.get(target, key, receiver);
        },
      });
      expect(() => createBoardSnapshot({ ...fixture(), [field]: values })).toThrow(RangeError);
      expect(lengths).toBe(1);
      expect(indices).toBe(0);
    }
  },
);

test.each(Object.keys(collectionBounds))(
  'snapshot %s cannot hide sparse or invalid indexed data with an iterator',
  (field) => {
    for (const sparse of [true, false]) {
      const values = new Array(field === 'stones' ? 6 : 1);
      if (!sparse) values.fill(undefined);
      Object.defineProperty(values, Symbol.iterator, { value: function* () {} });
      expect(() => createBoardSnapshot({ ...fixture(), [field]: values })).toThrow(TypeError);
    }
  },
);

test('snapshot captures the stone source, length and each indexed color once', () => {
  const colors: BoardSnapshot['stones'] = ['black', null, null, null, null, 'white'];
  let sources = 0,
    lengths = 0;
  const reads = Array(6).fill(0);
  const values = new Proxy(colors, {
    get(target, key, receiver) {
      if (key === 'length') return ++lengths === 1 ? 6 : 10_000;
      if (typeof key === 'string' && /^[0-5]$/.test(key)) reads[Number(key)]++;
      return Reflect.get(target, key, receiver);
    },
  });
  const snapshot = createBoardSnapshot({
    ...fixture(),
    get stones() {
      sources++;
      return values as BoardSnapshot['stones'];
    },
  });
  expect(snapshot.stones).toEqual(colors);
  expect([sources, lengths]).toEqual([1, 1]);
  expect(reads).toEqual(Array(6).fill(1));
});

test('snapshot accepts exact collection limits without invoking host array hooks', () => {
  const points = Array.from({ length: 6 }, (_, index) => ({
    x: index % 3,
    y: Math.floor(index / 3),
  }));
  const source: BoardSnapshot = {
    ...fixture(),
    numbers: points.map((point) => ({ point, value: 1 })),
    markers: Array(4096).fill({ kind: 'circle', point: points[0] }),
    connections: Array(4096).fill({ kind: 'line', from: points[0], to: points[1] }),
    strokes: Array.from({ length: 64 }, (_, index) => ({
      id: `s${index}`,
      points: points.slice(0, 2),
      color: '#112233',
      width: 0.1,
    })),
    visiblePoints: points,
    dimPoints: [...points],
    overlays: Array(8192).fill({ kind: 'badge', point: points[0], color: '#112233' }),
  };
  let hooks = 0;
  const hostile = () => {
    hooks++;
    throw Error('Host array hook executed');
  };
  for (const values of Object.values(source))
    if (Array.isArray(values))
      Object.defineProperties(values, {
        [Symbol.iterator]: { get: hostile },
        map: { value: hostile },
        constructor: { get: hostile },
      });
  const snapshot = createBoardSnapshot(source);
  for (const [field, maximum] of Object.entries(collectionBounds))
    expect(snapshot[field as keyof typeof collectionBounds]).toHaveLength(maximum);
  expect(hooks).toBe(0);
  expect(Object.isFrozen(snapshot.overlays)).toBe(true);
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
