import Konva from "konva";
import { ColorEnum, ColorMap } from "./colors";
import type { DungeonMapGrid } from "./index.ts";

function toggleCell(
  x: number,
  y: number,
  cellLayer: Konva.Layer,
  CELL_SIZE: number,
  currentColor: ColorEnum,
  dungeonMapperGrid: Map<string, ColorEnum>,
): void {
  const key = `${x},${y}`;
  const currentValue = dungeonMapperGrid.get(key);

  if (currentValue === undefined) {
    dungeonMapperGrid.set(key, currentColor);
  } else {
    dungeonMapperGrid.delete(key);
  }

  const cell = cellLayer.findOne(`#cell-${x}-${y}`) as Konva.Rect | null;
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

function renderGrid(
  dungeonGrid: DungeonMapGrid,
  cellLayer: Konva.Layer,
  CELL_SIZE: number,
): void {
  cellLayer.destroyChildren();
  for (const [key, colorEnum] of dungeonGrid) {
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
}

export { toggleCell, renderGrid };
