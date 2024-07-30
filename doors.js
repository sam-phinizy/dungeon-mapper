// doors.js

import { snapToGrid } from './utils.js';

const DOOR_COLOR = '#8B4513';
const DOOR_FILL_COLOR = '#DEB887';
const DOOR_PREVIEW_COLOR = 'rgba(0, 255, 0, 0.5)';

let doors = [];
let doorPreview;
let previewLayer;

function initializeDoorPreview(layer) {
  previewLayer = layer;
  doorPreview = new Konva.Group({
    visible: false
  });
  
  const previewLine = new Konva.Line({
    stroke: DOOR_PREVIEW_COLOR,
    strokeWidth: 3,
    points: [0, 0, 0, 0] // Initialize with default points
  });
  
  doorPreview.add(previewLine);
  previewLayer.add(doorPreview);
}

// Add this function to ensure doorPreview is always valid
function ensureValidDoorPreview() {
  if (!doorPreview || !doorPreview.findOne('Line')) {
    console.warn('Door preview not properly initialized. Reinitializing...');
    initializeDoorPreview(previewLayer);
  }
}

function updateDoorPreview(pos, CELL_SIZE, state) {
  ensureValidDoorPreview();

  if (state.currentTool !== 'door') {
    doorPreview.visible(false);
    previewLayer.batchDraw();
    return;
  }

  const snappedPos = snapToGrid(pos.x, pos.y, CELL_SIZE);
  const cellX = Math.floor(snappedPos.x / CELL_SIZE);
  const cellY = Math.floor(snappedPos.y / CELL_SIZE);
  
  const xOffset = pos.x - snappedPos.x;
  const yOffset = pos.y - snappedPos.y;
  
  let startPoint, endPoint;
  
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

  const previewLine = doorPreview.findOne('Line');
  if (previewLine) {
    previewLine.points([startPoint.x, startPoint.y, endPoint.x, endPoint.y]);
    doorPreview.visible(true);
    previewLayer.batchDraw();
  } else {
    console.error('Preview line not found in doorPreview');
  }
}

function placeDoor(doorLayer) {
  if (!doorPreview.visible()) return;
  
  const line = doorPreview.findOne('Line');
  
  const newDoor = new Konva.Group();
  
  const doorLine = new Konva.Line({
    points: line.points(),
    stroke: DOOR_COLOR,
    strokeWidth: 3
  });
  
  // Calculate the middle point and direction of the door
  const startX = line.points()[0];
  const startY = line.points()[1];
  const endX = line.points()[2];
  const endY = line.points()[3];
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const CELL_SIZE = 20;
  // Calculate the rectangle dimensions
  const rectWidth = CELL_SIZE * 0.5;
  const rectHeight = length * 0.33;  // 3/4 of the door length
  
  // Calculate the rectangle position and rotation
  const angle = Math.atan2(dy, dx);
  const rectX = midX - rectWidth / 2 * Math.cos(angle) + rectHeight / 2 * Math.sin(angle);
  const rectY = midY - rectWidth / 2 * Math.sin(angle) - rectHeight / 2 * Math.cos(angle);
  
  const doorRect = new Konva.Rect({
    x: rectX,
    y: rectY,
    width: rectWidth,
    height: rectHeight,
    fill: DOOR_FILL_COLOR,
    rotation: angle * 180 / Math.PI
  });
  
  newDoor.add(doorLine);
  newDoor.add(doorRect);
  doorLayer.add(newDoor);
  doorLayer.batchDraw();
  
  doors.push({
    startX: startX,
    startY: startY,
    endX: endX,
    endY: endY
  });
}

function clearDoors(doorLayer) {
  doorLayer.destroyChildren();
  doors = [];
  doorLayer.draw();
}

export { initializeDoorPreview, updateDoorPreview, placeDoor, clearDoors, doors };
