import { createStoneTexture, pngDimensions, STONE_TEXTURE_LIMITS } from './stone-textures.js';
import type { StoneTexture } from './stone-textures.js';

export interface TexturePreparationOptions {
  /** Square output tile, 16 through 512 pixels; defaults to 256. */
  readonly size?: number;
  readonly signal?: AbortSignal;
}

/** Explicit browser decoding/rasterization of a host-selected Blob. Never fetches a URL. */
export async function prepareStoneTexture(
  input: Blob,
  options: TexturePreparationOptions = {},
): Promise<StoneTexture> {
  const { signal } = options,
    size = options.size ?? 256;
  const cancelled = () => new DOMException('Texture preparation cancelled', 'AbortError');
  if (signal?.aborted) throw cancelled();
  if (!Number.isInteger(size) || size < 16 || size > STONE_TEXTURE_LIMITS.dimension)
    throw new RangeError('Texture size must be 16 through 512 pixels');
  if (
    !input ||
    typeof input.arrayBuffer !== 'function' ||
    !Number.isSafeInteger(input.size) ||
    input.size < 1 ||
    input.size > STONE_TEXTURE_LIMITS.bytes ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(input.type)
  )
    throw new RangeError('Choose a PNG, JPEG or WebP image of at most 2 MiB');
  if (typeof document === 'undefined')
    throw new Error('Texture preparation requires a browser document');
  const image = document.createElement('img'),
    canvas = document.createElement('canvas');
  return new Promise((resolve, reject) => {
    let settled = false,
      url: string | undefined;
    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
      image.onload = image.onerror = null;
      image.removeAttribute('src');
      if (url) URL.revokeObjectURL(url);
      canvas.width = canvas.height = 0;
    };
    const fail = (error: unknown) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(error);
      }
    };
    const cancel = () => fail(cancelled());
    const timeout = setTimeout(() => fail(new Error('Texture preparation timed out')), 10_000);
    signal?.addEventListener('abort', cancel, { once: true });
    image.onerror = () => fail(new Error('Could not decode the stone texture'));
    image.onload = () => {
      if (settled) return;
      try {
        const width = image.naturalWidth,
          height = image.naturalHeight;
        if (
          !width ||
          !height ||
          width > STONE_TEXTURE_LIMITS.sourceDimension ||
          height > STONE_TEXTURE_LIMITS.sourceDimension
        )
          throw new RangeError('Source texture dimensions must be 1 through 4096 pixels');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Texture preparation requires a 2D canvas');
        canvas.width = canvas.height = size;
        const edge = Math.min(width, height);
        context.drawImage(
          image,
          (width - edge) / 2,
          (height - edge) / 2,
          edge,
          edge,
          0,
          0,
          size,
          size,
        );
        const texture = createStoneTexture(canvas.toDataURL('image/png'));
        settled = true;
        cleanup();
        resolve(texture);
      } catch (error) {
        fail(error);
      }
    };
    void (async () => {
      try {
        const bytes = new Uint8Array(await input.arrayBuffer());
        if (settled) return;
        if (bytes.length !== input.size || bytes.length > STONE_TEXTURE_LIMITS.bytes)
          throw new RangeError('Texture source size changed');
        if (input.type === 'image/png') pngDimensions(bytes, STONE_TEXTURE_LIMITS.sourceDimension);
        else if (input.type === 'image/jpeg') {
          if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)
            throw new RangeError('Invalid JPEG signature');
        } else if (
          String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF' ||
          String.fromCharCode(...bytes.subarray(8, 12)) !== 'WEBP'
        )
          throw new RangeError('Invalid WebP signature');
        url = URL.createObjectURL(new Blob([bytes], { type: input.type }));
        image.src = url;
      } catch (error) {
        fail(error);
      }
    })();
  });
}
