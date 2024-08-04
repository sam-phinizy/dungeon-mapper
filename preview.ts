import Konva from "konva";
import { snapToGrid } from "./utils";
import { ColorEnum } from "./colors";
import { ToolType } from "./toolTypes";

let interactionLayer: Konva.Layer;

export function initializePreview(layer: Konva.Layer): void {
  interactionLayer = layer;
}

export function updatePenPreview(
  pos: Konva.Vector2d,
  CELL_SIZE: number,
  currentColor: string,
): void {
  // Clear only preview elements, not selection
  interactionLayer
    .getChildren((node: Konva.Node) => node.name() === "preview")
    .forEach((node: Konva.Node) => node.destroy());

  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
  const rect = new Konva.Rect({
    x: snappedPos.x,
    y: snappedPos.y,
    width: CELL_SIZE,
    height: CELL_SIZE,
    stroke: currentColor,
    strokeWidth: 2,
  });
  rect.name("preview");
  interactionLayer.add(rect);

  interactionLayer.batchDraw();
}

export function shapePreview(
  startPos: Konva.Vector2d,
  endPos: Konva.Vector2d,
  tool: ToolType,
  CELL_SIZE: number,
  currentColor: string,
): void {
  // Clear only preview elements, not selection
  interactionLayer
    .getChildren((node: Konva.Node) => node.name() === "preview")
    .forEach((node: Konva.Node) => node.destroy());

  let shape: Konva.Shape;
  let text: Konva.Text | undefined;
  if (tool === ToolType.RECT) {
    shape = new Konva.Rect({
      x: Math.min(startPos.x, endPos.x),
      y: Math.min(startPos.y, endPos.y),
      width: Math.abs(endPos.x - startPos.x),
      height: Math.abs(endPos.y - startPos.y),
      stroke: currentColor,
      strokeWidth: 2,
    });
    let w = Math.abs(endPos.x - startPos.x) / CELL_SIZE;
    let h = Math.abs(endPos.y - startPos.y) / CELL_SIZE;
    text = new Konva.Text({
      x: (startPos.x + endPos.x) / 2,
      y: startPos.y - 12,
      text: "W: " + w + " H: " + h,
      fontSize: 12,
      fontFamily: "Calibri",
      fill: currentColor,
    });
  } else if (tool === ToolType.CIRCLE) {
    const radius =
      Math.sqrt(
        Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2),
      ) / 2;
    shape = new Konva.Circle({
      x: (startPos.x + endPos.x) / 2,
      y: (startPos.y + endPos.y) / 2,
      radius: radius,
      stroke: currentColor,
      strokeWidth: 2,
    });
  } else if (tool === ToolType.LINE) {
    shape = new Konva.Line({
      points: [
        startPos.x + CELL_SIZE / 2,
        startPos.y + CELL_SIZE / 2,
        endPos.x + CELL_SIZE / 2,
        endPos.y + CELL_SIZE / 2,
      ],
      stroke: currentColor,
      strokeWidth: 2,
    });
  } else {
    return; // Handle unexpected case
  }

  if (text) {
    text.name("preview");
    interactionLayer.add(text);
  }
  if (shape) {
    shape.name("preview");
    interactionLayer.add(shape);
    interactionLayer.batchDraw();
  }
}

export function clearPreview(): void {
  // Clear only preview elements, not selection
  interactionLayer
    .getChildren((node: Konva.Node) => node.name() === "preview")
    .forEach((node: Konva.Node) => node.destroy());
  interactionLayer.batchDraw();
}
