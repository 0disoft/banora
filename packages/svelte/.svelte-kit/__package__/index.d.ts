import type { RecordController } from '@banora/sdk';
export { default as Board } from './Board.svelte';
export { default as Viewer } from './Viewer.svelte';
export type { BoardProps, ViewerProps } from './types.js';
export declare function createRecordStore(controller: RecordController): import("svelte/store").Readable<import("@banora/sdk").ControllerState>;
