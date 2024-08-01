// edges.js

import { snapToGrid } from './utils.js';
import { getCurrentColor, getCurrentRoughLineType } from './toolbar.js';

const DOOR_COLOR = '#8B4513';
const DOOR_FILL_COLOR = '#DEB887';
const EDGE_PREVIEW_COLOR = 'rgba(0, 255, 0, 0.5)';

let edgePreview;
let previewLayer;
let edges = new Map(); // Store all edges (doors and rough lines) by their edge key

function initializeEdgePreview(layer) {
  previewLayer = layer;
  edgePreview = new Konva.Group({
    visible: false
  });

  const previewLine = new Konva.Line({
    stroke: EDGE_PREVIEW_COLOR,
    strokeWidth: 2,
    points: [0, 0, 0, 0]
  });

  edgePreview.add(previewLine);
  previewLayer.add(edgePreview);
}

function ensureValidEdgePreview() {
  if (!edgePreview || !edgePreview.findOne('Line')) {
    console.warn('Edge preview not properly initialized. Reinitializing...');
    initializeEdgePreview(previewLayer);
  }
}

function updateEdgePreview(pos, CELL_SIZE, state) {
  if (state.currentTool !== 'door' && state.currentTool !== 'roughLine') {
    edgePreview.visible(false);
    previewLayer.batchDraw();
    return;
  }
  ensureValidEdgePreview();

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

  const previewLine = edgePreview.findOne('Line');
  if (previewLine) {
    previewLine.points([startPoint.x, startPoint.y, endPoint.x, endPoint.y]);
    edgePreview.visible(true);
    previewLayer.batchDraw();
  }
}

function placeEdge(edgeLayer, CELL_SIZE) {
  if (!edgePreview.visible()) return;

  const line = edgePreview.findOne('Line');
  const points = line.points();

  // Create a unique key for this edge
  const edgeKey = `${points[0]},${points[1]}-${points[2]},${points[3]}`;

  // If an edge already exists on this edge, remove it
  if (edges.has(edgeKey)) {
    const existingEdge = edges.get(edgeKey);
    existingEdge.destroy();
    edges.delete(edgeKey);
  }

  const edge = new Konva.Group();

  if (state.currentTool === 'door') {
    const doorLine = new Konva.Line({
      points: points,
      stroke: DOOR_COLOR,
      strokeWidth: 3
    });

    // Calculate the middle point and direction of the door
    const startX = points[0];
    const startY = points[1];
    const endX = points[2];
    const endY = points[3];
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Calculate the rectangle dimensions
    const rectWidth = CELL_SIZE * 0.5;
    const rectHeight = length * 0.33;  // 1/3 of the door length

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

    edge.add(doorLine);
    edge.add(doorRect);
  } else if (state.currentTool === 'roughLine') {
    const currentRoughLineType = getCurrentRoughLineType();

    if (currentRoughLineType === 'normal') {
      // Create a single straight line for 'Normal' type
      const normalLine = new Konva.Line({
        points: points,
        stroke: getCurrentColor(),
        strokeWidth: 2,
        lineCap: 'round',
        lineJoin: 'round'
      });
      edge.add(normalLine);
    } else {
      // Create 2-3 slightly offset lines for other rough line types
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
        edge.add(roughSegment);
      }
    }
  }

  edgeLayer.add(edge);
  edges.set(edgeKey, edge);
  edgeLayer.batchDraw();
}

function clearEdges(edgeLayer) {
  edges.forEach(edge => edge.destroy());
  edges.clear();
  edgeLayer.draw();
}

export { initializeEdgePreview, updateEdgePreview, placeEdge, clearEdges, edges };