import Konva from "konva";
import { snapToGrid } from "./utils";
import {
  initializeGrid,
  drawGrid,
  toggleCell,
  renderGrid,
  dungeonMapperGrid,
} from "./drawing";
import {
  startSelection,
  updateSelection,
  endSelection,
  getSelectedCells,
  clearSelection,
} from "./selection";
import {
  initializeToolbar,
  setTool,
  getCurrentColor,
  initializeDebugTool,
} from "./toolbar";
import {
  initializeNotes,
  openNoteEditor,
  showNotePopover,
  getNotes,
  setNotes,
} from "./notes";
import {
  initializePreview,
  updatePenPreview,
  shapePreview,
  clearPreview,
} from "./preview";
import { makeDraggable } from "./draggable";
import {
  initializeEdgePreview,
  updateEdgePreview,
  placeEdge,
  loadEdgesFromStorage,
  edges,
} from "./edges";
import { ColorMap, ColorEnum } from "./colors";

const CELL_SIZE = 32;
const GRID_COLOR =
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "#444444"
    : "#cccccc";
const PREVIEW_COLOR = "rgba(0, 255, 0, 0.5)";

let stage: Konva.Stage;
let gridLayer: Konva.Layer;
let cellLayer: Konva.Layer;
let edgeLayer: Konva.Layer;
let interactionLayer: Konva.Layer;
let debugLayer: Konva.Layer;
let debugText: Konva.Text;
let chatMessages: string[] = [];

interface State {
  currentTool: string;
  isDrawing: boolean;
  startPos: { x: number; y: number } | null;
  debugMode: boolean;
}

const state: State = {
  currentTool: "draw",
  isDrawing: false,
  startPos: null,
  debugMode: false,
};

function debounce<F extends (...args: any[]) => void>(
  func: F,
  wait: number,
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<F>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedSave = debounce(() => {
  saveToLocalStorage();
}, 1000);

(window as any).saveToLocalStorage = saveToLocalStorage;

const init = (): void => {
  initializeStage();
  initializeGrid(stage, cellLayer, CELL_SIZE);
  initializeEdgePreview(interactionLayer);
  initializeToolbar();
  initializeNotes();
  initializePreview(interactionLayer);
  initializeDebugTool();

  stage.on("mousedown touchstart", handleStageMouseDown);
  stage.on("mousemove touchmove", handleStageMouseMove);
  stage.on("mouseup touchend", handleStageMouseUp);

  loadFromLocalStorage();
  renderGrid(cellLayer, CELL_SIZE);
  displayLoadedChatMessages();

  document.addEventListener("keydown", handleKeyboardShortcuts);
  window.addEventListener("resize", handleResize);
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addListener(handleColorSchemeChange);

  setTool("pen");
  initializeDOMElements();

  (window as any).clearGrid = clearMap;
  (window as any).edges = edges;
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
  e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
): void => {
  const pos = stage.getPointerPosition();
  if (!pos) return;
  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);

  switch (state.currentTool) {
    case "door":
    case "roughLine":
      placeEdge(edgeLayer, CELL_SIZE);
      debouncedSave();
      break;
    case "select":
      startSelection(snappedPos, interactionLayer, CELL_SIZE);
      break;
    case "pen":
      state.isDrawing = true;
      const { x, y } = snappedPos;
      toggleCell(
        Math.floor(x / CELL_SIZE),
        Math.floor(y / CELL_SIZE),
        cellLayer,
        CELL_SIZE,
        getCurrentColor(),
      );
      debouncedSave();
      break;
    case "rect":
    case "circle":
    case "line":
      state.isDrawing = true;
      state.startPos = snappedPos;
      break;
    case "notes":
      const { x: noteX, y: noteY } = snappedPos;
      openNoteEditor(
        Math.floor(noteX / CELL_SIZE),
        Math.floor(noteY / CELL_SIZE),
      );
      break;
  }
};
function handleStageMouseMove(
  e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
): void {
  const pos = stage.getPointerPosition();
  if (!pos) return;
  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
  if (state.currentTool === "door" || state.currentTool === "roughLine") {
    updateEdgePreview(pos, CELL_SIZE, state);
  } else if (state.currentTool === "select") {
    updateSelection(pos, CELL_SIZE);
  } else if (state.currentTool === "pen" && state.isDrawing) {
    const x = Math.floor(snappedPos.x / CELL_SIZE);
    const y = Math.floor(snappedPos.y / CELL_SIZE);
    toggleCell(x, y, cellLayer, CELL_SIZE, getCurrentColor());
    debouncedSave();
  } else if (state.currentTool == "pen" && !state.isDrawing) {
    updatePenPreview(pos, CELL_SIZE, PREVIEW_COLOR);
  } else if (
    (state.currentTool === "rect" ||
      state.currentTool === "circle" ||
      state.currentTool === "line") &&
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
  } else if (state.currentTool === "notes") {
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
  if (state.currentTool === "select") {
    endSelection();
  } else if (
    state.currentTool === "pen" ||
    state.currentTool === "rect" ||
    state.currentTool === "circle" ||
    state.currentTool === "line"
  ) {
    if (state.isDrawing) {
      if (state.currentTool !== "pen") {
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
      debouncedSave();
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

  if (state.currentTool === "rect") {
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
        toggleCell(col, row, cellLayer, CELL_SIZE, currentColor);
      }
    }
  } else if (state.currentTool === "circle") {
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
          toggleCell(col, row, cellLayer, CELL_SIZE, currentColor);
        }
      }
    }
  } else if (state.currentTool === "line") {
    const dx = Math.abs(endCol - startCol);
    const dy = Math.abs(endRow - startRow);
    const sx = startCol < endCol ? 1 : -1;
    const sy = startRow < endRow ? 1 : -1;
    let err = dx - dy;

    let row = startRow;
    let col = startCol;

    while (true) {
      toggleCell(col, row, cellLayer, CELL_SIZE, currentColor);

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
      setTool("pen");
      break;
    case "r":
      setTool("rect");
      break;
    case "c":
      setTool("circle");
      break;
    case "l":
      setTool("line");
      break;
    case "s":
      setTool("select");
      break;
    case "d":
      setTool("door");
      break;
    case "n":
      setTool("notes");
      break;
    case "u":
      setTool("roughLine");
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

  drawGrid(stage, gridLayer, CELL_SIZE, GRID_COLOR);
  stage.batchDraw();
}

function handleColorSchemeChange(e: MediaQueryListEvent): void {
  stage.batchDraw();
}

function saveToLocalStorage(): void {
  const gridData: Record<string, ColorEnum> = {};
  for (const [key, colorEnum] of dungeonMapperGrid) {
    gridData[key] = colorEnum;
  }
  localStorage.setItem("dungeonMapperGrid", JSON.stringify(gridData));
  localStorage.setItem("dungeonMapperNotes", JSON.stringify(getNotes()));
  localStorage.setItem(
    "dungeonMapperChatMessages",
    JSON.stringify(chatMessages),
  );
  localStorage.setItem("dungeonMapperEdges", JSON.stringify(Array.from(edges)));
}

function loadFromLocalStorage(): void {
  const savedGrid = JSON.parse(
    localStorage.getItem("dungeonMapperGrid") || "{}",
  );
  Object.entries(savedGrid).forEach(([key, value]) => {
    dungeonMapperGrid.set(key, value as ColorEnum);
  });

  const savedNotes = JSON.parse(
    localStorage.getItem("dungeonMapperNotes") || "{}",
  );
  setNotes(savedNotes);

  const savedChatMessages = JSON.parse(
    localStorage.getItem("dungeonMapperChatMessages") || "[]",
  );
  chatMessages = savedChatMessages;

  const savedEdges = JSON.parse(
    localStorage.getItem("dungeonMapperEdges") || "[]",
  );
  loadEdgesFromStorage(savedEdges, edgeLayer, CELL_SIZE);
}

function displayLoadedChatMessages(): void {
  const chatMessagesElement = document.getElementById("chat-messages");
  if (chatMessagesElement) {
    chatMessagesElement.innerHTML = chatMessages.join("<br>");
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
  }
}

function clearMap(): void {
  dungeonMapperGrid.clear();
  cellLayer.destroyChildren();
  cellLayer.draw();
  edges.clear();
  edgeLayer.destroyChildren();
  edgeLayer.draw();
  saveToLocalStorage();
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
        saveToLocalStorage();
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
