import { createStoneTexture } from '@0disoft/banora';
import type { StoneTextures } from '@0disoft/banora';
import black from './assets/black-stone-tile.png?inline';
import white from './assets/white-stone-tile.png?inline';

/** Validated embedded tiles keep the editor ready without a network/decode barrier. */
export function createStudioTextures(): StoneTextures {
  return {
    black: createStoneTexture(black),
    white: createStoneTexture(white),
  };
}
