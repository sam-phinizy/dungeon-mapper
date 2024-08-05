// Section 1: Imports
import Konva from "konva";
import {
  debouncedSave,
  loadFromLocalStorage,
  saveToLocalStorage,
} from "./utils";
import { renderGrid } from "./drawing";
import { initializeDebugTool, initializeToolbar } from "./toolbar";
import { initializeNotes } from "./notes";
import { initializePreview } from "./preview";
import { makeDraggable } from "./draggable";
import {
  type EdgeData,
  initializeEdgePreview,
  loadEdgesFromStorage,
} from "./edges";
import { ColorEnum } from "./colors";
import { ToolType } from "./tooltypes.ts";
import { dataEvents, emitDataDirtied } from "./events.ts";
import ToolStateMachine from "./toolStateMachine";

// Section 2: Constants and State Definitions

let stage: Konva.Stage;
let cellLayer: Konva.Layer;
let edgeLayer: Konva.Layer;
let interactionLayer: Konva.Layer;
let debugLayer: Konva.Layer;
let debugText: Konva.Text;
let chatMessages: string[] = [];
export type DungeonMapGrid = Map<string, ColorEnum>;

export interface AppConfig {
  cellSize: number;
  previewColor: string;
}

const appConfig: AppConfig = {
  cellSize: 32,
  previewColor: "rgba(0, 255, 0, 0.5)",
};

interface AppLayers {
  cellLayer: Konva.Layer;
  edgeLayer: Konva.Layer;
  interactionLayer: Konva.Layer;
  debugLayer: Konva.Layer;
}

export interface State {
  currentTool: ToolType;
  isDrawing: boolean;
  startPos: { x: number; y: number } | null;
  debugMode: boolean;
  dungeonMapperGrid: DungeonMapGrid;
  edges: Map<string, EdgeData>;
  config: AppConfig;
  layers: AppLayers;
  selectedCells: { col: number; row: number }[];
  currentColor: ColorEnum;
}

const state: State = {
  currentTool: ToolType.PEN,
  isDrawing: false,
  startPos: null,
  debugMode: false,
  dungeonMapperGrid: new Map<string, ColorEnum>(),
  edges: new Map<string, EdgeData>(),
  config: appConfig,
  layers: {} as AppLayers,
  selectedCells: [],
  currentColor: ColorEnum.BLACK,
};

let toolStateMachine: ToolStateMachine;

(window as any).saveToLocalStorage = saveToLocalStorage;
(window as any).debouncedSave = debouncedSave;

let saveIndicator: Konva.Circle;
let savePopover: Konva.Text;
// Section 3: Initialization and Setup Functions

const initializeSaveIndicator = () => {
  saveIndicator = new Konva.Circle({
    x: stage.width() - 20,
    y: 20,
    radius: 10,
    fill: "green",
  });

  savePopover = new Konva.Text({
    x: stage.width() - 80,
    y: 35,
    text: "Saved",
    fontSize: 14,
    fontFamily: "Arial",
    fill: "black",
    padding: 5,
    backgroundColor: "white",
    visible: false,
  });

  saveIndicator.on("mouseover", () => {
    savePopover.visible(true);
    interactionLayer.batchDraw();
  });

  saveIndicator.on("mouseout", () => {
    savePopover.visible(false);
    interactionLayer.batchDraw();
  });

  interactionLayer.add(saveIndicator);
  interactionLayer.add(savePopover);
};

const updateSaveIndicator = (isDirty: boolean) => {
  saveIndicator.fill(isDirty ? "red" : "green");
  savePopover.text(isDirty ? "Not Saved" : "Saved");
  interactionLayer.batchDraw();
};

const init = (): void => {
  initializeStage(state);
  cellLayer.draw();
  initializeEdgePreview(interactionLayer);
  initializeToolbar();
  initializeNotes();
  initializePreview(interactionLayer);
  initializeDebugTool();

  toolStateMachine = new ToolStateMachine(stage, state);

  const { gridData, edges: savedEdges } = loadFromLocalStorage();
  state.dungeonMapperGrid = gridData;
  loadEdgesFromStorage(state.edges, savedEdges, edgeLayer, appConfig.cellSize);

  stage.on("mousedown touchstart", handleStageMouseDown);
  stage.on("mousemove touchmove", handleStageMouseMove);
  stage.on("mouseup touchend", handleStageMouseUp);

  initializeSaveIndicator();

  dataEvents.on("dataSaved", (dungeonGrid) => {
    console.log("Data saved:", dungeonGrid);
    updateSaveIndicator(false);
  });

  dataEvents.on("dataDirtied", (dungeonGrid) => {
    console.log("Data dirtied:", dungeonGrid);
    updateSaveIndicator(true);
  });

  renderGrid(state.dungeonMapperGrid, cellLayer, appConfig.cellSize);
  cellLayer.batchDraw();
  displayLoadedChatMessages();

  document.addEventListener("keydown", handleKeyboardShortcuts);
  window.addEventListener("resize", handleResize);
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addListener(handleColorSchemeChange);

  toolStateMachine.setTool(ToolType.PEN);
  initializeDOMElements();

  (window as any).clearGrid = clearMap;
};

const initializeStage = (state: State): void => {
  stage = new Konva.Stage({
    container: "map-area",
    width: calculateAvailableWidth(),
    height: window.innerHeight - 206,
  });

  cellLayer = new Konva.Layer();
  edgeLayer = new Konva.Layer();
  interactionLayer = new Konva.Layer();
  debugLayer = new Konva.Layer();

  state.layers = {
    cellLayer: cellLayer,
    edgeLayer: edgeLayer,
    interactionLayer: interactionLayer,
    debugLayer: debugLayer,
  };

  stage.add(cellLayer, edgeLayer, interactionLayer, debugLayer);

  debugText = new Konva.Text({
    x: 10,
    y: 10,
    text: "",
    fontSize: 14,
    fontFamily: "Arial",
    fill: "red",
    visible: false,
  });
  debugLayer.add(debugText);

  Object.assign(window, {
    stage,
    cellLayer,
    edgeLayer,
    interactionLayer,
    debugLayer,
    debugText,
    state,
  });

  const container = stage.container();
  container.addEventListener("dragover", (e: DragEvent) => {
    e.preventDefault();
  });

  debugText = new Konva.Text({
    x: 10,
    y: 10,
    text: "",
    fontSize: 14,
    fontFamily: "Arial",
    fill: "red",
    visible: false,
  });
  debugLayer.add(debugText);
};

function calculateAvailableWidth(): number {
  const sidebar = document.getElementById("sidebar");
  const resizer = document.getElementById("sidebar-resizer");
  return (
    window.innerWidth -
    (sidebar?.offsetWidth || 0) -
    (resizer?.offsetWidth || 0)
  );
}

function initializeDOMElements(): void {
  const chatSendButton = document.getElementById("chat-send");
  const chatInput = document.getElementById(
    "chat-input",
  ) as HTMLTextAreaElement;

  if (chatSendButton && chatInput) {
    chatSendButton.addEventListener("click", () => {
      const message = chatInput.value.trim();
      if (message) {
        chatMessages.push(message);
        displayLoadedChatMessages();
        chatInput.value = "";
        debouncedSave(state.dungeonMapperGrid, undefined);
      }
    });

    chatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatSendButton.click();
      }
    });
  }

  makeDraggable(document.getElementById("floating-tools")!);
}

// Call init to start the application
init();

// Section 4: Event Handlers and Core Logic

function handleStageMouseDown(
  event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
): void {
  toolStateMachine.handleMouseDown(event);
  emitDataDirtied();
  debouncedSave(state.dungeonMapperGrid, state.edges);
}

function handleStageMouseMove(
  event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
): void {
  toolStateMachine.handleMouseMove(event);

  if (state.debugMode) {
    const pos = stage.getPointerPosition();
    if (pos) {
      const cellX = Math.floor(pos.x / appConfig.cellSize);
      const cellY = Math.floor(pos.y / appConfig.cellSize);
      debugText.text(`X: ${cellX}, Y: ${cellY}`);
      debugText.position({
        x: pos.x + 10,
        y: pos.y + 10,
      });
      debugText.visible(true);
      debugLayer.batchDraw();
    }
  } else {
    debugText.visible(false);
    debugLayer.batchDraw();
  }
}

function handleStageMouseUp(
  event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
): void {
  toolStateMachine.handleMouseUp(event);
  debouncedSave(state.dungeonMapperGrid);
}

function handleKeyboardShortcuts(event: KeyboardEvent): void {
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  switch (event.key.toLowerCase()) {
    case "p":
      toolStateMachine.setTool(ToolType.PEN);
      break;
    case "r":
      toolStateMachine.setTool(ToolType.RECT);
      break;
    case "c":
      toolStateMachine.setTool(ToolType.CIRCLE);
      break;
    case "l":
      toolStateMachine.setTool(ToolType.LINE);
      break;
    case "s":
      toolStateMachine.setTool(ToolType.SELECT);
      break;
    case "d":
      toolStateMachine.setTool(ToolType.DOOR);
      break;
    case "u":
      toolStateMachine.setTool(ToolType.ROUGH_LINE);
      break;
  }
}

function handleResize(): void {
  const sidebar = document.getElementById("sidebar");
  const resizer = document.getElementById("sidebar-resizer");
  const libraryContainer = document.getElementById("library-container");
  const newWidth =
    calculateAvailableWidth() -
    (sidebar?.offsetWidth || 0) -
    (resizer?.offsetWidth || 0);
  const newHeight =
    window.innerHeight - 56 - (libraryContainer?.offsetHeight || 0);
  stage.width(newWidth);
  stage.height(newHeight);
  cellLayer.width(newWidth);
  cellLayer.height(newHeight);
  edgeLayer.width(newWidth);
  edgeLayer.height(newHeight);
  interactionLayer.width(newWidth);
  interactionLayer.height(newHeight);

  saveIndicator.x(stage.width() - 20);
  savePopover.x(stage.width() - 80);
  stage.batchDraw();
}

function handleColorSchemeChange(_: MediaQueryListEvent): void {
  stage.batchDraw();
}

function displayLoadedChatMessages(): void {
  const chatMessagesElement = document.getElementById("chat-messages");
  if (chatMessagesElement) {
    chatMessagesElement.innerHTML = chatMessages.join("<br>");
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
  }
}

function clearMap(): void {
  state.dungeonMapperGrid.clear();
  state.edges.clear();
  cellLayer.destroyChildren();
  cellLayer.draw();
  edgeLayer.destroyChildren();
  edgeLayer.draw();
  saveToLocalStorage(state.dungeonMapperGrid);
}

function drawRect(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
): { col: number; row: number }[] {
  const cells: { col: number; row: number }[] = [];
  for (
    let row = Math.min(startRow, endRow);
    row <= Math.max(startRow, endRow);
    row++
  ) {
    for (
      let col = Math.min(startCol, endCol);
      col <= Math.max(startCol, endCol);
      col++
    ) {
      cells.push({ col, row });
    }
  }
  return cells;
}

function drawCircle(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
): { col: number; row: number }[] {
  const cells: { col: number; row: number }[] = [];
  const centerRow = (startRow + endRow) / 2;
  const centerCol = (startCol + endCol) / 2;
  const radius =
    Math.sqrt(Math.pow(endRow - startRow, 2) + Math.pow(endCol - startCol, 2)) /
    2;

  for (
    let row = Math.floor(centerRow - radius);
    row <= Math.ceil(centerRow + radius);
    row++
  ) {
    for (
      let col = Math.floor(centerCol - radius);
      col <= Math.ceil(centerCol + radius);
      col++
    ) {
      if (
        Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2) <=
        Math.pow(radius, 2)
      ) {
        cells.push({ col, row });
      }
    }
  }
  return cells;
}

function drawLine(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
): { col: number; row: number }[] {
  const cells: { col: number; row: number }[] = [];
  const dx = Math.abs(endCol - startCol);
  const dy = Math.abs(endRow - startRow);
  const sx = startCol < endCol ? 1 : -1;
  const sy = startRow < endRow ? 1 : -1;
  let err = dx - dy;

  let row = startRow;
  let col = startCol;

  while (true) {
    cells.push({ col, row });
    if (row === endRow && col === endCol) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      col += sx;
    }
    if (e2 < dx) {
      err += dx;
      row += sy;
    }
  }
  return cells;
}

// Section 5: Utility Functions and Exports

// // Export types and interfaces
// export type { State };
//
// // Export constants
// export { CELL_SIZE, PREVIEW_COLOR };
//
// // Export utility functions
// export function getState(): State {
//   return state;
// }
//
// export function getStage(): Konva.Stage {
//   return stage;
// }
//
// export function getCellLayer(): Konva.Layer {
//   return cellLayer;
// }
//
// export function getEdgeLayer(): Konva.Layer {
//   return edgeLayer;
// }
//
// export function getInteractionLayer(): Konva.Layer {
//   return interactionLayer;
// }
//
// export function getDebugLayer(): Konva.Layer {
//   return debugLayer;
// }
//
// export function getToolStateMachine(): ToolStateMachine {
//   return toolStateMachine;
// }
//
// export function setCurrentTool(tool: ToolType): void {
//   toolStateMachine.setTool(tool);
// }
//
// export function toggleDebugMode(): void {
//   state.debugMode = !state.debugMode;
//   debugLayer.visible(state.debugMode);
//   stage.batchDraw();
// }
//
// export function addChatMessage(message: string): void {
//   chatMessages.push(message);
//   displayLoadedChatMessages();
// }
//
// export function saveMap(): void {
//   saveToLocalStorage(state.dungeonMapperGrid, state.edges);
// }
//
// export function loadMap(): void {
//   const { gridData, edges: savedEdges } = loadFromLocalStorage();
//   state.dungeonMapperGrid = gridData;
//   loadEdgesFromStorage(state.edges, savedEdges, edgeLayer, CELL_SIZE);
//   renderGrid(state.dungeonMapperGrid, cellLayer, CELL_SIZE);
//   stage.batchDraw();
// }
//
// // Helper function to check if a cell is within the grid bounds
// export function isWithinBounds(col: number, row: number): boolean {
//   return (
//     col >= 0 &&
//     col < stage.width() / CELL_SIZE &&
//     row >= 0 &&
//     row < stage.height() / CELL_SIZE
//   );
// }
//
// // Helper function to get the cell at a specific position
// export function getCellAt(x: number, y: number): { col: number; row: number } {
//   const col = Math.floor(x / CELL_SIZE);
//   const row = Math.floor(y / CELL_SIZE);
//   return { col, row };
// }
//
// // Helper function to get the position of a cell
// export function getCellPosition(
//   col: number,
//   row: number,
// ): { x: number; y: number } {
//   return {
//     x: col * CELL_SIZE,
//     y: row * CELL_SIZE,
//   };
// }
//
// // Helper function to get neighboring cells
// export function getNeighbors(
//   col: number,
//   row: number,
// ): { col: number; row: number }[] {
//   const neighbors = [
//     { col: col - 1, row: row },
//     { col: col + 1, row: row },
//     { col: col, row: row - 1 },
//     { col: col, row: row + 1 },
//   ];
//   return neighbors.filter((neighbor) =>
//     isWithinBounds(neighbor.col, neighbor.row),
//   );
// }
//
// // Export the init function to allow external initialization if needed
// export { init };
