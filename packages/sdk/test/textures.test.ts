import { expect, test } from 'bun:test';
import {
  createStoneTexture,
  normalizeStoneTextures,
  STONE_TEXTURE_LIMITS,
} from '../src/stone-textures.js';

const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=';
const mutate = (edit: (bytes: Buffer) => void) => {
  const bytes = Buffer.from(png.split(',')[1]!, 'base64');
  edit(bytes);
  return 'data:image/png;base64,' + bytes.toString('base64');
};
test('ready texture tiles are immutable headless PNG data with dimensions and defensive option snapshots', () => {
  const texture = createStoneTexture(png);
  expect(texture).toEqual({ dataUrl: png, width: 1, height: 1 });
  expect(Object.isFrozen(texture)).toBe(true);
  expect(STONE_TEXTURE_LIMITS.dimension).toBe(512);
  const source = { black: { dataUrl: png, width: 1, height: 1 } };
  const normalized = normalizeStoneTextures(source);
  source.black.dataUrl = 'changed';
  expect(normalized.black?.dataUrl).toBe(png);
  expect(Object.isFrozen(normalized)).toBe(true);
  expect(Object.isFrozen(normalized.black)).toBe(true);
  expect(normalizeStoneTextures({ black: texture }).black).toBe(texture);
  expect(normalizeStoneTextures(null)).toEqual({ black: null, white: null });
  expect(normalizeStoneTextures({ black: null, white: texture })).toEqual({
    black: null,
    white: texture,
  });
});
test('texture trust boundary rejects external/SVG/malformed images, invalid dimensions and inconsistent options', () => {
  for (const value of [
    'https://example.test/stone.png',
    'blob:foo',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/png;base64,AA==',
    png + 'a',
    png.slice(0, -1),
    png.replace('iVBOR', 'jVBOR'),
    mutate((bytes) => bytes.writeUInt32BE(513, 16)),
    mutate((bytes) => bytes.writeUInt32BE(0, 20)),
    mutate((bytes) => bytes.writeUInt32BE(99, 8)),
    mutate((bytes) => bytes.writeUInt32BE(1, bytes.length - 12)),
    'data:image/png;base64,' + 'A'.repeat(3_000_000),
  ]) {
    expect(() => createStoneTexture(value)).toThrow(RangeError);
  }
  expect(() => normalizeStoneTextures({ black: { dataUrl: png, width: 2, height: 1 } })).toThrow(
    RangeError,
  );
  expect(() => normalizeStoneTextures({ black: png } as never)).toThrow(TypeError);
  expect(() => normalizeStoneTextures({ other: createStoneTexture(png) } as never)).toThrow(
    TypeError,
  );
  expect(() => normalizeStoneTextures([] as never)).toThrow(TypeError);
  const animated = mutate((bytes) => {
    bytes.set([97, 99, 84, 76], 33 + 4);
  });
  expect(() => createStoneTexture(animated)).toThrow('static PNG');
});
