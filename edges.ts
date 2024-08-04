import Konva from "konva";
import { snapToGrid } from "./utils";
import { getCurrentColor, getCurrentRoughLineType } from "./toolbar";
import { ColorMap, ColorEnum } from "./colors";

const DOOR_COLOR = "black";
const DOOR_FILL_COLOR = "#FFFFFF";
const EDGE_PREVIEW_COLOR = "rgba(0, 255, 0, 0.5)";

let edgePreview: Konva.Group;
let previewLayer: Konva.Layer;
let edges = new Map<string, EdgeData>();

interface EdgeData {
  type: "door" | "roughLine";
  roughLineType?: string;
  color?: ColorEnum;
  konvaObject: Konva.Group;
}

interface State {
  currentTool: string;
}

export function initializeEdgePreview(layer: Konva.Layer): void {
  previewLayer = layer;
  edgePreview = new Konva.Group({
    visible: false,
  });

  const previewLine = new Konva.Line({
    stroke: EDGE_PREVIEW_COLOR,
    strokeWidth: 2,
    points: [0, 0, 0, 0],
  });

  edgePreview.add(previewLine);
  previewLayer.add(edgePreview);
}

function ensureValidEdgePreview(): void {
  if (!edgePreview || !edgePreview.findOne("Line")) {
    console.warn("Edge preview not properly initialized. Reinitializing...");
    initializeEdgePreview(previewLayer);
  }
}

export function updateEdgePreview(
  pos: Konva.Vector2d,
  CELL_SIZE: number,
  state: State,
): void {
  if (state.currentTool !== "door" && state.currentTool !== "roughLine") {
    edgePreview.visible(false);
    previewLayer.batchDraw();
    return;
  }
  ensureValidEdgePreview();

  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
  const cellX = Math.floor(snappedPos.x / CELL_SIZE);
  const cellY = Math.floor(snappedPos.y / CELL_SIZE);

  const xOffset = pos.x - snappedPos.x;
  const yOffset = pos.y - snappedPos.y;

  let startPoint: Konva.Vector2d, endPoint: Konva.Vector2d;

  if (xOffset < yOffset && xOffset < CELL_SIZE - yOffset) {
    // Left edge
    startPoint = { x: snappedPos.x, y: snappedPos.y };
    endPoint = { x: snappedPos.x, y: snappedPos.y + CELL_SIZE };
  } else if (yOffset < xOffset && yOffset < CELL_SIZE - xOffset) {
    // Top edge
    startPoint = { x: snappedPos.x, y: snappedPos.y };
    endPoint = { x: snappedPos.x + CELL_SIZE, y: snappedPos.y };
  } else if (xOffset > yOffset && xOffset > CELL_SIZE - yOffset) {
    // Right edge
    startPoint = { x: snappedPos.x + CELL_SIZE, y: snappedPos.y };
    endPoint = { x: snappedPos.x + CELL_SIZE, y: snappedPos.y + CELL_SIZE };
  } else {
    // Bottom edge
    startPoint = { x: snappedPos.x, y: snappedPos.y + CELL_SIZE };
    endPoint = { x: snappedPos.x + CELL_SIZE, y: snappedPos.y + CELL_SIZE };
  }

  const previewLine = edgePreview.findOne("Line") as Konva.Line;
  if (previewLine) {
    previewLine.points([startPoint.x, startPoint.y, endPoint.x, endPoint.y]);
    edgePreview.visible(true);
    previewLayer.batchDraw();
  }
}

export function placeEdge(edgeLayer: Konva.Layer, CELL_SIZE: number): void {
  if (!edgePreview.visible()) return;

  const line = edgePreview.findOne("Line") as Konva.Line;
  const points = line.points();

  const edgeKey = `${points[0]},${points[1]}-${points[2]},${points[3]}`;

  if (edges.has(edgeKey)) {
    const existingEdge = edges.get(edgeKey);
    if (existingEdge?.konvaObject) {
      existingEdge.konvaObject.destroy();
    }
    edges.delete(edgeKey);
  }

  let edge: Konva.Group;
  let edgeData: EdgeData;

  if (state.currentTool === "door") {
    edge = generateDoor(points[0], points[1], points[2], points[3], CELL_SIZE);
    edgeData = { type: "door", konvaObject: edge };
  } else if (state.currentTool === "roughLine") {
    const currentRoughLineType = getCurrentRoughLineType();
    const currentColor = getCurrentColor();
    edge = generateRoughLine(
      points[0],
      points[1],
      points[2],
      points[3],
      CELL_SIZE,
      currentRoughLineType,
      currentColor,
    );
    edgeData = {
      type: "roughLine",
      roughLineType: currentRoughLineType,
      color: currentColor,
      konvaObject: edge,
    };
  } else {
    return; // Handle unexpected case
  }

  edgeLayer.add(edge);
  edges.set(edgeKey, edgeData);
  edgeLayer.batchDraw();

  if (typeof (window as any).saveToLocalStorage === "function") {
    (window as any).saveToLocalStorage();
  }
}

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function loadEdgesFromStorage(
  savedEdges: [string, EdgeData][],
  edgeLayer: Konva.Layer,
  CELL_SIZE: number,
): void {
  console.log("Loading edges:", savedEdges);
  edges.clear();
  edgeLayer.destroyChildren();

  savedEdges.forEach(([key, value]) => {
    console.log("Loading edge:", key, value);
    const [startX, startY, endX, endY] = key
      .split("-")
      .flatMap((coord) => coord.split(",").map(Number));
    let edge: Konva.Group;

    if (value.type === "door") {
      edge = generateDoor(startX, startY, endX, endY, CELL_SIZE);
    } else if (value.type === "roughLine") {
      edge = generateRoughLine(
        startX,
        startY,
        endX,
        endY,
        CELL_SIZE,
        value.roughLineType || "standard",
        value.color || ColorEnum.BLACK,
      );
    } else {
      return; // Handle unexpected case
    }

    if (edge) {
      edgeLayer.add(edge);
      edges.set(key, { ...value, konvaObject: edge });
    }
  });

  console.log("Loaded edges:", edges);
  edgeLayer.batchDraw();
}

const generateDoor = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  CELL_SIZE: number,
): Konva.Group => {
  const edge = new Konva.Group();

  const doorLine = new Konva.Line({
    points: [startX, startY, endX, endY],
    stroke: DOOR_COLOR,
    strokeWidth: 5,
    lineCap: "square",
  });

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const rectWidth = CELL_SIZE * 0.5;
  const rectHeight = length * 0.33;
  const rectX =
    midX -
    (rectWidth / 2) * Math.cos(angle) +
    (rectHeight / 2) * Math.sin(angle);
  const rectY =
    midY -
    (rectWidth / 2) * Math.sin(angle) -
    (rectHeight / 2) * Math.cos(angle);

  const doorRect = new Konva.Rect({
    x: rectX,
    y: rectY,
    width: rectWidth,
    height: rectHeight,
    fill: DOOR_FILL_COLOR,
    stroke: DOOR_COLOR,
    strokeWidth: 2,
    rotation: (angle * 180) / Math.PI,
  });

  edge.add(doorLine, doorRect);
  return edge;
};

function generateRoughLine(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  CELL_SIZE: number,
  roughLineType: string,
  color: ColorEnum,
): Konva.Group {
  const edge = new Konva.Group();

  let lineObjects: Konva.Shape[];
  switch (roughLineType) {
    case "normal":
      lineObjects = getNormalLine(startX, startY, endX, endY, color);
      break;
    case "blocks":
      lineObjects = getBlockLine(startX, startY, endX, endY, CELL_SIZE, color);
      break;
    case "rough":
    default:
      lineObjects = getRoughLine(startX, startY, endX, endY, color);
      break;
  }

  lineObjects.forEach((obj) => edge.add(obj));
  return edge;
}

function getNormalLine(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: ColorEnum,
): Konva.Line[] {
  const normalLine = new Konva.Line({
    points: [startX, startY, endX, endY],
    stroke: ColorMap[color],
    strokeWidth: 2,
    lineCap: "round",
    lineJoin: "round",
  });
  return [normalLine];
}

function getBlockLine(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  CELL_SIZE: number,
  color: ColorEnum,
): Konva.Shape[] {
  const objects: Konva.Shape[] = [];
  const dx = endX - startX;
  const dy = endY - startY;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);

  // Main wall line
  const mainLine = new Konva.Line({
    points: [startX, startY, endX, endY],
    stroke: ColorMap[color],
    strokeWidth: 3,
    lineCap: "square",
    lineJoin: "miter",
  });
  objects.push(mainLine);

  // Blocks
  const blockSize = CELL_SIZE / getRandomInt(3, 8);
  const numBlocks = Math.floor(length / blockSize);
  for (let i = 0; i < numBlocks; i++) {
    const blockX = startX + Math.cos(angle) * i * blockSize;
    const blockY = startY + Math.sin(angle) * i * blockSize;
    const randomHeight = Math.random() * (2 + 1) + 1;
    const randomWidth = Math.random() * (2 + 1) + 1;
    const randomOffset = Math.random() * 2 - 1;
    const block = new Konva.Rect({
      x: blockX - randomOffset,
      y: blockY,
      width: blockSize / randomWidth,
      height: blockSize / randomHeight,
      fill: "white",
      stroke: ColorMap[color],
      strokeWidth: 1,
      rotation: (angle * 180) / Math.PI,
      offsetY: blockSize / 4,
    });
    objects.push(block);
  }

  return objects;
}

function getRoughLine(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: ColorEnum,
): Konva.Line[] {
  const objects: Konva.Line[] = [];
  for (let i = 0; i < 3; i++) {
    const offset = Math.random() * 2 - 1;
    const roughSegment = new Konva.Line({
      points: [startX + offset, startY + offset, endX + offset, endY + offset],
      stroke: ColorMap[color],
      strokeWidth: 1,
      lineCap: "round",
      lineJoin: "round",
      tension: 0.5,
    });
    objects.push(roughSegment);
  }
  return objects;
}

export { edges };
