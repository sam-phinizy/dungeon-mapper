import Konva from "konva";
import {
  debouncedSave,
  loadFromLocalStorage,
  saveToLocalStorage,
  snapToGrid,
} from "./utils";
import { renderGrid, toggleCell } from "./drawing";
import { endSelection, startSelection, updateSelection } from "./selection";
import {
  getCurrentColor,
  initializeDebugTool,
  initializeToolbar,
  setTool,
} from "./toolbar";
import { initializeNotes, openNoteEditor, showNotePopover } from "./notes";
import {
  clearPreview,
  initializePreview,
  shapePreview,
  updatePenPreview,
} from "./preview";
import { makeDraggable } from "./draggable";
import {
  type EdgeData,
  initializeEdgePreview,
  loadEdgesFromStorage,
  placeEdge,
  updateEdgePreview,
} from "./edges";
import { ColorEnum } from "./colors";
import { ToolType } from "./tooltypes.ts";
import { dataEvents, emitDataDirtied } from "./events.ts";

const CELL_SIZE = 32;
const PREVIEW_COLOR = "rgba(0, 255, 0, 0.5)";

let stage: Konva.Stage;
let gridLayer: Konva.Layer;
let cellLayer: Konva.Layer;
let edgeLayer: Konva.Layer;
let interactionLayer: Konva.Layer;
let debugLayer: Konva.Layer;
let debugText: Konva.Text;
let chatMessages: string[] = [];
export type DungeonMapGrid = Map<string, ColorEnum>;

interface State {
  currentTool: ToolType;
  isDrawing: boolean;
  startPos: { x: number; y: number } | null;
  debugMode: boolean;
  dungeonMapperGrid: DungeonMapGrid;
  edges: Map<string, EdgeData>;
}

const state: State = {
  currentTool: ToolType.PEN,
  isDrawing: false,
  startPos: null,
  debugMode: false,
  dungeonMapperGrid: new Map<string, ColorEnum>(),
  edges: new Map<string, EdgeData>(),
};

(window as any).saveToLocalStorage = saveToLocalStorage;
(window as any).debouncedSave = debouncedSave;

let saveIndicator: Konva.Circle;
let savePopover: Konva.Text;

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
  initializeStage();
  cellLayer.draw();
  initializeEdgePreview(interactionLayer);
  initializeToolbar();
  initializeNotes();
  initializePreview(interactionLayer);
  initializeDebugTool();

  const { gridData, edges: savedEdges } = loadFromLocalStorage();
  state.dungeonMapperGrid = gridData;
  loadEdgesFromStorage(state.edges, savedEdges, edgeLayer, CELL_SIZE);

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

  renderGrid(state.dungeonMapperGrid, cellLayer, CELL_SIZE);
  cellLayer.batchDraw();
  displayLoadedChatMessages();

  document.addEventListener("keydown", handleKeyboardShortcuts);
  window.addEventListener("resize", handleResize);
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addListener(handleColorSchemeChange);

  setTool(ToolType.PEN);
  initializeDOMElements();

  (window as any).clearGrid = clearMap;
};
const initializeStage = (): void => {
  stage = new Konva.Stage({
    container: "map-area",
    width: calculateAvailableWidth(),
    height: window.innerHeight - 206,
  });

  gridLayer = new Konva.Layer();
  cellLayer = new Konva.Layer();
  edgeLayer = new Konva.Layer();
  interactionLayer = new Konva.Layer();
  debugLayer = new Konva.Layer();

  stage.add(gridLayer, cellLayer, edgeLayer, interactionLayer, debugLayer);

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
    gridLayer,
    cellLayer,
    edgeLayer,
    interactionLayer,
    debugLayer,
    debugText,
    CELL_SIZE,
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

const handleStageMouseDown = (
  _: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
): void => {
  const pos = stage.getPointerPosition();
  if (!pos) return;
  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);

  switch (state.currentTool) {
    case ToolType.DOOR:
    case ToolType.ROUGH_LINE:
      placeEdge(edgeLayer, state.edges, CELL_SIZE, state);
      break;
    case ToolType.SELECT:
      startSelection(snappedPos, interactionLayer, CELL_SIZE);
      break;
    case ToolType.PEN:
      state.isDrawing = true;
      const { x, y } = snappedPos;
      toggleCell(
        Math.floor(x / CELL_SIZE),
        Math.floor(y / CELL_SIZE),
        cellLayer,
        CELL_SIZE,
        getCurrentColor(),
        state.dungeonMapperGrid,
      );
      break;
    case ToolType.RECT:
    case ToolType.CIRCLE:
    case ToolType.LINE:
      state.isDrawing = true;
      state.startPos = snappedPos;
      break;
    case ToolType.NOTES:
      const { x: noteX, y: noteY } = snappedPos;
      openNoteEditor(
        Math.floor(noteX / CELL_SIZE),
        Math.floor(noteY / CELL_SIZE),
      );
      break;
  }
  emitDataDirtied();
  debouncedSave(state.dungeonMapperGrid, state.edges);
};

function handleStageMouseMove(
  _: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
): void {
  const pos = stage.getPointerPosition();
  if (!pos) return;
  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
  if (
    state.currentTool === ToolType.DOOR ||
    state.currentTool === ToolType.ROUGH_LINE
  ) {
    updateEdgePreview(pos, CELL_SIZE, state);
  } else if (state.currentTool === ToolType.SELECT) {
    updateSelection(pos, CELL_SIZE);
  } else if (state.currentTool === ToolType.PEN && state.isDrawing) {
    const x = Math.floor(snappedPos.x / CELL_SIZE);
    const y = Math.floor(snappedPos.y / CELL_SIZE);
    toggleCell(
      x,
      y,
      cellLayer,
      CELL_SIZE,
      getCurrentColor(),
      state.dungeonMapperGrid,
    );
    debouncedSave(state.dungeonMapperGrid);
  } else if (state.currentTool === ToolType.PEN && !state.isDrawing) {
    updatePenPreview(pos, CELL_SIZE, PREVIEW_COLOR);
  } else if (
    (state.currentTool === ToolType.RECT ||
      state.currentTool === ToolType.CIRCLE ||
      state.currentTool === ToolType.LINE) &&
    state.isDrawing &&
    state.startPos
  ) {
    shapePreview(
      state.startPos,
      snappedPos,
      state.currentTool,
      CELL_SIZE,
      PREVIEW_COLOR,
    );
  } else if (state.currentTool === ToolType.NOTES) {
    const row = Math.floor(snappedPos.y / CELL_SIZE);
    const col = Math.floor(snappedPos.x / CELL_SIZE);
    showNotePopover(row, col, pos);
  }

  if (state.debugMode) {
    const cellX = Math.floor(pos.x / CELL_SIZE);
    const cellY = Math.floor(pos.y / CELL_SIZE);
    debugText.text(`X: ${cellX}, Y: ${cellY}`);
    debugText.position({
      x: pos.x + 10,
      y: pos.y + 10,
    });
    debugText.visible(true);
    debugLayer.batchDraw();
  } else {
    debugText.visible(false);
    debugLayer.batchDraw();
  }
}

function handleStageMouseUp(): void {
  if (state.currentTool === ToolType.SELECT) {
    endSelection();
  } else if (
    state.currentTool === ToolType.PEN ||
    state.currentTool === ToolType.RECT ||
    state.currentTool === ToolType.CIRCLE ||
    state.currentTool === ToolType.LINE
  ) {
    if (state.isDrawing) {
      if (state.currentTool !== ToolType.PEN) {
        const endPos = snapToGrid(
          stage.getPointerPosition()!.x,
          stage.getPointerPosition()!.y,
          CELL_SIZE,
        );
        drawShape(state.startPos!, endPos, getCurrentColor());
      }
      state.isDrawing = false;
      state.startPos = null;
      clearPreview();
      debouncedSave(state.dungeonMapperGrid);
    }
  }
}

function drawShape(
  startPos: { x: number; y: number },
  endPos: { x: number; y: number },
  currentColor: ColorEnum,
): void {
  const startCol = Math.floor(startPos.x / CELL_SIZE);
  const startRow = Math.floor(startPos.y / CELL_SIZE);
  const endCol = Math.floor(endPos.x / CELL_SIZE);
  const endRow = Math.floor(endPos.y / CELL_SIZE);

  if (state.currentTool === ToolType.RECT) {
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
        toggleCell(
          col,
          row,
          cellLayer,
          CELL_SIZE,
          currentColor,
          state.dungeonMapperGrid,
        );
      }
    }
  } else if (state.currentTool === ToolType.CIRCLE) {
    const centerRow = (startRow + endRow) / 2;
    const centerCol = (startCol + endCol) / 2;
    const radius =
      Math.sqrt(
        Math.pow(endRow - startRow, 2) + Math.pow(endCol - startCol, 2),
      ) / 2;

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
          toggleCell(
            col,
            row,
            cellLayer,
            CELL_SIZE,
            currentColor,
            state.dungeonMapperGrid,
          );
        }
      }
    }
  } else if (state.currentTool === ToolType.LINE) {
    const dx = Math.abs(endCol - startCol);
    const dy = Math.abs(endRow - startRow);
    const sx = startCol < endCol ? 1 : -1;
    const sy = startRow < endRow ? 1 : -1;
    let err = dx - dy;

    let row = startRow;
    let col = startCol;

    while (true) {
      toggleCell(
        col,
        row,
        cellLayer,
        CELL_SIZE,
        currentColor,
        state.dungeonMapperGrid,
      );

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
  }
  emitDataDirtied();
  cellLayer.batchDraw();
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
      setTool(ToolType.PEN);
      break;
    case "r":
      setTool(ToolType.RECT);
      break;
    case "c":
      setTool(ToolType.CIRCLE);
      break;
    case "l":
      setTool(ToolType.LINE);
      break;
    case "s":
      setTool(ToolType.SELECT);
      break;
    case "d":
      setTool(ToolType.DOOR);
      break;
    case "n":
      setTool(ToolType.NOTES);
      break;
    case "u":
      setTool(ToolType.ROUGH_LINE);
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
  gridLayer.width(newWidth);
  gridLayer.height(newHeight);
  cellLayer.width(newWidth);
  cellLayer.height(newHeight);
  edgeLayer.width(newWidth);
  edgeLayer.height(newHeight);
  interactionLayer.width(newWidth);
  interactionLayer.height(newHeight);

  gridLayer.draw();

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

init();
