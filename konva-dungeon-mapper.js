// Initialize Konva Stage and Layers
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: 800,
  height: 600,
});

const gridLayer = new Konva.Layer();
const cellLayer = new Konva.Layer();
const selectionLayer = new Konva.Layer();

stage.add(gridLayer);
stage.add(cellLayer);
stage.add(selectionLayer);

const CELL_SIZE = 20;
const PREVIEW_CELL_SIZE = 5;
const GRID_COLOR = '#cccccc';
const WALL_COLOR = '#333333';  // Dark gray for initial grid and walls
const PATH_COLOR = '#ffffff';  // White for clicked cells (paths)
const SELECTION_COLOR = 'rgba(0, 0, 255, 0.3)';

let grid = [];
let currentTool = 'draw';
let isSelecting = false;
let isDrawing = false;
let selectionRect;
let selectionStart = { x: 0, y: 0 };

function initializeGrid() {
  const rows = Math.floor(stage.height() / CELL_SIZE);
  const cols = Math.floor(stage.width() / CELL_SIZE);
  
  for (let i = 0; i < rows; i++) {
    grid[i] = new Array(cols).fill(0);  // 0 represents walls (dark gray)
  }
  
  // Draw initial dark gray grid
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellRect = new Konva.Rect({
        x: col * CELL_SIZE,
        y: row * CELL_SIZE,
        width: CELL_SIZE,
        height: CELL_SIZE,
        fill: WALL_COLOR,
        id: `cell-${row}-${col}`,
      });
      cellLayer.add(cellRect);
    }
  }
  cellLayer.draw();
}

function drawGrid() {
  for (let i = 0; i <= stage.width(); i += CELL_SIZE) {
    const line = new Konva.Line({
      points: [i, 0, i, stage.height()],
      stroke: GRID_COLOR,
      strokeWidth: 1,
    });
    gridLayer.add(line);
  }
  
  for (let i = 0; i <= stage.height(); i += CELL_SIZE) {
    const line = new Konva.Line({
      points: [0, i, stage.width(), i],
      stroke: GRID_COLOR,
      strokeWidth: 1,
    });
    gridLayer.add(line);
  }
  
  gridLayer.draw();
}

function toggleCell(row, col) {
  if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
    grid[row][col] = 1 - grid[row][col];  // Toggle between 0 (wall) and 1 (path)
    const cell = cellLayer.findOne(`#cell-${row}-${col}`);
    if (cell) {
      cell.fill(grid[row][col] ? PATH_COLOR : WALL_COLOR);
      cellLayer.batchDraw();
    }
  }
}

function snapToGrid(x, y) {
  return {
    x: Math.floor(x / CELL_SIZE) * CELL_SIZE,
    y: Math.floor(y / CELL_SIZE) * CELL_SIZE
  };
}

function handleStageMouseDown(e) {
  const pos = stage.getPointerPosition();
  const snappedPos = snapToGrid(pos.x, pos.y);

  if (currentTool === 'select') {
    // Reset selection and start a new one
    if (selectionRect) {
      selectionRect.destroy();
    }
    isSelecting = true;
    selectionStart = snappedPos;
    selectionRect = new Konva.Rect({
      x: snappedPos.x,
      y: snappedPos.y,
      width: CELL_SIZE,
      height: CELL_SIZE,
      fill: SELECTION_COLOR,
    });
    selectionLayer.add(selectionRect);
    selectionLayer.draw();
  } else if (currentTool === 'draw') {
    isDrawing = true;
    const row = Math.floor(pos.y / CELL_SIZE);
    const col = Math.floor(pos.x / CELL_SIZE);
    toggleCell(row, col);
  }
}

function handleStageMouseMove(e) {
  const pos = stage.getPointerPosition();
  const snappedPos = snapToGrid(pos.x, pos.y);

  if (isSelecting && selectionRect) {
    const x = Math.min(selectionStart.x, snappedPos.x);
    const y = Math.min(selectionStart.y, snappedPos.y);
    const width = Math.abs(snappedPos.x - selectionStart.x) + CELL_SIZE;
    const height = Math.abs(snappedPos.y - selectionStart.y) + CELL_SIZE;

    selectionRect.position({ x, y });
    selectionRect.width(width);
    selectionRect.height(height);
    selectionLayer.batchDraw();
  } else if (isDrawing && currentTool === 'draw') {
    const row = Math.floor(pos.y / CELL_SIZE);
    const col = Math.floor(pos.x / CELL_SIZE);
    toggleCell(row, col);
  }
}

function handleStageMouseUp() {
  isSelecting = false;
  isDrawing = false;
  if (selectionRect) {
    selectionLayer.draw();
  }
}

function saveRoom() {
  const roomName = prompt('Enter a name for this room:');
  if (roomName) {
    const selectedCells = getSelectedCells();
    localStorage.setItem(roomName, JSON.stringify(selectedCells));
    updateRoomLibrary();
  }
}

function getSelectedCells() {
  if (!selectionRect) return [];
  
  const x = selectionRect.x();
  const y = selectionRect.y();
  const width = selectionRect.width();
  const height = selectionRect.height();

  const startCol = Math.floor(x / CELL_SIZE);
  const startRow = Math.floor(y / CELL_SIZE);
  const endCol = Math.floor((x + width - 1) / CELL_SIZE);
  const endRow = Math.floor((y + height - 1) / CELL_SIZE);

  const selectedCells = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
        selectedCells.push({ row, col, state: grid[row][col] });
      }
    }
  }
  return selectedCells;
}

function updateRoomLibrary() {
  const roomLibrary = document.getElementById('saved-rooms');
  roomLibrary.innerHTML = '';
  for (let i = 0; i < localStorage.length; i++) {
    const roomName = localStorage.key(i);
    const roomData = JSON.parse(localStorage.getItem(roomName));
    
    const roomElement = document.createElement('div');
    roomElement.className = 'room-item';
    
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
    roomLibrary.appendChild(roomElement);
  }
}

function drawPreview(layer, roomData) {
  roomData.forEach(cell => {
    const rect = new Konva.Rect({
      x: cell.col * PREVIEW_CELL_SIZE,
      y: cell.row * PREVIEW_CELL_SIZE,
      width: PREVIEW_CELL_SIZE,
      height: PREVIEW_CELL_SIZE,
      fill: cell.state ? PATH_COLOR : WALL_COLOR,
    });
    layer.add(rect);
  });
  layer.draw();
}

function loadRoom(roomName) {
  const roomData = JSON.parse(localStorage.getItem(roomName));
  if (roomData) {
    // Reset all cells to walls (dark gray)
    cellLayer.children.each(child => {
      child.fill(WALL_COLOR);
    });

    // Reset grid
    for (let i = 0; i < grid.length; i++) {
      grid[i].fill(0);
    }

    // Update grid and set paths (white)
    roomData.forEach(cell => {
      grid[cell.row][cell.col] = cell.state;
      if (cell.state === 1) {  // If it's a path
        const cellRect = cellLayer.findOne(`#cell-${cell.row}-${cell.col}`);
        if (cellRect) {
          cellRect.fill(PATH_COLOR);
        }
      }
    });
    cellLayer.batchDraw();
  }
}

function setTool(tool) {
  currentTool = tool;
  document.getElementById('drawTool').classList.toggle('active-tool', tool === 'draw');
  document.getElementById('selectTool').classList.toggle('active-tool', tool === 'select');
  
  // Reset selection when switching to draw tool
  if (tool === 'draw' && selectionRect) {
    selectionRect.destroy();
    selectionRect = null;
    selectionLayer.draw();
  }
}

function init() {
  initializeGrid();
  drawGrid();
  updateRoomLibrary();
  
  stage.on('mousedown touchstart', handleStageMouseDown);
  stage.on('mousemove touchmove', handleStageMouseMove);
  stage.on('mouseup touchend', handleStageMouseUp);
  
  document.getElementById('saveRoom').addEventListener('click', saveRoom);
  document.getElementById('drawTool').addEventListener('click', () => setTool('draw'));
  document.getElementById('selectTool').addEventListener('click', () => setTool('select'));
  
  setTool('draw'); // Set initial tool
}

init();