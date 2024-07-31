// roughLine.js

import { getCurrentColor } from './toolbar.js';
import { snapToGrid } from './utils.js';

const ROUGH_LINE_COLOR = '#8B4513';
const ROUGH_LINE_PREVIEW_COLOR = 'rgba(139, 69, 19, 0.5)';

let roughLinePreview;
let previewLayer;

function initializeRoughLinePreview(layer) {
  previewLayer = layer;
  roughLinePreview = new Konva.Group({
    visible: false
  });

  const previewLine = new Konva.Line({
    stroke: ROUGH_LINE_PREVIEW_COLOR,
    strokeWidth: 2,
    points: [0, 0, 0, 0]
  });

  roughLinePreview.add(previewLine);
  previewLayer.add(roughLinePreview);
}

function ensureValidRoughLinePreview() {
  if (!roughLinePreview || !roughLinePreview.findOne('Line')) {
    console.warn('RoughLine preview not properly initialized. Reinitializing...');
    initializeRoughLinePreview(previewLayer);
  }
}

function updateRoughLinePreview(pos, CELL_SIZE, state) {
  if (state.currentTool !== 'roughLine') {
    roughLinePreview.visible(false);
    previewLayer.batchDraw();
    return;
  }
  ensureValidRoughLinePreview();

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

  const previewLine = roughLinePreview.findOne('Line');
  if (previewLine) {
    previewLine.points([startPoint.x, startPoint.y, endPoint.x, endPoint.y]);
    roughLinePreview.visible(true);
    previewLayer.batchDraw();
  }
}

function placeRoughLine(roughLineLayer, CELL_SIZE) {
  if (!roughLinePreview.visible()) return;

  const line = roughLinePreview.findOne('Line');
  const points = line.points();

  const roughLine = new Konva.Group();

  // Create 2-3 slightly offset lines for a rough appearance
  for (let i = 0; i < 3; i++) {
    const offset = Math.random() * 2 - 1; // Random offset between -1 and 1
    const roughSegment = new Konva.Line({
      points: [
        points[0] + offset,
        points[1] + offset,
        points[2] + offset,
        points[3] + offset
      ],
      stroke: getCurrentColor(),
      strokeWidth: 1,
      lineCap: 'round',
      lineJoin: 'round',
      tension: 0.5 // Add some curvature for a hand-drawn look
    });
    roughLine.add(roughSegment);
  }

  roughLineLayer.add(roughLine);
  roughLineLayer.batchDraw();
}

function clearRoughLines(roughLineLayer) {
  roughLineLayer.destroyChildren();
  roughLineLayer.draw();
}

export { initializeRoughLinePreview, updateRoughLinePreview, placeRoughLine, clearRoughLines };