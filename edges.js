
import { snapToGrid } from './utils.js';
import { getCurrentColor, getCurrentRoughLineType } from './toolbar.js';
import { ColorMap } from './colors.js';

const DOOR_COLOR = '#8B4513';
const DOOR_FILL_COLOR = '#FFFFFF';
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

  const edgeKey = `${points[0]},${points[1]}-${points[2]},${points[3]}`;

  if (edges.has(edgeKey)) {
    const existingEdge = edges.get(edgeKey);
    existingEdge.destroy();
    edges.delete(edgeKey);
  }

  const edge = new Konva.Group();
  let edgeData = {};

  if (state.currentTool === 'door') {
    const doorLine = new Konva.Line({
      points: points,
      stroke: 'black',
      strokeWidth: 5
    });

    const startX = points[0];
    const startY = points[1];
    const endX = points[2];
    const endY = points[3];
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const rectWidth = CELL_SIZE * 0.5;
    const rectHeight = length * 0.33;
    const rectX = midX - rectWidth / 2 * Math.cos(angle) + rectHeight / 2 * Math.sin(angle);
    const rectY = midY - rectWidth / 2 * Math.sin(angle) - rectHeight / 2 * Math.cos(angle);

    const doorRect = new Konva.Rect({
      x: rectX,
      y: rectY,
      width: rectWidth,
      height: rectHeight,
      fill: DOOR_FILL_COLOR,
      stroke: 'black',
      strokeWidth: 2,
      rotation: angle * 180 / Math.PI
    });

    edge.add(doorLine);
    edge.add(doorRect);

    edgeData = { type: 'door' };
  } else if (state.currentTool === 'roughLine') {
    const currentRoughLineType = getCurrentRoughLineType();
    const currentColor = getCurrentColor();

    if (currentRoughLineType === 'normal') {
      const normalLine = new Konva.Line({
        points: points,
        stroke: ColorMap[currentColor],
        strokeWidth: 2,
        lineCap: 'round',
        lineJoin: 'round'
      });
      edge.add(normalLine);
    } else if (currentRoughLineType === 'blocks') {
      const [startX, startY, endX, endY] = points;
      const dx = endX - startX;
      const dy = endY - startY;
      const angle = Math.atan2(dy, dx);
      const length = Math.sqrt(dx * dx + dy * dy);

      // Main wall line
      const mainLine = new Konva.Line({
        points: points,
        stroke: ColorMap[currentColor],
        strokeWidth: 3,
        lineCap: 'square',
        lineJoin: 'miter'
      });
      edge.add(mainLine);

      // Blocks
      const blockSize = CELL_SIZE / 4;
      const numBlocks = Math.floor(length / blockSize);
      for (let i = 0; i < numBlocks; i++) {
        const blockX = startX + Math.cos(angle) * i * blockSize;
        const blockY = startY + Math.sin(angle) * i * blockSize;
        const block = new Konva.Rect({
          x: blockX,
          y: blockY,
          width: blockSize,
          height: blockSize / 2,
          fill: 'white',
          stroke: ColorMap[currentColor],
          strokeWidth: 1,
          rotation: angle * 180 / Math.PI,
          offsetY: blockSize / 4
        });
        edge.add(block);
      }

      // Pencil-like line on the other side
      const pencilLine = new Konva.Line({
        points: points,
        stroke: ColorMap[currentColor],
        strokeWidth: 1,
        lineCap: 'round',
        lineJoin: 'round',
        tension: 0.5,
        offsetX: Math.sin(angle) * blockSize / 2,
        offsetY: -Math.cos(angle) * blockSize / 2
      });
      edge.add(pencilLine);
    } else {
      for (let i = 0; i < 3; i++) {
        const offset = Math.random() * 2 - 1;
        const roughSegment = new Konva.Line({
          points: [
            points[0] + offset,
            points[1] + offset,
            points[2] + offset,
            points[3] + offset
          ],
          stroke: ColorMap[currentColor],
          strokeWidth: 1,
          lineCap: 'round',
          lineJoin: 'round',
          tension: 0.5
        });
        edge.add(roughSegment);
      }
    }

    edgeData = {
      type: 'roughLine',
      roughLineType: currentRoughLineType,
      color: currentColor
    };
  }

  edgeLayer.add(edge);
  edges.set(edgeKey, edgeData);
  edgeLayer.batchDraw();

  if (typeof window.saveToLocalStorage === 'function') {
    window.saveToLocalStorage();
  }
}
function clearEdges(edgeLayer) {
  edges.forEach(edge => edge.destroy());
  edges.clear();
  edgeLayer.draw();
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function loadEdgesFromStorage(savedEdges, edgeLayer) {
  console.log('Loading edges:', savedEdges);
  edges.clear();
  edgeLayer.destroyChildren();

  savedEdges.forEach(([key, value]) => {
    const [startX, startY, endX, endY] = key.split('-').flatMap(coord => coord.split(',').map(Number));
    const edge = new Konva.Group();

    if (value.type === 'door') {
      const doorLine = new Konva.Line({
        points: [startX, startY, endX, endY],
        stroke: DOOR_COLOR,
        strokeWidth: 5
      });

      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const rectWidth = CELL_SIZE * 0.5;
      const rectHeight = length * 0.33;
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
    } else if (value.type === 'roughLine') {
      if (value.roughLineType === 'normal') {
        const normalLine = new Konva.Line({
          points: [startX, startY, endX, endY],
          stroke: ColorMap[value.color],
          strokeWidth: 2,
          lineCap: 'round',
          lineJoin: 'round'
        });
        edge.add(normalLine);
      } else if (value.roughLineType === 'blocks') {
        const dx = endX - startX;
        const dy = endY - startY;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(dx * dx + dy * dy);

        // Main wall line
        const mainLine = new Konva.Line({
          points: [startX, startY, endX, endY],
          stroke: ColorMap[value.color],
          strokeWidth: 3,
          lineCap: 'square',
          lineJoin: 'miter'
        });
        edge.add(mainLine);

        // Blocks
        const blockSize = CELL_SIZE / getRandomInt(3, 6);
        const numBlocks = Math.floor(length / blockSize);
        for (let i = 0; i < numBlocks; i++) {
          const blockX = startX + Math.cos(angle) * i * blockSize;
          const blockY = startY + Math.sin(angle) * i * blockSize;
          const block = new Konva.Rect({
            x: blockX,
            y: blockY,
            width: blockSize,
            height: blockSize / 2,
            fill: 'white',
            stroke: ColorMap[value.color],
            strokeWidth: 1,
            rotation: angle * 180 / Math.PI,
            offsetY: blockSize / 4
          });
          edge.add(block);
        }

        // Pencil-like line on the other side
        const pencilLine = new Konva.Line({
          points: [startX, startY, endX, endY],
          stroke: ColorMap[value.color],
          strokeWidth: 1,
          lineCap: 'round',
          lineJoin: 'round',
          tension: 0.5,
          offsetX: Math.sin(angle) * blockSize / 2,
          offsetY: -Math.cos(angle) * blockSize / 2
        });
        edge.add(pencilLine);
      } else {
        for (let i = 0; i < 3; i++) {
          const offset = Math.random() * 2 - 1;
          const roughSegment = new Konva.Line({
            points: [
              startX + offset,
              startY + offset,
              endX + offset,
              endY + offset
            ],
            stroke: ColorMap[value.color],
            strokeWidth: 1,
            lineCap: 'round',
            lineJoin: 'round',
            tension: 0.5
          });
          edge.add(roughSegment);
        }
      }
    }

    edgeLayer.add(edge);
    edges.set(key, value);
  });

  console.log('Loaded edges:', edges);
  edgeLayer.batchDraw();
}


export { initializeEdgePreview, updateEdgePreview, placeEdge, clearEdges, edges, loadEdgesFromStorage };
