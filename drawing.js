// drawing.js

import { snapToGrid } from "./utils.js";
import { ColorEnum, ColorMap } from "./colors.js";

const dungeonMapperGrid = new Map();

function initializeGrid(stage, cellLayer, CELL_SIZE) {
  cellLayer.draw();
}

function drawGrid(stage, gridLayer, CELL_SIZE, GRID_COLOR) {
  gridLayer.draw();
}

function toggleCell(x, y, cellLayer, CELL_SIZE, currentColor) {
  console.log(`Toggling cell at (${x}, ${y}) with color ${currentColor}`);
  const key = `${x},${y}`;
  const currentValue = dungeonMapperGrid.get(key);

  if (currentValue === undefined) {
    dungeonMapperGrid.set(key, currentColor);
  } else {
    dungeonMapperGrid.delete(key);
  }

  const cell = cellLayer.findOne(`#cell-${x}-${y}`);
  if (cell) {
    cell.fill(ColorMap[currentColor]);
  } else {
    const newCell = new Konva.Rect({
      x: x * CELL_SIZE,
      y: y * CELL_SIZE,
      width: CELL_SIZE,
      height: CELL_SIZE,
      fill: ColorMap[currentColor],
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
  for (const [key, colorEnum] of dungeonMapperGrid) {
    const [x, y] = key.split(",").map(Number);
    const cell = new Konva.Rect({
      x: x * CELL_SIZE,
      y: y * CELL_SIZE,
      width: CELL_SIZE,
      height: CELL_SIZE,
      fill: ColorMap[colorEnum],
      id: `cell-${x}-${y}`,
    });
    cellLayer.add(cell);
  }
  cellLayer.batchDraw();
}

export {
  initializeGrid,
  drawGrid,
  toggleCell,
  clearGrid,
  renderGrid,
  dungeonMapperGrid,
};
