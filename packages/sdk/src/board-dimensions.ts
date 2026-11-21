export const MIN_BOARD_SIDE = 2;
export const MAX_BOARD_SIDE = 52;

/** Shared core/SGF dimension policy without allocating a board or rule state. */
export function validBoardDimensions(width: number, height: number): boolean {
  return (
    Number.isInteger(width) &&
    width >= MIN_BOARD_SIDE &&
    width <= MAX_BOARD_SIDE &&
    Number.isInteger(height) &&
    height >= MIN_BOARD_SIDE &&
    height <= MAX_BOARD_SIDE
  );
}
