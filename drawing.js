// drawing.js

import { snapToGrid } from './utils.js';

const WALL_COLOR = '#1a1a1a';  // Dark gray color
const PATH_COLOR = '#ffffff';

let dungeonMapperGrid = new Map();

function initializeGrid(stage, cellLayer, CELL_SIZE) {
  // We don't need to pre-initialize the grid anymore
  // The grid will be populated as cells are modified
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

function toggleCell(x, y, cellLayer, CELL_SIZE) {
  const key = `${x},${y}`;
  const currentValue = dungeonMapperGrid.get(key) || 0;
  const newValue = 1 - currentValue;
  dungeonMapperGrid.set(key, newValue);

  const cell = cellLayer.findOne(`#cell-${x}-${y}`);
  if (cell) {
    cell.fill(newValue ? PATH_COLOR : WALL_COLOR);
  } else {
    const newCell = new Konva.Rect({
      x: x * CELL_SIZE,
      y: y * CELL_SIZE,
      width: CELL_SIZE,
      height: CELL_SIZE,
      fill: newValue ? PATH_COLOR : WALL_COLOR,
      id: `cell-${x}-${y}`,
    });
    cellLayer.add(newCell);
  }
  cellLayer.batchDraw();
}

function clearGrid(cellLayer) {
  dungeonMapperGrid.clear();
  cellLayer.destroyChildren();
  cellLayer.draw();
}

function renderGrid(cellLayer, CELL_SIZE) {
  cellLayer.destroyChildren();
  for (const [key, value] of dungeonMapperGrid) {
    const [x, y] = key.split(',').map(Number);
    const cell = new Konva.Rect({
      x: x * CELL_SIZE,
      y: y * CELL_SIZE,
      width: CELL_SIZE,
      height: CELL_SIZE,
      fill: value ? PATH_COLOR : WALL_COLOR,
      id: `cell-${x}-${y}`,
    });
    cellLayer.add(cell);
  }
  cellLayer.batchDraw();
}

export { initializeGrid, drawGrid, toggleCell, clearGrid, renderGrid, dungeonMapperGrid };
