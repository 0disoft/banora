import { readable } from 'svelte/store';
export { default as Board } from './Board.svelte';
export { default as Viewer } from './Viewer.svelte';
export function createRecordStore(controller) {
    return readable(controller.getState(), set => controller.subscribe(set));
}
