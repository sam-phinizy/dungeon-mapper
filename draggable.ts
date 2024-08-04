import Konva from "konva";
import { snapToGrid } from "./utils";
import { ColorEnum, ColorMap } from "./colors";

const dungeonMapperGrid = new Map<string, ColorEnum>();

function initializeGrid(
  stage: Konva.Stage,
  cellLayer: Konva.Layer,
  CELL_SIZE: number,
): void {
  cellLayer.draw();
}

function drawGrid(
  stage: Konva.Stage,
  gridLayer: Konva.Layer,
  CELL_SIZE: number,
  GRID_COLOR: string,
): void {
  gridLayer.draw();
}

function toggleCell(
  x: number,
  y: number,
  cellLayer: Konva.Layer,
  CELL_SIZE: number,
  currentColor: ColorEnum,
): void {
  console.log(`Toggling cell at (${x}, ${y}) with color ${currentColor}`);
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

function clearGrid(cellLayer: Konva.Layer): void {
  dungeonMapperGrid.clear();
  cellLayer.destroyChildren();
  cellLayer.draw();
}

function renderGrid(cellLayer: Konva.Layer, CELL_SIZE: number): void {
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

export function makeDraggable(element: HTMLElement): void {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  element.onmousedown = dragMouseDown;

  function dragMouseDown(e: MouseEvent) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e: MouseEvent) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

export {
  initializeGrid,
  drawGrid,
  toggleCell,
  clearGrid,
  renderGrid,
  dungeonMapperGrid,
};
