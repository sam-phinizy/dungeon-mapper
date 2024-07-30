// eventHandlers.js

import { snapToGrid } from './utils.js';
import { updateDoorPreview, placeDoor } from './doors.js';
import { toggleCell } from './drawing.js';
import { startSelection, updateSelection, endSelection } from './selection.js';
import { handleDragMove, handleDragEnd } from './roomDrag.js';

export function initEventListeners(stage, state) {
  stage.on('mousedown touchstart', (e) => handleStageMouseDown(e, stage, state));
  stage.on('mousemove touchmove', (e) => handleStageMouseMove(e, stage, state));
  stage.on('mouseup touchend', () => handleStageMouseUp(state));

  // Multi-touch events for mobile
  stage.on('touchmove', (e) => handleMultiTouch(e, stage, state));

  // Drag events
  stage.on('dragmove', handleDragMove);
  stage.on('dragend', handleDragEnd);
}

function handleStageMouseDown(e, stage, state) {
  if (e.evt.touches && e.evt.touches.length === 2) {
    state.isPanning = true;
    return;
  }

  const pos = stage.getPointerPosition();
  const snappedPos = snapToGrid(pos.x, pos.y, stage.CELL_SIZE);

  if (state.currentTool === 'door') {
    placeDoor(stage.doorLayer);
  } else if (state.currentTool === 'select') {
    startSelection(snappedPos, stage.selectionLayer, stage.CELL_SIZE);
  } else if (state.currentTool === 'draw') {
    state.isDrawing = true;
    const row = Math.floor(snappedPos.y / stage.CELL_SIZE);
    const col = Math.floor(snappedPos.x / stage.CELL_SIZE);
    toggleCell(row, col, stage.cellLayer);
  }
}

function handleStageMouseMove(e, stage, state) {
  if (state.isPanning) return;

  const pos = stage.getPointerPosition();

  if (state.currentTool === 'door') {
    updateDoorPreview(pos, stage.CELL_SIZE, state);
  } else if (state.currentTool === 'select') {
    updateSelection(pos, stage.CELL_SIZE);
  } else if (state.currentTool === 'draw' && state.isDrawing) {
    const snappedPos = snapToGrid(pos.x, pos.y, stage.CELL_SIZE);
    const row = Math.floor(snappedPos.y / stage.CELL_SIZE);
    const col = Math.floor(snappedPos.x / stage.CELL_SIZE);
    toggleCell(row, col, stage.cellLayer);
  }
}

function handleStageMouseUp(state) {
  state.isPanning = false;
  state.isDrawing = false;

  if (state.currentTool === 'select') {
    endSelection();
  }
}

function handleMultiTouch(e, stage, state) {
  e.evt.preventDefault();
  const touch1 = e.evt.touches[0];
  const touch2 = e.evt.touches[1];

  if (touch1 && touch2) {
    const center = {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };

    if (!state.lastCenter) {
      state.lastCenter = center;
      return;
    }

    const dist = Math.sqrt(
      (touch1.clientX - touch2.clientX) ** 2 + (touch1.clientY - touch2.clientY) ** 2
    );

    if (!state.lastDist) {
      state.lastDist = dist;
    }

    const pointTo = {
      x: (center.x - stage.x()) / stage.scaleX(),
      y: (center.y - stage.y()) / stage.scaleY(),
    };

    const scale = stage.scaleX() * (dist / state.lastDist);

    stage.scaleX(scale);
    stage.scaleY(scale);

    const dx = center.x - state.lastCenter.x;
    const dy = center.y - state.lastCenter.y;

    const newPos = {
      x: center.x - pointTo.x * scale + dx,
      y: center.y - pointTo.y * scale + dy,
    };

    stage.position(newPos);
    stage.batchDraw();

    state.lastDist = dist;
    state.lastCenter = center;
  }
}