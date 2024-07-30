// drawing.js

import { snapToGrid } from './utils.js';

const WALL_COLOR = '#333333';
const PATH_COLOR = '#ffffff';

let grid = [];
let doors = [];

function initializeGrid(stage, cellLayer, CELL_SIZE) {
  const rows = Math.floor(stage.height() / CELL_SIZE);
  const cols = Math.floor(stage.width() / CELL_SIZE);
  
  for (let i = 0; i < rows; i++) {
    grid[i] = new Array(cols).fill(0);  // 0 represents walls (dark gray)
  }
  
  // Draw initial dark gray grid
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellRect = new Konva.Rect({
        x: col * CELL_SIZE,
        y: row * CELL_SIZE,
        width: CELL_SIZE,
        height: CELL_SIZE,
        fill: WALL_COLOR,
        id: `cell-${row}-${col}`,
      });
      cellLayer.add(cellRect);
    }
  }
  cellLayer.draw();
}

function drawGrid(stage, gridLayer, CELL_SIZE, GRID_COLOR) {
  for (let i = 0; i <= stage.width(); i += CELL_SIZE) {
    const line = new Konva.Line({
      points: [i, 0, i, stage.height()],
      stroke: GRID_COLOR,
      strokeWidth: 1,
    });
    gridLayer.add(line);
  }
  
  for (let i = 0; i <= stage.height(); i += CELL_SIZE) {
    const line = new Konva.Line({
      points: [0, i, stage.width(), i],
      stroke: GRID_COLOR,
      strokeWidth: 1,
    });
    gridLayer.add(line);
  }
  
  gridLayer.draw();
}

function toggleCell(row, col, cellLayer) {
  if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
    grid[row][col] = 1 - grid[row][col];  // Toggle between 0 (wall) and 1 (path)
    const cell = cellLayer.findOne(`#cell-${row}-${col}`);
    if (cell) {
      cell.fill(grid[row][col] ? PATH_COLOR : WALL_COLOR);
      cellLayer.batchDraw();
    }
  }
}

function clearGrid(cellLayer) {
  for (let i = 0; i < grid.length; i++) {
    grid[i].fill(0);
  }
  cellLayer.children.each(child => {
    child.fill(WALL_COLOR);
  });
  cellLayer.draw();
}

export { initializeGrid, drawGrid, toggleCell, clearGrid, grid, doors };
