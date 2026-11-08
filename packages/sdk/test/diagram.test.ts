import { expect, test } from 'bun:test';
import { renderDiagramSvg, DIAGRAM_SVG_LIMITS } from '../src/diagram.js';
import type { DiagramSvgOptions } from '../src/diagram.js';
import type { BoardSnapshot } from '../src/board-state.js';
import { createPosition, play } from '../src/core.js';
import { RecordController } from '../src/controller.js';
import { serializeSgf } from '../src/sgf.js';

const fixture = (): BoardSnapshot => ({
  key: 'diagram/1',
  width: 3,
  height: 2,
  stones: ['black', null, null, null, null, 'white'],
  numbers: [
    { point: { x: 0, y: 0 }, value: 7 },
    { point: { x: 2, y: 1 }, value: 8 },
  ],
  markers: [{ kind: 'triangle', point: { x: 1, y: 1 } }],
  connections: [{ kind: 'arrow', from: { x: 0, y: 0 }, to: { x: 2, y: 1 } }],
  overlays: [{ kind: 'badge', point: { x: 1, y: 0 }, label: 'A', color: '#123456' }],
  strokes: [
    {
      id: 'ink',
      points: [
        { x: 0.2, y: 0.3 },
        { x: 2, y: 1 },
      ],
      color: '#112233',
      width: 0.1,
    },
  ],
});

test('headless snapshots are deterministic, immutable and contain only static standalone SVG', () => {
  const source = fixture();
  const before = JSON.stringify(source);
  const options = Object.freeze({ width: 450, theme: 'flat' as const, moveNumbers: true });
  const svg = renderDiagramSvg(source, options);
  expect(svg).toBe(renderDiagramSvg(source, options));
  expect(JSON.stringify(source)).toBe(before);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(svg).toContain('width="450" height="350" viewBox="0 0 4.5 3.5"');
  expect(svg.match(/data-stone=/g)).toHaveLength(2);
  expect(svg.match(/data-move-number=/g)).toHaveLength(2);
  expect(svg).toContain('>7</text>');
  expect(svg).toContain('<polygon ');
  expect(svg).toContain('<polyline ');
  expect(svg).toContain('fill="#e8e1ce"');
  expect(svg).not.toMatch(
    /var\(|<image|<script|\shref=|\son[a-z]+=|data-cursor|data-preview|tabindex/,
  );
});

test('rules positions require no record or DOM and keep their owned history untouched', () => {
  const result = play(createPosition({ width: 3, height: 2 }), { x: 1, y: 1 });
  if (!result.ok) throw Error('Invalid fixture');
  const before = result.position;
  expect(renderDiagramSvg(before)).toContain('data-stone="1,1"');
  expect(renderDiagramSvg(before, { moveNumbers: true })).not.toContain('data-move-number');
  expect(result.position).toBe(before);
  expect(before.moveNumber).toBe(1);
});

test('selected record paths preserve MN, passes, branches, annotations and SGF ownership', () => {
  const controller = new RecordController({
    sgf: '(;SZ[5]XX[preserve];B[aa]MN[7];W[];B[bb](;W[cc]TR[aa]LB[bb:Hello])(;W[dd]))',
  });
  try {
    for (let index = 0; index < 4; index++) expect(controller.next().ok).toBe(true);
    const before = controller.getState(),
      sgf = serializeSgf(before.record);
    const svg = renderDiagramSvg(before, { moveNumbers: true });
    for (const number of [7, 9, 10]) expect(svg).toContain(`>${number}</text>`);
    expect(svg).not.toContain('>8</text>');
    expect(svg).toContain('Hello');
    expect(svg).toContain('data-stone="2,2"');
    expect(svg).not.toContain('data-stone="3,3"');
    expect(controller.getState()).toBe(before);
    expect(serializeSgf(controller.getState().record)).toBe(sgf);
    expect(() =>
      renderDiagramSvg(
        { ...before, path: [...before.path.slice(0, -1), 'missing'] },
        { moveNumbers: true },
      ),
    ).toThrow('does not exist');
    expect(() =>
      renderDiagramSvg({ ...before, node: before.record.games[0]! }, { moveNumbers: true }),
    ).toThrow('does not match');
  } finally {
    controller.dispose();
  }
});

test('captures, replayed intersections and setup removals cannot retain old stone numbers', () => {
  const capture = new RecordController({ sgf: '(;SZ[3];B[ab];W[aa];B[ba];W[];B[aa])' });
  const setup = new RecordController({ sgf: '(;SZ[5];B[aa];W[bb];AE[aa]AW[cc])' });
  try {
    for (let index = 0; index < 5; index++) expect(capture.next().ok).toBe(true);
    const svg = renderDiagramSvg(capture.getState(), { moveNumbers: true, coordinates: false });
    expect(svg).toContain('>5</text>');
    expect(svg).not.toContain('>2</text>');
    expect(svg).not.toContain('>4</text>');
    for (let index = 0; index < 3; index++) expect(setup.next().ok).toBe(true);
    const edited = renderDiagramSvg(setup.getState(), { moveNumbers: true, coordinates: false });
    expect(edited).not.toContain('>1</text>');
    expect(edited).toContain('>2</text>');
    expect(edited).toContain('data-stone="2,2"');
    expect(edited.match(/data-move-number=/g)).toHaveLength(1);
  } finally {
    capture.dispose();
    setup.dispose();
  }
});

test('XML text and attribute escaping neutralizes authored markup and replaces forbidden XML scalars', () => {
  const value = '</title><script onload="bad">&\u0000\uD800😀';
  const svg = renderDiagramSvg(
    { ...fixture(), markers: [{ kind: 'label', point: { x: 0, y: 0 }, label: value }] },
    { title: value },
  );
  expect(svg).toContain('&lt;/title&gt;&lt;script onload=&quot;bad&quot;&gt;&amp;��😀');
  expect(svg).not.toContain('<script');
  expect(svg).not.toContain('\u0000');
  expect(/[\uD800-\uDFFF]/u.test(svg)).toBe(false);
});

test('rectangular rotations, reflection, crop, masks and dimming preserve logical coordinates', () => {
  const source = {
    ...fixture(),
    visiblePoints: [
      { x: 0, y: 0 },
      { x: 2, y: 1 },
    ],
    dimPoints: [{ x: 2, y: 1 }],
  };
  const options = {
    height: 450,
    transform: { rotation: 90 as const, flipX: true },
    idPrefix: 'chapter-1',
  };
  const svg = renderDiagramSvg(source, options);
  expect(svg).toContain('width="350" height="450"');
  expect(svg).toContain('<clipPath id="chapter-1-');
  expect(svg).toContain('data-dim="2,1"');
  expect(svg).toContain('data-stone="0,0"');
  expect(svg).toContain('data-stone="2,1"');
  expect(svg).toBe(renderDiagramSvg(source, options));
  const cropped = renderDiagramSvg(source, {
    crop: { x: 2, y: 1, width: 1, height: 1 },
    width: 100,
    coordinates: false,
  });
  expect(cropped).toContain('width="100" height="100" viewBox="2 1 2.5 2.5"');
  expect(cropped.match(/data-stone=/g)).toHaveLength(1);
  expect(cropped).not.toContain('data-coordinate');
  const hidden = renderDiagramSvg({ ...fixture(), visiblePoints: [] });
  expect(hidden).toContain('clipPathUnits="userSpaceOnUse"></clipPath>');
  expect(hidden).toContain('data-board-surface');
});

test('diagram limits include exact pixel boundaries and reject invalid geometry and options', () => {
  const source = fixture();
  expect(renderDiagramSvg(source, { width: 8192, height: 2048 })).toContain('width="8192"');
  expect(renderDiagramSvg(source, { width: 1, height: 1 })).toContain('width="1" height="1"');
  expect(renderDiagramSvg(source, { title: 'a'.repeat(1024) })).toContain('a'.repeat(1024));
  const invalid: unknown[] = [
    { width: 0 },
    { width: null },
    { height: null },
    { width: '640' },
    { height: true },
    { crop: null },
    { crop: [] },
    { transform: null },
    { transform: false },
    { transform: [] },
    { width: 8193 },
    { width: Infinity },
    { width: 1.5 },
    { width: 8192, height: 2049 },
    { title: 'a'.repeat(1025) },
    { title: 4 },
    { theme: 'external' },
    { coordinates: 1 },
    { moveNumbers: 'yes' },
    { idPrefix: 'a" onload="bad' },
    { unknown: true },
    null,
    [],
    { transform: { rotation: 45 } },
    { crop: { x: -1, y: 0, width: 1, height: 1 } },
    { crop: { x: 2, y: 1, width: 2, height: 1 } },
  ];
  for (const options of invalid)
    expect(() => renderDiagramSvg(source, options as DiagramSvgOptions)).toThrow();
  expect(() => renderDiagramSvg({ ...source, stones: [] })).toThrow();
  expect(() => renderDiagramSvg(null as unknown as BoardSnapshot)).toThrow();
});

test('valid multibyte annotations cannot exceed the independent SVG byte budget', () => {
  expect(DIAGRAM_SVG_LIMITS.maxBytes).toBe(8_388_608);
  const source: BoardSnapshot = {
    key: 'large',
    width: 52,
    height: 52,
    stones: Array(52 * 52).fill(null),
    markers: Array.from({ length: 52 * 52 }, (_, index) => ({
      kind: 'label',
      point: { x: index % 52, y: Math.floor(index / 52) },
      label: '漢'.repeat(1024),
    })),
  };
  expect(() => renderDiagramSvg(source)).toThrow('exceeds 8 MiB');
});
