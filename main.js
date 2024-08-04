import { snapToGrid } from "./utils.js";
import {
  initializeGrid,
  drawGrid,
  toggleCell,
  renderGrid,
  dungeonMapperGrid,
} from "./drawing.js";
import {
  startSelection,
  updateSelection,
  endSelection,
  getSelectedCells,
} from "./selection.js";
import {
  initializeToolbar,
  setTool,
  getCurrentColor,
  initializeDebugTool,
} from "./toolbar.js";
import {
  initializeNotes,
  openNoteEditor,
  showNotePopover,
  getNotes,
  setNotes,
} from "./notes.js";
import {
  initializePreview,
  updatePenPreview,
  shapePreview,
  clearPreview,
} from "./preview.js";
import { makeDraggable } from "./draggable.js";
import {
  initializeEdgePreview,
  updateEdgePreview,
  placeEdge,
  loadEdgesFromStorage,
  edges,
} from "./edges.js";
import { ColorMap } from "./colors.js"; // Add this line

const CELL_SIZE = 32;
const GRID_COLOR =
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "#444444"
    : "#cccccc";
const PREVIEW_COLOR = "rgba(0, 255, 0, 0.5)";

let stage, gridLayer, cellLayer, edgeLayer, interactionLayer, debugLayer, debugText;
let chatMessages = [];

// Create a state object to hold shared state
const state = {
  currentTool: "draw",
  isDrawing: false,
  startPos: null,
  debugMode: false,
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds have elapsed since the last time the debounced function was invoked.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {Function} The debounced function.
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Debounced version of the saveToLocalStorage function.
 * It will only call saveToLocalStorage after 1 second of inactivity.
 */
const debouncedSave = debounce(() => {
  saveToLocalStorage();
}, 1000);

// Make saveToLocalStorage accessible in the global scope
window.saveToLocalStorage = saveToLocalStorage;

/**
 * Initializes the application.
 * Sets up the stage, grid, tools, and event listeners.
 */
const init = () => {
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
};

/**
 * Initializes the Konva stage and layers.
 * Sets up the stage container and adds event listeners for drag and drop.
 */
const initializeStage = () => {
  stage = new Konva.Stage({
    container: "map-area",
    width: calculateAvailableWidth(),
    height: window.innerHeight - 206, // Subtract navbar (56px) and library (150px) heights
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
  container.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  // Add debug text
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

/**
 * Handles the drop event for dragged library items.
 * @param {DragEvent} e - The drop event.
 */
// This function is no longer needed, so we'll remove it entirely.

/**
 * Calculates the available width for the stage.
 * @returns {number} The available width in pixels.
 */
function calculateAvailableWidth() {
  const sidebar = document.getElementById("sidebar");
  const resizer = document.getElementById("sidebar-resizer");
  return window.innerWidth - sidebar.offsetWidth - resizer.offsetWidth;
}

/**
 * Handles mouse down events on the stage.
 * @param {Konva.KonvaEventObject} e - The Konva event object.
 */
const handleStageMouseDown = (e) => {
  const pos = stage.getPointerPosition();
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

/**
 * Handles mouse move events on the stage.
 * @param {Konva.KonvaEventObject} e - The Konva event object.
 */
function handleStageMouseMove(e) {
  const pos = stage.getPointerPosition();
  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
  if (state.currentTool === "door" || state.currentTool === "roughLine") {
    updateEdgePreview(pos, CELL_SIZE, state);
  } else if (state.currentTool === "select") {
    updateSelection(pos, CELL_SIZE);
  } else if (state.currentTool === "pen" && state.isDrawing) {
    const x = Math.floor(snappedPos.x / CELL_SIZE);
    const y = Math.floor(snappedPos.y / CELL_SIZE);
    toggleCell(x, y, cellLayer, CELL_SIZE, getCurrentColor());
    debouncedSave(); // Save after toggling a cell
  } else if (state.currentTool == "pen" && !state.isDrawing) {
    updatePenPreview(pos, CELL_SIZE, PREVIEW_COLOR);
  } else if (
    (state.currentTool === "rect" ||
      state.currentTool === "circle" ||
      state.currentTool === "line") &&
    state.isDrawing
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

  // Update debug text
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

/**
 * Handles mouse up events on the stage.
 */
function handleStageMouseUp() {
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
          stage.getPointerPosition().x,
          stage.getPointerPosition().y,
          CELL_SIZE,
        );
        drawShape(state.startPos, endPos, getCurrentColor());
      }
      state.isDrawing = false;
      state.startPos = null;
      clearPreview();
      debouncedSave(); // Save after finishing drawing
    }
  }
}

/**
 * Draws a shape on the cell layer based on the current tool.
 * @param {{x: number, y: number}} startPos - The starting position of the shape.
 * @param {{x: number, y: number}} endPos - The ending position of the shape.
 * @param {number} currentColor - The color enum for the shape.
 */
function drawShape(startPos, endPos, currentColor) {
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

/**
 * Handles keyboard shortcuts for tool selection.
 * @param {KeyboardEvent} event - The keyboard event.
 */
function handleKeyboardShortcuts(event) {
  // Ignore keyboard shortcuts when typing in input fields
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
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
      break; // Add shortcut for rough line tool
  }
}

/**
 * Handles window resize events, adjusting the stage and layers accordingly.
 */
function handleResize() {
  const sidebar = document.getElementById("sidebar");
  const resizer = document.getElementById("sidebar-resizer");
  const libraryContainer = document.getElementById("library-container");
  const newWidth =
    calculateAvailableWidth() - sidebar.offsetWidth - resizer.offsetWidth;
  const newHeight = window.innerHeight - 56 - libraryContainer.offsetHeight; // Adjust for navbar and library height
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

/**
 * Handles color scheme changes (light/dark mode).
 * @param {MediaQueryListEvent} e - The media query change event.
 */
function handleColorSchemeChange(e) {
  stage.batchDraw();
}

/**
 * Saves the current state of the application to local storage.
 */
function saveToLocalStorage() {
  const gridData = {};
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

/**
 * Loads the application state from local storage.
 */
function loadFromLocalStorage() {
  const savedGrid = JSON.parse(localStorage.getItem("dungeonMapperGrid"));
  if (savedGrid) {
    dungeonMapperGrid.clear();
    Object.entries(savedGrid).forEach(([key, colorEnum]) => {
      dungeonMapperGrid.set(key, parseInt(colorEnum));
    });
  }

  const savedNotes = JSON.parse(localStorage.getItem("dungeonMapperNotes"));
  if (savedNotes) {
    setNotes(savedNotes);
  }

  const savedChatMessages = JSON.parse(
    localStorage.getItem("dungeonMapperChatMessages"),
  );
  if (savedChatMessages) {
    chatMessages = savedChatMessages;
  }

  const savedEdges = JSON.parse(localStorage.getItem("dungeonMapperEdges"));
  if (savedEdges) {
    loadEdgesFromStorage(savedEdges, edgeLayer, CELL_SIZE);
  }
}

/**
 * Displays the loaded chat messages in the chat container.
 */
function displayLoadedChatMessages() {
  const chatMessagesContainer = document.getElementById("chat-messages");
  chatMessagesContainer.innerHTML = "";
  chatMessages.forEach((message) => {
    addMessage(message);
  });
}

/**
 * Adds a new message to the chat and saves it to local storage.
 * @param {string} message - The message to add.
 */
function addMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.className = "chat-message";
  messageElement.innerHTML = marked.parse(message);
  document.getElementById("chat-messages").appendChild(messageElement);
  document.getElementById("chat-messages").scrollTop =
    document.getElementById("chat-messages").scrollHeight;

  chatMessages.push(message);
  saveToLocalStorage();
}

/**
 * Adds the currently selected cells to the library.
 */
function addToLibrary() {
  const selectedCells = getSelectedCells(dungeonMapperGrid, CELL_SIZE);
  if (selectedCells.length === 0) return;

  const minCol = Math.min(...selectedCells.map((cell) => cell.col));
  const minRow = Math.min(...selectedCells.map((cell) => cell.row));
  const maxCol = Math.max(...selectedCells.map((cell) => cell.col));
  const maxRow = Math.max(...selectedCells.map((cell) => cell.row));

  const selectedEdgesAndDoors = Array.from(edges).filter(([key, edge]) => {
    const [startX, startY, endX, endY] = key.split(",").map(Number);
    return (
      Math.min(startX, endX) >= minCol * CELL_SIZE &&
      Math.max(startX, endX) <= (maxCol + 1) * CELL_SIZE &&
      Math.min(startY, endY) >= minRow * CELL_SIZE &&
      Math.max(startY, endY) <= (maxRow + 1) * CELL_SIZE
    );
  });

  const libraryItem = {
    cells: selectedCells,
    edgesAndDoors: selectedEdgesAndDoors.map(([key, edge]) => {
      const [startX, startY, endX, endY] = key.split(",").map(Number);
      return {
        ...edge,
        startX: startX - minCol * CELL_SIZE,
        startY: startY - minRow * CELL_SIZE,
        endX: endX - minCol * CELL_SIZE,
        endY: endY - minRow * CELL_SIZE,
      };
    }),
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
  };

  const library = JSON.parse(
    localStorage.getItem("dungeonMapperLibrary") || "[]",
  );
  library.push(libraryItem);
  localStorage.setItem("dungeonMapperLibrary", JSON.stringify(library));

  renderLibraryItem(libraryItem);
}

/**
 * Renders a library item in the library content area.
 * @param {Object} item - The library item to render.
 */
function renderLibraryItem(item) {
  const libraryContent = document.getElementById("library-content");
  const itemElement = document.createElement("div");
  itemElement.className = "library-item";

  const itemContainer = document.createElement("div");
  itemContainer.style.width = `${item.width * 10}px`;
  itemContainer.style.height = `${item.height * 10}px`;
  itemContainer.style.position = "relative";
  itemElement.appendChild(itemContainer);

  const itemStage = new Konva.Stage({
    container: itemContainer,
    width: item.width * 10,
    height: item.height * 10,
  });

  const itemLayer = new Konva.Layer();
  itemStage.add(itemLayer);

  item.cells.forEach((cell) => {
    const rect = new Konva.Rect({
      x: (cell.col - Math.min(...item.cells.map((c) => c.col))) * 10,
      y: (cell.row - Math.min(...item.cells.map((c) => c.row))) * 10,
      width: 10,
      height: 10,
      fill: ColorMap[cell.state],
    });
    itemLayer.add(rect);
  });

  if (item.edgesAndDoors && Array.isArray(item.edgesAndDoors)) {
    item.edgesAndDoors.forEach((edgeOrDoor) => {
      if (edgeOrDoor.type === 'door') {
        const door = generateDoor(
          (edgeOrDoor.startX * 10) / CELL_SIZE,
          (edgeOrDoor.startY * 10) / CELL_SIZE,
          (edgeOrDoor.endX * 10) / CELL_SIZE,
          (edgeOrDoor.endY * 10) / CELL_SIZE,
          10
        );
        itemLayer.add(door);
      } else {
        const line = new Konva.Line({
          points: [
            (edgeOrDoor.startX * 10) / CELL_SIZE,
            (edgeOrDoor.startY * 10) / CELL_SIZE,
            (edgeOrDoor.endX * 10) / CELL_SIZE,
            (edgeOrDoor.endY * 10) / CELL_SIZE,
          ],
          stroke: edgeOrDoor.color,
          strokeWidth: (edgeOrDoor.strokeWidth * 10) / CELL_SIZE,
          lineCap: "round",
          lineJoin: "round",
        });
        itemLayer.add(line);
      }
    });
  }

  itemLayer.draw();
  libraryContent.appendChild(itemElement);

  itemElement.addEventListener("click", () => {
    startLibraryItemPreview(item);
  });
}

function startLibraryItemPreview(item) {
  const previewGroup = new Konva.Group({
    opacity: 0.7,
  });

  item.cells.forEach((cell) => {
    const rect = new Konva.Rect({
      x: cell.col * CELL_SIZE,
      y: cell.row * CELL_SIZE,
      width: CELL_SIZE,
      height: CELL_SIZE,
      fill: ColorMap[cell.state],
    });
    previewGroup.add(rect);
  });

  if (item.edgesAndDoors && Array.isArray(item.edgesAndDoors)) {
    item.edgesAndDoors.forEach((edgeOrDoor) => {
      if (edgeOrDoor.type === 'door') {
        const door = generateDoor(
          edgeOrDoor.startX,
          edgeOrDoor.startY,
          edgeOrDoor.endX,
          edgeOrDoor.endY,
          CELL_SIZE
        );
        previewGroup.add(door);
      } else {
        const line = new Konva.Line({
          points: [edgeOrDoor.startX, edgeOrDoor.startY, edgeOrDoor.endX, edgeOrDoor.endY],
          stroke: edgeOrDoor.color,
          strokeWidth: edgeOrDoor.strokeWidth,
          lineCap: "round",
          lineJoin: "round",
        });
        previewGroup.add(line);
      }
    });
  }

  interactionLayer.add(previewGroup);

  const handleMouseMove = (e) => {
    const pos = stage.getPointerPosition();
    const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
    previewGroup.position({
      x: snappedPos.x - item.cells[0].col * CELL_SIZE,
      y: snappedPos.y - item.cells[0].row * CELL_SIZE,
    });
    interactionLayer.batchDraw();
  };

  const handleClick = (e) => {
    const pos = stage.getPointerPosition();
    const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
    const offsetX = Math.floor(snappedPos.x / CELL_SIZE) - item.cells[0].col;
    const offsetY = Math.floor(snappedPos.y / CELL_SIZE) - item.cells[0].row;

    item.cells.forEach((cell) => {
      toggleCell(
        cell.col + offsetX,
        cell.row + offsetY,
        cellLayer,
        CELL_SIZE,
        cell.state,
      );
    });

    if (item.edgesAndDoors && Array.isArray(item.edgesAndDoors)) {
      item.edgesAndDoors.forEach((edgeOrDoor) => {
        const newEdgeOrDoor = {
          ...edgeOrDoor,
          startX: edgeOrDoor.startX + offsetX * CELL_SIZE,
          startY: edgeOrDoor.startY + offsetY * CELL_SIZE,
          endX: edgeOrDoor.endX + offsetX * CELL_SIZE,
          endY: edgeOrDoor.endY + offsetY * CELL_SIZE,
        };
        placeEdge(edgeLayer, CELL_SIZE, newEdgeOrDoor);
      });
    }

    previewGroup.destroy();
    interactionLayer.batchDraw();
    cellLayer.batchDraw();
    edgeLayer.batchDraw();
    debouncedSave();

    stage.off("mousemove", handleMouseMove);
    stage.off("click", handleClick);
  };

  stage.on("mousemove", handleMouseMove);
  stage.on("click", handleClick);
}

/**
 * Loads the library items from local storage and renders them.
 */
function loadLibrary() {
  const library = JSON.parse(
    localStorage.getItem("dungeonMapperLibrary") || "[]",
  );
  library.forEach(renderLibraryItem);
}

/**
 * Initializes DOM elements and sets up event listeners.
 */
function initializeDOMElements() {
  // Make the floating tools window draggable by its title bar
  const floatingTools = document.getElementById("floating-tools");
  const floatingToolsHandle = floatingTools.querySelector(".window-title");

  // Make the note editor draggable by its title bar
  const noteEditor = document.getElementById("note-editor");
  const noteEditorHandle = noteEditor.querySelector(".window-title");
  makeDraggable(floatingTools, floatingToolsHandle);
  makeDraggable(noteEditor, noteEditorHandle);
  // Ensure the makeDraggable function is called after a short delay
  setTimeout(() => {
    makeDraggable(floatingTools, floatingToolsHandle);
    makeDraggable(noteEditor, noteEditorHandle);
  }, 100);

  // Sidebar resizing functionality
  const resizer = document.getElementById("sidebar-resizer");
  const sidebar = document.getElementById("sidebar");
  const canvasContainer = document.getElementById("canvas-container");

  let isResizing = false;

  resizer.addEventListener("mousedown", (e) => {
    isResizing = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResize);
  });

  function handleMouseMove(e) {
    if (!isResizing) return;
    const containerWidth = document.querySelector(".content").offsetWidth;
    const newWidth = containerWidth - e.clientX;
    sidebar.style.width = `${newWidth}px`;
    canvasContainer.style.width = `${containerWidth - newWidth - 5}px`; // 5px for resizer width
    handleResize(); // Update canvas size
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener("mousemove", handleMouseMove);
  }

  // Chat functionality
  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");

  function handleSendMessage() {
    const message = chatInput.value.trim();
    if (message) {
      addMessage(message);
      chatInput.value = "";
    }
  }

  chatSend.addEventListener("click", handleSendMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  const addToLibraryButton = document.createElement("button");
  addToLibraryButton.textContent = "Add to Library";
  addToLibraryButton.className = "btn btn-primary";
  addToLibraryButton.addEventListener("click", addToLibrary);
  document.getElementById("library-header").appendChild(addToLibraryButton);

  loadLibrary();
}

// Initialize marked with some options for safety
marked.setOptions({
  sanitize: true,
  breaks: true,
});

init();
