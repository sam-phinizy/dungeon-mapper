import { snapToGrid } from './utils.js';
import { initializeGrid, drawGrid, toggleCell, renderGrid, dungeonMapperGrid } from './drawing.js';
import { startSelection, updateSelection, endSelection, clearSelection } from './selection.js';
import { initializeToolbar, setTool, getCurrentColor } from './toolbar.js';
import { initializeNotes, openNoteEditor, showNotePopover, getNotes, setNotes } from './notes.js';
import { initializePreview, updatePenPreview, shapePreview, clearPreview } from './preview.js';
import { makeDraggable } from './draggable.js';
import { initializeEdgePreview, updateEdgePreview, placeEdge, clearEdges, edges } from './edges.js';

const CELL_SIZE = 32;
const GRID_COLOR = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#444444' : '#cccccc';
const PREVIEW_COLOR = 'rgba(0, 255, 0, 0.5)';

let stage, gridLayer, cellLayer, edgeLayer, selectionLayer, previewLayer;
let chatMessages = [];

// Create a state object to hold shared state
const state = {
  currentTool: 'draw',
  isDrawing: false,
  startPos: null
};

// Debounce function
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

// Debounced save function
const debouncedSave = debounce(() => {
  saveToLocalStorage();
}, 1000);

// Make saveToLocalStorage accessible in the global scope
window.saveToLocalStorage = saveToLocalStorage;

function init() {
  initializeStage();
  initializeGrid(stage, cellLayer, CELL_SIZE);
  initializeEdgePreview(previewLayer);
  initializeToolbar();
  initializeNotes();
  initializePreview(previewLayer);

  stage.on('mousedown touchstart', handleStageMouseDown);
  stage.on('mousemove touchmove', handleStageMouseMove);
  stage.on('mouseup touchend', handleStageMouseUp);

  // Load saved data from local storage
  loadFromLocalStorage();

  // Render the grid based on loaded data
  renderGrid(cellLayer, CELL_SIZE);
  // Display loaded chat messages
  displayLoadedChatMessages();

  // Add keyboard event listener for tool switching
  document.addEventListener('keydown', handleKeyboardShortcuts);

  window.addEventListener('resize', handleResize);

  // Listen for changes in color scheme
  window.matchMedia('(prefers-color-scheme: dark)').addListener(handleColorSchemeChange);

  setTool('pen'); // Set initial tool to pen

  initializeDOMElements();
}

function initializeStage() {
  stage = new Konva.Stage({
    container: 'canvas-container',
    width: calculateAvailableWidth(),
    height: window.innerHeight,
  });

  gridLayer = new Konva.Layer();
  cellLayer = new Konva.Layer();
  edgeLayer = new Konva.Layer();
  selectionLayer = new Konva.Layer();
  previewLayer = new Konva.Layer();

  stage.add(gridLayer);
  stage.add(cellLayer);
  stage.add(edgeLayer);
  stage.add(selectionLayer);
  stage.add(previewLayer);

  // Make these layers globally accessible
  window.stage = stage;
  window.gridLayer = gridLayer;
  window.cellLayer = cellLayer;
  window.edgeLayer = edgeLayer;
  window.selectionLayer = selectionLayer;
  window.CELL_SIZE = CELL_SIZE;
  window.state = state;
}

function calculateAvailableWidth() {
  return window.innerWidth;
}

function handleStageMouseDown(e) {
  const pos = stage.getPointerPosition();
  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
  if (state.currentTool === 'door' || state.currentTool === 'roughLine') {
    placeEdge(edgeLayer, CELL_SIZE);
    debouncedSave(); // Save after placing an edge
  } else if (state.currentTool === 'select') {
    startSelection(snappedPos, selectionLayer, CELL_SIZE);
  } else if (state.currentTool === 'pen') {
    state.isDrawing = true;
    const x = Math.floor(snappedPos.x / CELL_SIZE);
    const y = Math.floor(snappedPos.y / CELL_SIZE);
    toggleCell(x, y, cellLayer, CELL_SIZE, getCurrentColor());
    debouncedSave(); // Save after toggling a cell
  } else if (state.currentTool === 'rect' || state.currentTool === 'circle' || state.currentTool === 'line') {
    state.isDrawing = true;
    state.startPos = snappedPos;
  } else if (state.currentTool === 'notes') {
    const x = Math.floor(snappedPos.x / CELL_SIZE);
    const y = Math.floor(snappedPos.y / CELL_SIZE);
    openNoteEditor(x, y);
  }
}

function handleStageMouseMove(e) {
  const pos = stage.getPointerPosition();
  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
  if (state.currentTool === 'door' || state.currentTool === 'roughLine') {
    updateEdgePreview(pos, CELL_SIZE, state);
  } else if (state.currentTool === 'select') {
    updateSelection(pos, CELL_SIZE);
  } else if (state.currentTool === 'pen' && state.isDrawing) {
    const x = Math.floor(snappedPos.x / CELL_SIZE);
    const y = Math.floor(snappedPos.y / CELL_SIZE);
    toggleCell(x, y, cellLayer, CELL_SIZE, getCurrentColor());
    debouncedSave(); // Save after toggling a cell
  } else if (state.currentTool == 'pen' && !state.isDrawing) {
    updatePenPreview(pos, CELL_SIZE, PREVIEW_COLOR);
  } else if ((state.currentTool === 'rect' || state.currentTool === 'circle' || state.currentTool === 'line') && state.isDrawing) {
    shapePreview(state.startPos, snappedPos, state.currentTool, CELL_SIZE, PREVIEW_COLOR);
  } else if (state.currentTool === 'notes') {
    const row = Math.floor(snappedPos.y / CELL_SIZE);
    const col = Math.floor(snappedPos.x / CELL_SIZE);
    showNotePopover(row, col, pos);
  }
}

function handleStageMouseUp() {
  if (state.currentTool === 'select') {
    endSelection();
  } else if (state.currentTool === 'pen' || state.currentTool === 'rect' || state.currentTool === 'circle' || state.currentTool === 'line') {
    if (state.isDrawing) {
      if (state.currentTool !== 'pen') {
        const endPos = snapToGrid(stage.getPointerPosition().x, stage.getPointerPosition().y, CELL_SIZE);
        drawShape(state.startPos, endPos, getCurrentColor());
      }
      state.isDrawing = false;
      state.startPos = null;
      clearPreview();
      debouncedSave(); // Save after finishing drawing
    }
  }
}

function drawShape(startPos, endPos, currentColor) {
  const startCol = Math.floor(startPos.x / CELL_SIZE);
  const startRow = Math.floor(startPos.y / CELL_SIZE);
  const endCol = Math.floor(endPos.x / CELL_SIZE);
  const endRow = Math.floor(endPos.y / CELL_SIZE);

  if (state.currentTool === 'rect') {
    for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
      for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
        toggleCell(col, row, cellLayer, CELL_SIZE, currentColor);
      }
    }
  } else if (state.currentTool === 'circle') {
    const centerRow = (startRow + endRow) / 2;
    const centerCol = (startCol + endCol) / 2;
    const radius = Math.sqrt(Math.pow(endRow - startRow, 2) + Math.pow(endCol - startCol, 2)) / 2;

    for (let row = Math.floor(centerRow - radius); row <= Math.ceil(centerRow + radius); row++) {
      for (let col = Math.floor(centerCol - radius); col <= Math.ceil(centerCol + radius); col++) {
        if (Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2) <= Math.pow(radius, 2)) {
          toggleCell(col, row, cellLayer, CELL_SIZE, currentColor);
        }
      }
    }
  } else if (state.currentTool === 'line') {
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

function handleKeyboardShortcuts(event) {
  // Ignore keyboard shortcuts when typing in input fields
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }

  switch (event.key.toLowerCase()) {
    case 'p': setTool('pen'); break;
    case 'r': setTool('rect'); break;
    case 'c': setTool('circle'); break;
    case 'l': setTool('line'); break;
    case 's': setTool('select'); break;
    case 'd': setTool('door'); break;
    case 'n': setTool('notes'); break;
    case 'u': setTool('roughLine'); break; // Add shortcut for rough line tool
  }
}


function handleResize() {
  const sidebar = document.getElementById('sidebar');
  const resizer = document.getElementById('sidebar-resizer');
  const newWidth = calculateAvailableWidth() - sidebar.offsetWidth - resizer.offsetWidth;
  const newHeight = window.innerHeight - 56; // Adjust for navbar height
  stage.width(newWidth);
  stage.height(newHeight);
  gridLayer.width(newWidth);
  gridLayer.height(newHeight);
  cellLayer.width(newWidth);
  cellLayer.height(newHeight);
  edgeLayer.width(newWidth);
  edgeLayer.height(newHeight);
  selectionLayer.width(newWidth);
  selectionLayer.height(newHeight);
  previewLayer.width(newWidth);
  previewLayer.height(newHeight);

  drawGrid(stage, gridLayer, CELL_SIZE, GRID_COLOR);
  stage.batchDraw();
}


function handleColorSchemeChange(e) {
  stage.batchDraw();
}


function loadFromLocalStorage() {
  const savedGrid = JSON.parse(localStorage.getItem('dungeonMapperGrid'));
  if (savedGrid) {
    dungeonMapperGrid.clear();
    Object.entries(savedGrid).forEach(([key, colorEnum]) => {
      dungeonMapperGrid.set(key, parseInt(colorEnum));
    });
  }

  const savedNotes = JSON.parse(localStorage.getItem('dungeonMapperNotes'));
  if (savedNotes) {
    setNotes(savedNotes);
  }

  const savedChatMessages = JSON.parse(localStorage.getItem('dungeonMapperChatMessages'));
  if (savedChatMessages) {
    chatMessages = savedChatMessages;
  }

  const savedEdges = JSON.parse(localStorage.getItem('dungeonMapperEdges'));
  if (savedEdges) {
    edges.clear();
    savedEdges.forEach(([key, value]) => {
      edges.set(key, value);
    });
    edgeLayer.batchDraw();
  }
}


function saveToLocalStorage() {
  const gridData = {};
  for (const [key, colorEnum] of dungeonMapperGrid) {
    gridData[key] = colorEnum;
  }
  console.log(`Saving to local storage: ${JSON.stringify(gridData)}`)

  localStorage.setItem('dungeonMapperGrid', JSON.stringify(gridData));
  localStorage.setItem('dungeonMapperNotes', JSON.stringify(getNotes()));
  localStorage.setItem('dungeonMapperChatMessages', JSON.stringify(chatMessages));
  localStorage.setItem('dungeonMapperEdges', JSON.stringify(Array.from(edges)));
  console.log('Saved to local storage');
}

function displayLoadedChatMessages() {
  const chatMessagesContainer = document.getElementById('chat-messages');
  chatMessagesContainer.innerHTML = '';
  chatMessages.forEach(message => {
    addMessage(message);
  });
}

function addMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message';
  messageElement.innerHTML = marked.parse(message);
  document.getElementById('chat-messages').appendChild(messageElement);
  document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;

  chatMessages.push(message);
  saveToLocalStorage();
}

function initializeDOMElements() {
  console.log("initialize")
  // Make the floating tools window draggable by its title bar
  const floatingTools = document.getElementById('floating-tools');
  const floatingToolsHandle = floatingTools.querySelector('.window-title');

  // Make the note editor draggable by its title bar
  const noteEditor = document.getElementById('note-editor');
  const noteEditorHandle = noteEditor.querySelector('.window-title');
  makeDraggable(floatingTools, floatingToolsHandle);
  makeDraggable(noteEditor, noteEditorHandle);
  // Ensure the makeDraggable function is called after a short delay
  setTimeout(() => {
    makeDraggable(floatingTools, floatingToolsHandle);
    makeDraggable(noteEditor, noteEditorHandle);
  }, 100);

  // Sidebar resizing functionality
  const resizer = document.getElementById('sidebar-resizer');
  const sidebar = document.getElementById('sidebar');
  const canvasContainer = document.getElementById('canvas-container');

  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
  });

  function handleMouseMove(e) {
    if (!isResizing) return;
    const containerWidth = document.querySelector('.content').offsetWidth;
    const newWidth = containerWidth - e.clientX;
    sidebar.style.width = `${newWidth}px`;
    canvasContainer.style.width = `${containerWidth - newWidth - 5}px`; // 5px for resizer width
    handleResize(); // Update canvas size
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
  }

  // Chat functionality
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

  function handleSendMessage() {
    const message = chatInput.value.trim();
    if (message) {
      addMessage(message);
      chatInput.value = '';
    }
  }

  chatSend.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  });
}

// Initialize marked with some options for safety
marked.setOptions({
  sanitize: true,
  breaks: true
});

init();
