/** Shared core/SGF dimension policy without allocating a board or rule state. */
export function validBoardDimensions(width: number, height: number): boolean {
  return (
    Number.isInteger(width) &&
    width >= 2 &&
    width <= 52 &&
    Number.isInteger(height) &&
    height >= 2 &&
    height <= 52
  );
}
