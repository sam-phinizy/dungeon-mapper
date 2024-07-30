// utils.js

export function snapToGrid(x, y, CELL_SIZE) {
    return {
      x: Math.floor(x / CELL_SIZE) * CELL_SIZE,
      y: Math.floor(y / CELL_SIZE) * CELL_SIZE
    };
  }