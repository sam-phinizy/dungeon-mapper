import { Konva } from "konva";
import { snapToGrid } from "./utils";
import { ColorEnum } from "./colors";

const SELECTION_COLOR = "rgba(0, 0, 255, 0.3)";

let isSelecting = false;
let selectionRect: Konva.Rect | null = null;
let selectionStart: Konva.Vector2d = { x: 0, y: 0 };
let interactionLayer: Konva.Layer;

interface SelectedCell {
  row: number;
  col: number;
  state: ColorEnum | null;
}

export function startSelection(
  pos: Konva.Vector2d,
  layer: Konva.Layer,
  CELL_SIZE: number,
): void {
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

export function updateSelection(pos: Konva.Vector2d, CELL_SIZE: number): void {
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

export function endSelection(): void {
  isSelecting = false;
}

export function clearSelection(): void {
  if (selectionRect) {
    selectionRect.destroy();
    selectionRect = null;
    if (interactionLayer) {
      interactionLayer.draw();
    }
  }
}

export function getSelectedCells(
  dungeonMapperGrid: Map<string, ColorEnum>,
  CELL_SIZE: number,
): SelectedCell[] {
  if (!selectionRect) return [];

  const x = selectionRect.x();
  const y = selectionRect.y();
  const width = selectionRect.width();
  const height = selectionRect.height();

  const startCol = Math.floor(x / CELL_SIZE);
  const startRow = Math.floor(y / CELL_SIZE);
  const endCol = Math.floor((x + width - 1) / CELL_SIZE);
  const endRow = Math.floor((y + height - 1) / CELL_SIZE);

  const selectedCells: SelectedCell[] = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const key = `${col},${row}`;
      const state = dungeonMapperGrid.get(key);
      selectedCells.push({
        row,
        col,
        state: state !== undefined ? state : null,
      });
    }
  }
  console.log(selectedCells);
  return selectedCells;
}
