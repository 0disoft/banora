import { RecordController } from './controller.js';
import { recordBoardBinding } from './board-record.js';
import { mountBoardSurface } from './board-surface.js';
import type { BoardOptions, BoardView } from './board-types.js';
export * from './board-types.js';

/** Record authority remains in the supplied/owned controller; the surface only displays its projection. */
export function mountBoard(container: HTMLElement, initial: BoardOptions = {}): BoardView {
  const owned = !initial.controller;
  const controller = initial.controller ?? new RecordController();
  try {
    const surface = mountBoardSurface(container, initial, recordBoardBinding(controller, owned));
    return Object.freeze({
      controller,
      update: surface.update,
      exportSvg: surface.exportSvg,
      exportPng: surface.exportPng,
      dispose: surface.dispose,
    });
  } catch (error) {
    if (owned) controller.dispose();
    throw error;
  }
}
