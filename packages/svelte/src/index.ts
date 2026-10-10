import { readable } from 'svelte/store';
import type { RecordController } from '@banora/sdk';

export { default as Board } from './Board.svelte';
export { default as Viewer } from './Viewer.svelte';
export type { BoardProps, ViewerProps } from './types.js';

export function createRecordStore(controller: RecordController) {
  return readable(controller.getState(), set => controller.subscribe(set));
}
