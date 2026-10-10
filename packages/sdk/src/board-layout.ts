/** Shared SVG coordinate padding for the board and isolated presentation layers. */
export const BOARD_PADDING = 1.25;

const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
export const boardColumnLabel = (index: number): string => letters[index] ?? String(index + 1);
