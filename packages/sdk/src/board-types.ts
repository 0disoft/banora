import type { BoardLabels } from './board-state.js';
import type { Point } from './core.js';
import type { RecordController } from './controller.js';
import type { BoardCrop, BoardTransform } from './geometry.js';
import type { DiagramOptions } from './diagram-export.js';
import type { StrokeStyle } from './annotations.js';
import type { TouchOptions } from './touch-aim.js';
import type { StoneTextures } from './stone-textures.js';
import type { PlacementAnimationOptions } from './placement-animation.js';
export type { BoardCrop, BoardTransform } from './geometry.js';
export type { DiagramOptions } from './diagram-export.js';
export type { TouchOptions } from './touch-aim.js';
export { prepareStoneTexture } from './texture-loader.js';
export type { TexturePreparationOptions } from './texture-loader.js';
export type { PlacementAnimationOptions } from './placement-animation.js';
export interface BoardOptions {
  readonly labels?: BoardLabels;
  readonly controller?: RecordController;
  readonly readOnly?: boolean;
  readonly theme?: 'wood' | 'flat';
  readonly coordinates?: boolean;
  readonly moveNumbers?: boolean;
  readonly crop?: BoardCrop | null;
  readonly transform?: BoardTransform;
  /** Opt-in freehand mode; null/undefined restores ordinary point activation. */
  readonly drawing?: StrokeStyle | null;
  readonly touch?: TouchOptions | null;
  readonly stoneTextures?: StoneTextures | null;
  readonly placementAnimation?: boolean | PlacementAnimationOptions | null;
  /** Pin a read-only board to a node in the current record generation. */
  readonly nodeId?: string | null;
  readonly compareTo?: string | null;
  /** Scope nodeId/compareTo to an import generation; defaults to their mount/change generation. */
  readonly referenceGeneration?: number;
  readonly onPoint?: (point: Point) => void;
}
export interface BoardView {
  readonly controller: RecordController;
  update(options: Omit<BoardOptions, 'controller'>): void;
  exportSvg(options?: DiagramOptions): string;
  exportPng(options?: DiagramOptions): Promise<Blob>;
  dispose(): void;
}
