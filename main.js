// main.js

import { snapToGrid } from './utils.js';
import { initializeDoorPreview, updateDoorPreview, placeDoor, clearDoors, doors } from './doors.js';
import { initializeGrid, drawGrid, toggleCell, clearGrid, grid } from './drawing.js';
import { startSelection, updateSelection, endSelection, getSelectedCells, clearSelection } from './selection.js';

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
const GRID_COLOR = '#cccccc';
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
  
  document.getElementById('drawTool').addEventListener('click', () => setTool('draw'));
  document.getElementById('selectTool').addEventListener('click', () => setTool('select'));
  document.getElementById('doorTool').addEventListener('click', () => setTool('door'));
  
  window.addEventListener('resize', handleResize);
  
  setTool('draw'); // Set initial tool
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
  } else if (state.currentTool === 'draw') {
    state.isDrawing = true;
    const row = Math.floor(snappedPos.y / CELL_SIZE);
    const col = Math.floor(snappedPos.x / CELL_SIZE);
    initialCellState = grid[row][col];
    setCell(row, col, 1 - initialCellState, cellLayer);
  }
}

function handleStageMouseMove(e) {
  const pos = stage.getPointerPosition();

  if (state.currentTool === 'door') {
    updateDoorPreview(pos, CELL_SIZE, state);
  } else if (state.currentTool === 'select') {
    updateSelection(pos, CELL_SIZE);
  } else if (state.currentTool === 'draw' && state.isDrawing) {
    const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
    const row = Math.floor(snappedPos.y / CELL_SIZE);
    const col = Math.floor(snappedPos.x / CELL_SIZE);
    setCell(row, col, 1 - initialCellState, cellLayer);
  }
}

function setCell(row, col, state, cellLayer) {
  if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
    grid[row][col] = state;
    const cellRect = cellLayer.findOne(`#cell-${row}-${col}`);
    if (cellRect) {
      cellRect.fill(state ? '#ffffff' : '#333333');
      cellLayer.batchDraw();
    }
  }
}

function handleStageMouseUp() {
  if (state.currentTool === 'select') {
    endSelection();
  } else if (state.currentTool === 'draw') {
    state.isDrawing = false;
  }
}

function setTool(tool) {
  state.currentTool = tool;
  document.getElementById('drawTool').classList.toggle('active-tool', tool === 'draw');
  document.getElementById('selectTool').classList.toggle('active-tool', tool === 'select');
  document.getElementById('doorTool').classList.toggle('active-tool', tool === 'door');
  
  if (tool !== 'select') {
    clearSelection(selectionLayer);
  }
  
  if (tool !== 'door') {
    updateDoorPreview({ x: -1, y: -1 }, CELL_SIZE, state); // Hide door preview
  }
}

init();
// Add this near the top of the file, after other imports
import { makeDraggable } from './draggable.js';

document.addEventListener('DOMContentLoaded', () => {
  // Make the floating tools window draggable
  const floatingTools = document.getElementById('floating-tools');
  makeDraggable(floatingTools);

  // Remove 'saveRoom' button event listener if it exists
  const saveRoomButton = document.getElementById('saveRoom');
  if (saveRoomButton) {
    saveRoomButton.remove();
  }

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
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function handleSendMessage() {
    const message = chatInput.value.trim();
    if (message) {
      addMessage(message);
      chatInput.value = '';
    }
  }

  chatSend.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });
});
