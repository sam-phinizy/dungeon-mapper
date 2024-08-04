export function snapToGrid(
  x: number,
  y: number,
  CELL_SIZE: number,
): { x: number; y: number } {
  return {
    x: Math.floor(x / CELL_SIZE) * CELL_SIZE,
    y: Math.floor(y / CELL_SIZE) * CELL_SIZE,
  };
}
