// main.js

import { snapToGrid } from './utils.js';
import { initializeDoorPreview, updateDoorPreview, placeDoor, clearDoors, doors } from './doors.js';
import { initializeGrid, drawGrid, toggleCell, clearGrid, grid } from './drawing.js';
import { startSelection, updateSelection, endSelection, getSelectedCells, clearSelection } from './selection.js';

function calculateAvailableWidth() {
  const totalWidth = window.innerWidth;
  const libraryWidth = document.getElementById('saved-rooms').offsetWidth;
  return totalWidth - libraryWidth;
}

const stage = new Konva.Stage({
  container: 'canvas-container',
  width: calculateAvailableWidth(),
  height: window.innerHeight - 100, // Adjust for navbar height
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
  updateRoomLibrary();
  
  stage.on('mousedown touchstart', handleStageMouseDown);
  stage.on('mousemove touchmove', handleStageMouseMove);
  stage.on('mouseup touchend', handleStageMouseUp);
  stage.on('dragmove', handleDragMove);
  stage.on('dragend', handleDragEnd);
  
  document.getElementById('saveRoom').addEventListener('click', saveRoom);
  document.getElementById('drawTool').addEventListener('click', () => setTool('draw'));
  document.getElementById('selectTool').addEventListener('click', () => setTool('select'));
  document.getElementById('doorTool').addEventListener('click', () => setTool('door'));
  
  window.addEventListener('resize', handleResize);
  
  setTool('draw'); // Set initial tool
}

function handleResize() {
  const newWidth = calculateAvailableWidth();
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
    toggleCell(row, col, cellLayer);
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
    toggleCell(row, col, cellLayer);
  }
}

function handleStageMouseUp() {
  if (state.currentTool === 'select') {
    endSelection();
  } else if (state.currentTool === 'draw') {
    state.isDrawing = false;
  }
}

function handleDragMove(e) {
  if (!draggedRoom || !ghostPreview) return;

  const pos = stage.getPointerPosition();
  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
  ghostPreview.position(snappedPos);
  previewLayer.batchDraw();
}

function handleDragEnd(e) {
  if (!draggedRoom) return;

  const pos = stage.getPointerPosition();
  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
  
  placeRoom(draggedRoom, snappedPos);
  
  if (ghostPreview) {
    ghostPreview.destroy();
    ghostPreview = null;
  }
  
  draggedRoom = null;
  previewLayer.batchDraw();
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

function saveRoom() {
  const roomName = prompt('Enter a name for this room:');
  if (roomName) {
    const selectedCells = getSelectedCells(grid, CELL_SIZE);
    const roomData = {
      cells: selectedCells,
      doors: doors
    };
    localStorage.setItem(roomName, JSON.stringify(roomData));
    updateRoomLibrary();
  }
}

function updateRoomLibrary() {
  const roomLibrary = document.getElementById('saved-rooms');
  roomLibrary.innerHTML = '';
  for (let i = 0; i < localStorage.length; i++) {
    const roomName = localStorage.key(i);
    let roomData;
    try {
      roomData = JSON.parse(localStorage.getItem(roomName));
    } catch (e) {
      console.error(`Error parsing room data for ${roomName}:`, e);
      continue;
    }
    
    if (!roomData || (!roomData.cells && !roomData.doors)) {
      console.warn(`Invalid room data for ${roomName}`);
      continue;
    }
    
    const roomElement = document.createElement('div');
    roomElement.className = 'room-item';
    roomElement.draggable = true;
    
    const previewStage = new Konva.Stage({
      container: roomElement,
      width: grid[0].length * PREVIEW_CELL_SIZE,
      height: grid.length * PREVIEW_CELL_SIZE,
    });
    
    const previewLayer = new Konva.Layer();
    previewStage.add(previewLayer);
    
    drawPreview(previewLayer, roomData);
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = roomName;
    
    roomElement.appendChild(nameSpan);
    roomElement.addEventListener('click', () => loadRoom(roomName));
    roomElement.addEventListener('dragstart', (e) => handleDragStart(e, roomName));
    roomLibrary.appendChild(roomElement);
  }
}

function drawPreview(layer, roomData) {
  if (roomData.cells && Array.isArray(roomData.cells)) {
    roomData.cells.forEach(cell => {
      const rect = new Konva.Rect({
        x: cell.col * PREVIEW_CELL_SIZE,
        y: cell.row * PREVIEW_CELL_SIZE,
        width: PREVIEW_CELL_SIZE,
        height: PREVIEW_CELL_SIZE,
        fill: cell.state ? '#ffffff' : '#333333',
      });
      layer.add(rect);
    });
  }

  if (roomData.doors && Array.isArray(roomData.doors)) {
    roomData.doors.forEach(door => {
      const line = new Konva.Line({
        points: [
          door.startX * (PREVIEW_CELL_SIZE / CELL_SIZE),
          door.startY * (PREVIEW_CELL_SIZE / CELL_SIZE),
          door.endX * (PREVIEW_CELL_SIZE / CELL_SIZE),
          door.endY * (PREVIEW_CELL_SIZE / CELL_SIZE)
        ],
        stroke: '#8B4513',
        strokeWidth: 1
      });
      layer.add(line);
    });
  }

  layer.draw();
}

function handleDragStart(e, roomName) {
  e.dataTransfer.setData('text/plain', roomName);
  draggedRoom = JSON.parse(localStorage.getItem(roomName));
  createGhostPreview(draggedRoom, stage.getPointerPosition());
}

function createGhostPreview(roomData, pos) {
  ghostPreview = new Konva.Group({
    x: pos.x,
    y: pos.y,
    opacity: PREVIEW_OPACITY,
    draggable: true,
  });

  if (roomData.cells && Array.isArray(roomData.cells)) {
    roomData.cells.forEach(cell => {
      const rect = new Konva.Rect({
        x: cell.col * CELL_SIZE,
        y: cell.row * CELL_SIZE,
        width: CELL_SIZE,
        height: CELL_SIZE,
        fill: cell.state ? '#ffffff' : '#333333',
      });
      ghostPreview.add(rect);
    });
  }

  if (roomData.doors && Array.isArray(roomData.doors)) {
    roomData.doors.forEach(door => {
      const line = new Konva.Line({
        points: [door.startX, door.startY, door.endX, door.endY],
        stroke: '#8B4513',
        strokeWidth: 3
      });
      ghostPreview.add(line);
    });
  }

  previewLayer.add(ghostPreview);
  previewLayer.batchDraw();
}

function placeRoom(roomData, pos) {
  const offsetX = Math.floor(pos.x / CELL_SIZE);
  const offsetY = Math.floor(pos.y / CELL_SIZE);

  if (roomData.cells && Array.isArray(roomData.cells)) {
    roomData.cells.forEach(cell => {
      const newRow = cell.row + offsetY;
      const newCol = cell.col + offsetX;
      if (newRow >= 0 && newRow < grid.length && newCol >= 0 && newCol < grid[0].length) {
        grid[newRow][newCol] = cell.state;
        const cellRect = cellLayer.findOne(`#cell-${newRow}-${newCol}`);
        if (cellRect) {
          cellRect.fill(cell.state ? '#ffffff' : '#333333');
        }
      }
    });
  }

  if (roomData.doors && Array.isArray(roomData.doors)) {
    roomData.doors.forEach(door => {
      const newDoor = new Konva.Group();
      const doorLine = new Konva.Line({
        points: [
          door.startX + offsetX * CELL_SIZE,
          door.startY + offsetY * CELL_SIZE,
          door.endX + offsetX * CELL_SIZE,
          door.endY + offsetY * CELL_SIZE
        ],
        stroke: '#8B4513',
        strokeWidth: 3
      });
      const doorRect = new Konva.Rect({
        x: (door.startX + door.endX) / 2 + offsetX * CELL_SIZE - 3,
        y: (door.startY + door.endY) / 2 + offsetY * CELL_SIZE - 3,
        width: 6,
        height: 6,
        fill: '#8B4513'
      });
      newDoor.add(doorLine);
      newDoor.add(doorRect);
      doorLayer.add(newDoor);
    });
    doors = doors.concat(roomData.doors.map(door => ({
      startX: door.startX + offsetX * CELL_SIZE,
      startY: door.startY + offsetY * CELL_SIZE,
      endX: door.endX + offsetX * CELL_SIZE,
      endY: door.endY + offsetY * CELL_SIZE
    })));
  }

  cellLayer.batchDraw();
  doorLayer.batchDraw();
}

function loadRoom(roomName) {
  let roomData;
  try {
    roomData = JSON.parse(localStorage.getItem(roomName));
  } catch (e) {
    console.error(`Error loading room ${roomName}:`, e);
    return;
  }
  
  if (!roomData) {
    console.warn(`No data found for room ${roomName}`);
    return;
  }

  clearGrid(cellLayer);
  clearDoors(doorLayer);

  if (roomData.cells && Array.isArray(roomData.cells)) {
    roomData.cells.forEach(cell => {
      if (cell.state === 1) {  // If it's a path
        toggleCell(cell.row, cell.col, cellLayer);
      }
    });
  }

  if (roomData.doors && Array.isArray(roomData.doors)) {
    roomData.doors.forEach(door => {
      const newDoor = new Konva.Group();
      const doorLine = new Konva.Line({
        points: [door.startX, door.startY, door.endX, door.endY],
        stroke: '#8B4513',
        strokeWidth: 3
      });
      const doorRect = new Konva.Rect({
        x: (door.startX + door.endX) / 2 - 3,
        y: (door.startY + door.endY) / 2 - 3,
        width: 6,
        height: 6,
        fill: '#8B4513'
      });
      newDoor.add(doorLine);
      newDoor.add(doorRect);
      doorLayer.add(newDoor);
    });
    doors = roomData.doors;
  }

  cellLayer.batchDraw();
  doorLayer.batchDraw();
}

init();
