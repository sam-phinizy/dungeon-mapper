// main.js

import { snapToGrid } from './utils.js';
import { initializeDoorPreview, updateDoorPreview, placeDoor, clearDoors, doors } from './doors.js';
import { initializeGrid, drawGrid, toggleCell, clearGrid, renderGrid, dungeonMapperGrid } from './drawing.js';
import { startSelection, updateSelection, endSelection, getSelectedCells, clearSelection } from './selection.js';

const WALL_COLOR = '#1a1a1a';
const PATH_COLOR = '#1a1a1a';

let notes = {};
let chatMessages = [];

// Load saved data from local storage
function loadFromLocalStorage() {
  const savedGrid = JSON.parse(localStorage.getItem('dungeonMapperGrid'));
  if (savedGrid) {
    dungeonMapperGrid.clear();
    Object.entries(savedGrid).forEach(([key, value]) => {
      dungeonMapperGrid.set(key, value);
    });
  }

  const savedNotes = JSON.parse(localStorage.getItem('dungeonMapperNotes'));
  if (savedNotes) {
    notes = savedNotes;
    // Highlight cells with notes
    for (const key in notes) {
      const [row, col] = key.split('-').map(Number);
      highlightNoteCell(row, col);
    }
  }

  const savedChatMessages = JSON.parse(localStorage.getItem('dungeonMapperChatMessages'));
  if (savedChatMessages) {
    chatMessages = savedChatMessages;
  }
  saveToLocalStorage(); // Save the updated grid to localStorage
}

// Save data to local storage
function saveToLocalStorage() {
  localStorage.setItem('dungeonMapperGrid', JSON.stringify(Object.fromEntries(dungeonMapperGrid)));
  localStorage.setItem('dungeonMapperNotes', JSON.stringify(notes));
  localStorage.setItem('dungeonMapperChatMessages', JSON.stringify(chatMessages));
}
let currentNote = null;

function calculateAvailableWidth() {
  return window.innerWidth;
}

const stage = new Konva.Stage({
  container: 'canvas-container',
  width: calculateAvailableWidth(),
  height: window.innerHeight, // Use full height
});

const gridLayer = new Konva.Layer();
const cellLayer = new Konva.Layer();
const doorLayer = new Konva.Layer();
const selectionLayer = new Konva.Layer();
const previewLayer = new Konva.Layer();

stage.add(gridLayer);
stage.add(cellLayer);
stage.add(doorLayer);
stage.add(selectionLayer);
stage.add(previewLayer);

const CELL_SIZE = 20;
const GRID_COLOR = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#444444' : '#cccccc';
const PREVIEW_CELL_SIZE = 5;
const PREVIEW_OPACITY = 0.5;

// Create a state object to hold shared state
const state = {
  currentTool: 'draw',
  isDrawing: false
};

let draggedRoom = null;
let ghostPreview = null;

function init() {
  initializeGrid(stage, cellLayer, CELL_SIZE);
  drawGrid(stage, gridLayer, CELL_SIZE, GRID_COLOR);
  initializeDoorPreview(previewLayer);
  
  stage.on('mousedown touchstart', handleStageMouseDown);
  stage.on('mousemove touchmove', handleStageMouseMove);
  stage.on('mouseup touchend', handleStageMouseUp);

  // Load saved data from local storage
  loadFromLocalStorage();

  // Render the grid based on loaded data
  renderGrid(cellLayer, CELL_SIZE);
  // Display loaded chat messages
  displayLoadedChatMessages();
  
  document.getElementById('penTool').addEventListener('click', () => setTool('pen'));
  document.getElementById('rectTool').addEventListener('click', () => setTool('rect'));
  document.getElementById('circleTool').addEventListener('click', () => setTool('circle'));
  document.getElementById('lineTool').addEventListener('click', () => setTool('line'));
  document.getElementById('selectTool').addEventListener('click', () => setTool('select'));
  document.getElementById('doorTool').addEventListener('click', () => setTool('door'));
  document.getElementById('notesTool').addEventListener('click', () => setTool('notes'));
  
  document.getElementById('note-editor').querySelector('button:first-of-type').addEventListener('click', saveNote);
  document.getElementById('note-editor').querySelector('button:last-of-type').addEventListener('click', closeNoteEditor);
  
  window.addEventListener('resize', handleResize);
  
  // Listen for changes in color scheme
  window.matchMedia('(prefers-color-scheme: dark)').addListener(handleColorSchemeChange);
  
  setTool('pen'); // Set initial tool to pen
}

function handleColorSchemeChange(e) {
  const isDarkMode = e.matches;
  const newGridColor = isDarkMode ? '#444444' : '#cccccc';
  drawGrid(stage, gridLayer, CELL_SIZE, newGridColor);
  stage.batchDraw();
}

function handleResize() {
  const sidebar = document.getElementById('sidebar');
  const resizer = document.getElementById('sidebar-resizer');
  const newWidth = calculateAvailableWidth() - sidebar.offsetWidth - resizer.offsetWidth;
  const newHeight = window.innerHeight - 100; // Adjust for navbar height
  stage.width(newWidth);
  stage.height(newHeight);
  gridLayer.width(newWidth);
  gridLayer.height(newHeight);
  cellLayer.width(newWidth);
  cellLayer.height(newHeight);
  doorLayer.width(newWidth);
  doorLayer.height(newHeight);
  selectionLayer.width(newWidth);
  selectionLayer.height(newHeight);
  previewLayer.width(newWidth);
  previewLayer.height(newHeight);
  
  drawGrid(stage, gridLayer, CELL_SIZE, GRID_COLOR);
  stage.batchDraw();
}

let initialCellState;

function handleStageMouseDown(e) {
  const pos = stage.getPointerPosition();
  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);

  if (state.currentTool === 'door') {
    placeDoor(doorLayer);
  } else if (state.currentTool === 'select') {
    startSelection(snappedPos, selectionLayer, CELL_SIZE);
  } else if (state.currentTool === 'pen') {
    state.isDrawing = true;
    const x = Math.floor(snappedPos.x / CELL_SIZE);
    const y = Math.floor(snappedPos.y / CELL_SIZE);
    initialCellState = dungeonMapperGrid.get(`${x},${y}`) || 0;
    toggleCell(x, y, cellLayer, CELL_SIZE);
  } else if (state.currentTool === 'rect' || state.currentTool === 'circle' || state.currentTool === 'line') {
    state.isDrawing = true;
    state.startPos = snappedPos;
  } else if (state.currentTool === 'notes') {
    const x = Math.floor(snappedPos.x / CELL_SIZE);
    const y = Math.floor(snappedPos.y / CELL_SIZE);
    openNoteEditor(x, y);
  }
  saveToLocalStorage(); // Save the updated grid to localStorage
}

function handleStageMouseMove(e) {
  const pos = stage.getPointerPosition();
  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);

  if (state.currentTool === 'door') {
    updateDoorPreview(pos, CELL_SIZE, state);
  } else if (state.currentTool === 'select') {
    updateSelection(pos, CELL_SIZE);
  } else if (state.currentTool === 'pen' && state.isDrawing) {
    const row = Math.floor(snappedPos.y / CELL_SIZE);
    const col = Math.floor(snappedPos.x / CELL_SIZE);
    setCell(row, col, 1 - initialCellState, cellLayer);
  } else if ((state.currentTool === 'rect' || state.currentTool === 'circle' || state.currentTool === 'line') && state.isDrawing) {
    updateShapePreview(state.startPos, snappedPos);
  } else if (state.currentTool === 'notes') {
    const row = Math.floor(snappedPos.y / CELL_SIZE);
    const col = Math.floor(snappedPos.x / CELL_SIZE);
    showNotePopover(row, col, pos);
  }
}

function showNotePopover(row, col, pos) {
  const key = `${row}-${col}`;
  const noteText = notes[key];
  const popover = document.getElementById('note-popover');
  
  if (noteText) {
    popover.innerHTML = noteText.replace(/\n/g, noteText);
    popover.style.display = 'block';
    popover.style.left = `${pos.x + 10}px`;
    popover.style.top = `${pos.y + 10}px`;
    popover.style.backgroundColor = 'black';
    popover.style.minWidth = '100px';
    popover.style.minHeight = '100px';
    popover.style.maxWidth = '300px';
    popover.style.maxHeight = '200px';
    popover.style.overflow = 'scrollmak';
  } else {
    popover.style.display = 'none';
  }
}

function setCell(row, col, state, cellLayer) {
  if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
    grid[row][col] = state;
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const rect = new Konva.Rect({
      x: x,
      y: y,
      width: CELL_SIZE,
      height: CELL_SIZE,
      fill: state ? PATH_COLOR : WALL_COLOR,
    });
    cellLayer.add(rect);
    cellLayer.batchDraw();
    saveToLocalStorage();
  }
}

function handleStageMouseUp() {
  if (state.currentTool === 'select') {
    endSelection();
  } else if (state.currentTool === 'pen' || state.currentTool === 'rect' || state.currentTool === 'circle' || state.currentTool === 'line') {
    if (state.isDrawing) {
      if (state.currentTool !== 'pen') {
        const endPos = snapToGrid(stage.getPointerPosition().x, stage.getPointerPosition().y, CELL_SIZE);
        drawShape(state.startPos, endPos);
      }
      state.isDrawing = false;
      state.startPos = null; // Reset startPos
      previewLayer.destroyChildren(); // Clear the preview layer
      previewLayer.batchDraw(); // Redraw the preview layer
    }
  }
}

function updateShapePreview(startPos, endPos) {
  previewLayer.destroyChildren();
  
  if (state.currentTool === 'rect') {
    const rect = new Konva.Rect({
      x: Math.min(startPos.x, endPos.x),
      y: Math.min(startPos.y, endPos.y),
      width: Math.abs(endPos.x - startPos.x) + CELL_SIZE,
      height: Math.abs(endPos.y - startPos.y) + CELL_SIZE,
      stroke: 'green',
      strokeWidth: 2
    });
    previewLayer.add(rect);
  } else if (state.currentTool === 'circle') {
    const centerX = (startPos.x + endPos.x) / 2;
    const centerY = (startPos.y + endPos.y) / 2;
    const radius = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)) / 2;
    
    const points = [];
    for (let angle = 0; angle < 360; angle += 5) {
      const x = centerX + radius * Math.cos(angle * Math.PI / 180);
      const y = centerY + radius * Math.sin(angle * Math.PI / 180);
      const snappedPoint = snapToGrid(x, y, CELL_SIZE);
      points.push(snappedPoint.x, snappedPoint.y);
    }
    
    const circleOutline = new Konva.Line({
      points: points,
      stroke: 'green',
      strokeWidth: 2,
      closed: true
    });
    previewLayer.add(circleOutline);
  } else if (state.currentTool === 'line') {
    const startX = startPos.x + CELL_SIZE / 2;
    const startY = startPos.y + CELL_SIZE / 2;
    const endX = endPos.x + CELL_SIZE / 2;
    const endY = endPos.y + CELL_SIZE / 2;
    const line = new Konva.Line({
      points: [startX, startY, endX, endY],
      stroke: 'green',
      strokeWidth: 2
    });
    previewLayer.add(line);
  }
  
  previewLayer.batchDraw();
}

function drawShape(startPos, endPos) {
  const startRow = Math.floor(startPos.y / CELL_SIZE);
  const startCol = Math.floor(startPos.x / CELL_SIZE);
  const endRow = Math.floor(endPos.y / CELL_SIZE);
  const endCol = Math.floor(endPos.x / CELL_SIZE);
  
  if (state.currentTool === 'rect') {
    const x = Math.min(startPos.x, endPos.x);
    const y = Math.min(startPos.y, endPos.y);
    const width = Math.abs(endPos.x - startPos.x) + CELL_SIZE;
    const height = Math.abs(endPos.y - startPos.y) + CELL_SIZE;
    
    const rect = new Konva.Rect({
      x: x,
      y: y,
      width: width,
      height: height,
      fill: PATH_COLOR,
    });
    
    cellLayer.add(rect);
    cellLayer.batchDraw();
    
    // Update the grid data structure
    for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
      for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
        dungeonMapperGrid.set(`${col},${row}`, 1);
      }
    }
    
    // Save the updated grid to localStorage
    saveToLocalStorage();
    
    // Clear the preview layer
    previewLayer.destroyChildren();
    previewLayer.batchDraw();
  } else if (state.currentTool === 'circle') {
    const centerRow = (startRow + endRow) / 2;
    const centerCol = (startCol + endCol) / 2;
    const radius = Math.sqrt(Math.pow(endRow - startRow, 2) + Math.pow(endCol - startCol, 2)) / 2;
    
    for (let row = Math.floor(centerRow - radius); row <= Math.ceil(centerRow + radius); row++) {
      for (let col = Math.floor(centerCol - radius); col <= Math.ceil(centerCol + radius); col++) {
        if (Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2) <= Math.pow(radius, 2)) {
          setCell(row, col, 1, cellLayer);
        }
      }
    }
    
    // Save the updated grid to localStorage
    saveToLocalStorage();
  } else if (state.currentTool === 'line') {
    const dx = Math.abs(endCol - startCol);
    const dy = Math.abs(endRow - startRow);
    const sx = startCol < endCol ? 1 : -1;
    const sy = startRow < endRow ? 1 : -1;
    let err = dx - dy;
    
    let row = startRow;
    let col = startCol;
    
    while (true) {
      setCell(row, col, 1, cellLayer);
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
    
    // Save the updated grid to localStorage
    saveToLocalStorage();
  }
  
  previewLayer.destroyChildren();
  previewLayer.batchDraw();
  cellLayer.batchDraw();
}

function setTool(tool) {
  state.currentTool = tool;
  document.getElementById('penTool').classList.toggle('active-tool', tool === 'pen');
  document.getElementById('rectTool').classList.toggle('active-tool', tool === 'rect');
  document.getElementById('circleTool').classList.toggle('active-tool', tool === 'circle');
  document.getElementById('lineTool').classList.toggle('active-tool', tool === 'line');
  document.getElementById('selectTool').classList.toggle('active-tool', tool === 'select');
  document.getElementById('doorTool').classList.toggle('active-tool', tool === 'door');
  document.getElementById('notesTool').classList.toggle('active-tool', tool === 'notes');
  
  if (tool !== 'select') {
    clearSelection(selectionLayer);
  }
  
  if (tool !== 'door') {
    updateDoorPreview({ x: -1, y: -1 }, CELL_SIZE, state); // Hide door preview
  }
}

function openNoteEditor(row, col) {
  const noteEditor = document.getElementById('note-editor');
  noteEditor.style.display = 'block';
  
  const noteText = document.getElementById('note-text');
  const key = `${row}-${col}`;
  currentNote = { row, col };
  noteText.value = notes[key] || '';
  noteText.focus();
}

function saveNote() {
  if (currentNote) {
    const noteText = document.getElementById('note-text').value;
    const key = `${currentNote.row}-${currentNote.col}`;
    notes[key] = noteText;
    highlightNoteCell(currentNote.row, currentNote.col);
    closeNoteEditor();
    saveToLocalStorage();
  }
}

function closeNoteEditor() {
  const noteEditor = document.getElementById('note-editor');
  noteEditor.style.display = 'none';
  currentNote = null;
}

// Add event listeners for the note editor buttons
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('save-note').addEventListener('click', saveNote);
  document.getElementById('cancel-note').addEventListener('click', closeNoteEditor);
});

function redrawGrid() {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const cell = cellLayer.findOne(`#cell-${row}-${col}`);
      if (cell) {
        cell.fill(grid[row][col] ? PATH_COLOR : WALL_COLOR);
      }
    }
  }
  cellLayer.batchDraw();
}

function displayLoadedChatMessages() {
  const chatMessagesContainer = document.getElementById('chat-messages');
  chatMessagesContainer.innerHTML = '';
  chatMessages.forEach(message => {
    addMessage(message);
  });
}

function highlightNoteCell(row, col) {
  const cell = cellLayer.findOne(`#cell-${row}-${col}`);
  if (cell) {
    cell.stroke('orange');
    cell.strokeWidth(2);
    cellLayer.batchDraw();
  }
}

init();
// Add this near the top of the file, after other imports
import { makeDraggable } from './draggable.js';

document.addEventListener('DOMContentLoaded', () => {
  // Make the floating tools window draggable by its title bar
  const floatingTools = document.getElementById('floating-tools');
  const floatingToolsHandle = floatingTools.querySelector('.window-title');
  makeDraggable(floatingTools, floatingToolsHandle);

  // Make the note editor draggable by its title bar
  const noteEditor = document.getElementById('note-editor');
  const noteEditorHandle = noteEditor.querySelector('.window-title');
  makeDraggable(noteEditor, noteEditorHandle);


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
  const chatMessages = document.getElementById('chat-messages');

  function addMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = marked.parse(message);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Save the message to the chatMessages array
    chatMessages.push(message);
    saveToLocalStorage();
  }

function handleSendMessage() {
    const message = chatInput.value.trim();
    if (message) {
      addMessage(message);
      chatInput.value = '';
    }
  }

  // Initialize marked with some options for safety
  marked.setOptions({
    sanitize: true,
    breaks: true
  });

  chatSend.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  });
});
