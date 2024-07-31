// preview.js

import { snapToGrid } from './utils.js';

let previewLayer;

function initializePreview(layer) {
    previewLayer = layer;
}

function updatePenPreview(snappedPos, CELL_SIZE, currentColor) {
    previewLayer.destroyChildren();

    const rect = new Konva.Rect({
        x: snappedPos.x,
        y: snappedPos.y,
        width: CELL_SIZE,
        height: CELL_SIZE,
        stroke: currentColor,
        strokeWidth: 2
    });
    previewLayer.add(rect);

    previewLayer.batchDraw();
}

function shapePreview(startPos, endPos, tool, CELL_SIZE, currentColor) {
    previewLayer.destroyChildren();

    let shape;
    let text;
    if (tool === 'rect') {
        shape = new Konva.Rect({
            x: Math.min(startPos.x, endPos.x),
            y: Math.min(startPos.y, endPos.y),
            width: Math.abs(endPos.x - startPos.x),
            height: Math.abs(endPos.y - startPos.y),
            stroke: currentColor,
            strokeWidth: 2
        });
        let w = Math.abs(endPos.x - startPos.x) / CELL_SIZE;
        let h = Math.abs(endPos.y - startPos.y) / CELL_SIZE;
        text = new Konva.Text({
            x: (startPos.x + endPos.x) / 2,
            y: (startPos.y - 12),
            text: "W: " + w + " H: " + h,
            fontSize: 12,
            fontFamily: 'Calibri',
            fill: currentColor,
        });
    } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)) / 2;
        shape = new Konva.Circle({
            x: (startPos.x + endPos.x) / 2,
            y: (startPos.y + endPos.y) / 2,
            radius: radius,
            stroke: currentColor,
            strokeWidth: 2
        });
    } else if (tool === 'line') {
        shape = new Konva.Line({
            points: [startPos.x + CELL_SIZE / 2, startPos.y + CELL_SIZE / 2, endPos.x + CELL_SIZE / 2, endPos.y + CELL_SIZE / 2],
            stroke: currentColor,
            strokeWidth: 2
        });
    }

    if (text) {
        previewLayer.add(text);
    }
    if (shape) {
        previewLayer.add(shape);
        previewLayer.batchDraw();
    }
}

function clearPreview() {
    previewLayer.destroyChildren();
    previewLayer.batchDraw();
}

export { initializePreview, updatePenPreview, shapePreview, clearPreview };