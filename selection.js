// selection.js

import { snapToGrid } from "./utils.js";

const SELECTION_COLOR = "rgba(0, 0, 255, 0.3)";

let isSelecting = false;
let selectionRect;
let selectionStart = { x: 0, y: 0 };
let interactionLayer;

function startSelection(pos, layer, CELL_SIZE) {
  interactionLayer = layer;
  if (selectionRect) {
    selectionRect.destroy();
  }
  isSelecting = true;
  selectionStart = snapToGrid(pos.x, pos.y, CELL_SIZE);
  selectionRect = new Konva.Rect({
    x: selectionStart.x,
    y: selectionStart.y,
    width: CELL_SIZE,
    height: CELL_SIZE,
    fill: SELECTION_COLOR,
  });
  interactionLayer.add(selectionRect);
  interactionLayer.draw();
}

function updateSelection(pos, CELL_SIZE) {
  if (!isSelecting || !selectionRect) return;

  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
  const x = Math.min(selectionStart.x, snappedPos.x);
  const y = Math.min(selectionStart.y, snappedPos.y);
  const width = Math.abs(snappedPos.x - selectionStart.x) + CELL_SIZE;
  const height = Math.abs(snappedPos.y - selectionStart.y) + CELL_SIZE;

  selectionRect.position({ x, y });
  selectionRect.width(width);
  selectionRect.height(height);
  interactionLayer.batchDraw();
}

function endSelection() {
  isSelecting = false;
}

function clearSelection() {
  if (selectionRect) {
    selectionRect.destroy();
    selectionRect = null;
    if (interactionLayer) {
      interactionLayer.draw();
    }
  }
}

function getSelectedCells(dungeonMapperGrid, CELL_SIZE) {
  if (!selectionRect) return [];

  const x = selectionRect.x();
  const y = selectionRect.y();
  const width = selectionRect.width();
  const height = selectionRect.height();

  const startCol = Math.floor(x / CELL_SIZE);
  const startRow = Math.floor(y / CELL_SIZE);
  const endCol = Math.floor((x + width - 1) / CELL_SIZE);
  const endRow = Math.floor((y + height - 1) / CELL_SIZE);

  const selectedCells = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const key = `${col},${row}`;
      if (dungeonMapperGrid.has(key)) {
        selectedCells.push({ row, col, state: dungeonMapperGrid.get(key) });
      }
    }
  }
  return selectedCells;
}

export {
  startSelection,
  updateSelection,
  endSelection,
  getSelectedCells,
  clearSelection,
};
