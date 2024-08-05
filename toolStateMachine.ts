import { ToolType } from "./tooltypes";
import { clearPreview, shapePreview, updatePenPreview } from "./preview";
import Konva from "konva";
import { snapToGrid } from "./utils";
import { toggleCell } from "./drawing";
import { type State } from "./index";
import { getCurrentColor } from "./toolbar";
import { emitDataDirtied } from "./events";
import { type ColorEnum, ColorMap } from "./colors.ts";
import { debouncedSave } from "./utils.ts";

interface ToolState {
  enter(): void;

  exit(): void;

  handleMouseDown(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void;

  handleMouseMove(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void;

  handleMouseUp(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void;
}

abstract class BaseToolState implements ToolState {
  constructor(
    protected stage: Konva.Stage,
    protected state: State,
  ) {}

  abstract enter(): void;

  abstract exit(): void;

  abstract handleMouseDown(
    _: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ): void;

  abstract handleMouseMove(
    _: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ): void;

  abstract handleMouseUp(
    _: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ): void;
}

export class PenToolState extends BaseToolState {
  private isDrawing: boolean = false;
  private lastDrawnCell: { x: number; y: number } | null = null;

  enter(): void {
    this.stage.container().style.cursor = "crosshair";
  }

  exit(): void {
    this.isDrawing = false;
    this.lastDrawnCell = null;
    clearPreview();
  }

  handleMouseDown(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.isDrawing = true;
    this.drawCell(snappedPos);
  }

  handleMouseMove(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);

    if (this.isDrawing) {
      this.drawCell(snappedPos);
    } else {
      updatePenPreview(
        pos,
        this.state.config.cellSize,
        this.state.config.previewColor,
      );
    }
  }

  handleMouseUp(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    this.isDrawing = false;
    this.lastDrawnCell = null;
    clearPreview();
    emitDataDirtied();
    debouncedSave(this.state.dungeonMapperGrid);
  }

  private drawCell(pos: Konva.Vector2d): void {
    const cellX = Math.floor(pos.x / this.state.config.cellSize);
    const cellY = Math.floor(pos.y / this.state.config.cellSize);

    // Check if we're drawing in a new cell
    if (
      !this.lastDrawnCell ||
      this.lastDrawnCell.x !== cellX ||
      this.lastDrawnCell.y !== cellY
    ) {
      toggleCell(
        this.state.dungeonMapperGrid,
        cellX,
        cellY,
        this.state.layers?.cellLayer,
        this.state.config.cellSize,
        getCurrentColor(),
      );

      this.lastDrawnCell = { x: cellX, y: cellY };
      this.state.layers.cellLayer.batchDraw();
    }
  }
}

export class RectToolState extends BaseToolState {
  private isDrawing: boolean = false;
  private startPos: Konva.Vector2d | null = null;

  enter(): void {
    this.stage.container().style.cursor = "crosshair";
  }

  exit(): void {
    this.isDrawing = false;
    this.startPos = null;
    clearPreview();
  }

  handleMouseDown(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.isDrawing = true;
    this.startPos = snappedPos;
  }

  handleMouseMove(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);

    if (this.isDrawing && this.startPos) {
      shapePreview(
        this.startPos,
        snappedPos,
        ToolType.RECT,
        this.state.config.cellSize,
        this.state.config.previewColor,
      );
    }
  }

  handleMouseUp(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.isDrawing || !this.startPos) return;

    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const endPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.drawRect(this.startPos, endPos);

    this.isDrawing = false;
    this.startPos = null;
    clearPreview();
    emitDataDirtied();
    debouncedSave(this.state.dungeonMapperGrid);
  }

  private drawRect(startPos: Konva.Vector2d, endPos: Konva.Vector2d): void {
    const startCol = Math.floor(startPos.x / this.state.config.cellSize);
    const startRow = Math.floor(startPos.y / this.state.config.cellSize);
    const endCol = Math.floor(endPos.x / this.state.config.cellSize);
    const endRow = Math.floor(endPos.y / this.state.config.cellSize);

    for (
      let row = Math.min(startRow, endRow);
      row <= Math.max(startRow, endRow);
      row++
    ) {
      for (
        let col = Math.min(startCol, endCol);
        col <= Math.max(startCol, endCol);
        col++
      ) {
        toggleCell(
          this.state.dungeonMapperGrid,
          col,
          row,
          this.state.layers.cellLayer,
          this.state.config.cellSize,
          getCurrentColor(),
        );
      }
    }

    this.state.layers.cellLayer.batchDraw();
  }
}

export class CircleToolState extends BaseToolState {
  private isDrawing: boolean = false;
  private startPos: Konva.Vector2d | null = null;

  enter(): void {
    this.stage.container().style.cursor = "crosshair";
  }

  exit(): void {
    this.isDrawing = false;
    this.startPos = null;
    clearPreview();
  }

  handleMouseDown(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.isDrawing = true;
    this.startPos = snappedPos;
  }

  handleMouseMove(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);

    if (this.isDrawing && this.startPos) {
      shapePreview(
        this.startPos,
        snappedPos,
        ToolType.CIRCLE,
        this.state.config.cellSize,
        this.state.config.previewColor,
      );
    }
  }

  handleMouseUp(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.isDrawing || !this.startPos) return;

    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const endPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.drawCircle(this.startPos, endPos);

    this.isDrawing = false;
    this.startPos = null;
    clearPreview();
    emitDataDirtied();
    debouncedSave(this.state.dungeonMapperGrid);
  }

  private drawCircle(startPos: Konva.Vector2d, endPos: Konva.Vector2d): void {
    const startCol = Math.floor(startPos.x / this.state.config.cellSize);
    const startRow = Math.floor(startPos.y / this.state.config.cellSize);
    const endCol = Math.floor(endPos.x / this.state.config.cellSize);
    const endRow = Math.floor(endPos.y / this.state.config.cellSize);

    const centerRow = (startRow + endRow) / 2;
    const centerCol = (startCol + endCol) / 2;
    const radius =
      Math.sqrt(
        Math.pow(endRow - startRow, 2) + Math.pow(endCol - startCol, 2),
      ) / 2;

    for (
      let row = Math.floor(centerRow - radius);
      row <= Math.ceil(centerRow + radius);
      row++
    ) {
      for (
        let col = Math.floor(centerCol - radius);
        col <= Math.ceil(centerCol + radius);
        col++
      ) {
        if (
          Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2) <=
          Math.pow(radius, 2)
        ) {
          toggleCell(
            this.state.dungeonMapperGrid,
            col,
            row,
            this.state.layers.cellLayer,
            this.state.config.cellSize,
            getCurrentColor(),
          );
        }
      }
    }

    this.state.layers.cellLayer.batchDraw();
  }
}

export class LineToolState extends BaseToolState {
  private isDrawing: boolean = false;
  private startPos: Konva.Vector2d | null = null;

  enter(): void {
    this.stage.container().style.cursor = "crosshair";
  }

  exit(): void {
    this.isDrawing = false;
    this.startPos = null;
    clearPreview();
  }

  handleMouseDown(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.isDrawing = true;
    this.startPos = snappedPos;
  }

  handleMouseMove(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);

    if (this.isDrawing && this.startPos) {
      shapePreview(
        this.startPos,
        snappedPos,
        ToolType.LINE,
        this.state.config.cellSize,
        this.state.config.previewColor,
      );
    }
  }

  handleMouseUp(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.isDrawing || !this.startPos) return;

    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const endPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.drawLine(this.startPos, endPos);

    this.isDrawing = false;
    this.startPos = null;
    clearPreview();
    emitDataDirtied();
    debouncedSave(this.state.dungeonMapperGrid);
  }

  private drawLine(startPos: Konva.Vector2d, endPos: Konva.Vector2d): void {
    const startCol = Math.floor(startPos.x / this.state.config.cellSize);
    const startRow = Math.floor(startPos.y / this.state.config.cellSize);
    const endCol = Math.floor(endPos.x / this.state.config.cellSize);
    const endRow = Math.floor(endPos.y / this.state.config.cellSize);

    const dx = Math.abs(endCol - startCol);
    const dy = Math.abs(endRow - startRow);
    const sx = startCol < endCol ? 1 : -1;
    const sy = startRow < endRow ? 1 : -1;
    let err = dx - dy;

    let row = startRow;
    let col = startCol;

    while (true) {
      toggleCell(
        this.state.dungeonMapperGrid,
        col,
        row,
        this.state.layers.cellLayer,
        this.state.config.cellSize,
        getCurrentColor(),
      );

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

    this.state.layers.cellLayer.batchDraw();
  }
}

export class SelectToolState extends BaseToolState {
  private isSelecting: boolean = false;
  private startPos: Konva.Vector2d | null = null;
  private selectionRect: Konva.Rect | null = null;

  enter(): void {
    this.stage.container().style.cursor = "crosshair";
  }

  exit(): void {
    this.clearSelection();
  }

  handleMouseDown(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.isSelecting = true;
    this.startPos = snappedPos;
    this.createSelectionRect(snappedPos);
  }

  handleMouseMove(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.isSelecting || !this.startPos || !this.selectionRect) return;

    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.updateSelectionRect(snappedPos);
  }

  handleMouseUp(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.isSelecting || !this.startPos || !this.selectionRect) return;

    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.finalizeSelection(snappedPos);

    this.isSelecting = false;
    this.startPos = null;
  }

  private createSelectionRect(pos: Konva.Vector2d): void {
    this.selectionRect = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: this.state.config.cellSize,
      height: this.state.config.cellSize,
      fill: "rgba(0, 0, 255, 0.3)",
      stroke: "blue",
      strokeWidth: 2,
    });
    this.state.layers.interactionLayer.add(this.selectionRect);
    this.state.layers.interactionLayer.batchDraw();
  }

  private updateSelectionRect(pos: Konva.Vector2d): void {
    if (!this.selectionRect || !this.startPos) return;

    const x = Math.min(this.startPos.x, pos.x);
    const y = Math.min(this.startPos.y, pos.y);
    const width =
      Math.abs(pos.x - this.startPos.x) + this.state.config.cellSize;
    const height =
      Math.abs(pos.y - this.startPos.y) + this.state.config.cellSize;

    this.selectionRect.position({ x, y });
    this.selectionRect.size({ width, height });
    this.state.layers.interactionLayer.batchDraw();
  }

  private finalizeSelection(endPos: Konva.Vector2d): void {
    if (!this.startPos) return;

    const startCol = Math.floor(this.startPos.x / this.state.config.cellSize);
    const startRow = Math.floor(this.startPos.y / this.state.config.cellSize);
    const endCol = Math.floor(endPos.x / this.state.config.cellSize);
    const endRow = Math.floor(endPos.y / this.state.config.cellSize);

    const selectedCells = [];
    for (
      let row = Math.min(startRow, endRow);
      row <= Math.max(startRow, endRow);
      row++
    ) {
      for (
        let col = Math.min(startCol, endCol);
        col <= Math.max(startCol, endCol);
        col++
      ) {
        const key = `${col},${row}`;
        const state = this.state.dungeonMapperGrid.get(key);
        selectedCells.push({
          row,
          col,
          state: state !== undefined ? state : null,
        });
      }
    }

    this.state.selectedCells = selectedCells;
  }

  private clearSelection(): void {
    if (this.selectionRect) {
      this.selectionRect.destroy();
      this.selectionRect = null;
      this.state.layers.interactionLayer.batchDraw();
    }
    this.state.selectedCells = [];
  }
}

export class ColorToolState extends BaseToolState {
  private colorPicker: Konva.Group | null = null;

  enter(): void {
    this.stage.container().style.cursor = "pointer";
    this.showColorPicker();
  }

  exit(): void {
    this.hideColorPicker();
  }

  handleMouseDown(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const clickedShape = this.stage.getIntersection(pos);
    if (clickedShape && clickedShape.parent === this.colorPicker) {
      const colorData = clickedShape.attrs.colorData;
      if (colorData !== undefined) {
        this.setColor(colorData);
      }
    }
  }

  handleMouseMove(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    // No specific action needed on mouse move for color tool
  }

  handleMouseUp(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    // No specific action needed on mouse up for color tool
  }

  private showColorPicker(): void {
    if (this.colorPicker) {
      this.colorPicker.visible(true);
      return;
    }

    this.colorPicker = new Konva.Group({
      x: 10,
      y: 10,
    });

    const colors = Object.entries(ColorMap);
    const boxSize = 30;
    const padding = 5;

    colors.forEach(([colorEnum, hexColor], index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;

      const colorBox = new Konva.Rect({
        x: col * (boxSize + padding),
        y: row * (boxSize + padding),
        width: boxSize,
        height: boxSize,
        fill: hexColor,
        stroke: "black",
        strokeWidth: 1,
        cornerRadius: 5,
        colorData: parseInt(colorEnum),
      });

      if (this.colorPicker) {
        this.colorPicker.add(colorBox);
      }
    });

    this.state.layers.interactionLayer.add(this.colorPicker);
    this.state.layers.interactionLayer.batchDraw();
  }

  private hideColorPicker(): void {
    if (this.colorPicker) {
      this.colorPicker.visible(false);
      this.state.layers.interactionLayer.batchDraw();
    }
  }

  private setColor(colorEnum: ColorEnum): void {
    this.state.currentColor = colorEnum;
    const colorButton = document.getElementById("colorTool");
    if (colorButton) {
      colorButton.style.backgroundColor = ColorMap[colorEnum];
      colorButton.style.borderColor = ColorMap[colorEnum];
    }
  }
}

export class RoughLineToolState extends BaseToolState {
  private isDrawing: boolean = false;
  private startPos: Konva.Vector2d | null = null;
  private roughLinePreview: Konva.Group | null = null;
  private currentRoughLineType: string = "normal";

  enter(): void {
    this.stage.container().style.cursor = "crosshair";
  }

  exit(): void {
    this.clearRoughLinePreview();
  }

  handleMouseDown(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.isDrawing = true;
    this.startPos = snappedPos;
    this.updateRoughLinePreview(snappedPos);
  }

  handleMouseMove(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.isDrawing || !this.startPos) return;

    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.updateRoughLinePreview(snappedPos);
  }

  handleMouseUp(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.isDrawing || !this.startPos) return;

    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = snapToGrid(pos.x, pos.y, this.state.config.cellSize);
    this.placeRoughLine(snappedPos);

    this.isDrawing = false;
    this.startPos = null;
    this.clearRoughLinePreview();
  }

  private updateRoughLinePreview(endPos: Konva.Vector2d): void {
    this.clearRoughLinePreview();
    if (!this.startPos) return;

    this.roughLinePreview = this.createRoughLineShape(this.startPos, endPos);
    this.state.layers.interactionLayer.add(this.roughLinePreview);
    this.state.layers.interactionLayer.batchDraw();
  }

  private placeRoughLine(endPos: Konva.Vector2d): void {
    if (!this.startPos) return;

    const roughLine = this.createRoughLineShape(this.startPos, endPos);
    this.state.layers.edgeLayer.add(roughLine);
    this.state.layers.edgeLayer.batchDraw();

    const key = `${this.startPos.x},${this.startPos.y}-${endPos.x},${endPos.y}`;
    this.state.edges.set(key, {
      type: "roughLine",
      roughLineType: this.currentRoughLineType,
      color: getCurrentColor(),
      konvaObject: roughLine,
    });

    emitDataDirtied();
    debouncedSave(this.state.dungeonMapperGrid, this.state.edges);
  }

  private createRoughLineShape(
    startPos: Konva.Vector2d,
    endPos: Konva.Vector2d,
  ): Konva.Group {
    const roughLineGroup = new Konva.Group();
    const color = ColorMap[getCurrentColor()];

    switch (this.currentRoughLineType) {
      case "normal":
        roughLineGroup.add(this.createNormalLine(startPos, endPos, color));
        break;
      case "rough":
        roughLineGroup.add(...this.createRoughLine(startPos, endPos, color));
        break;
      case "blocks":
        roughLineGroup.add(...this.createBlockLine(startPos, endPos, color));
        break;
      default:
        roughLineGroup.add(this.createNormalLine(startPos, endPos, color));
    }

    return roughLineGroup;
  }

  private createNormalLine(
    startPos: Konva.Vector2d,
    endPos: Konva.Vector2d,
    color: string,
  ): Konva.Line {
    return new Konva.Line({
      points: [startPos.x, startPos.y, endPos.x, endPos.y],
      stroke: color,
      strokeWidth: 2,
      lineCap: "round",
      lineJoin: "round",
    });
  }

  private createRoughLine(
    startPos: Konva.Vector2d,
    endPos: Konva.Vector2d,
    color: string,
  ): Konva.Line[] {
    const lines: Konva.Line[] = [];
    for (let i = 0; i < 3; i++) {
      const offset = Math.random() * 2 - 1;
      lines.push(
        new Konva.Line({
          points: [
            startPos.x + offset,
            startPos.y + offset,
            endPos.x + offset,
            endPos.y + offset,
          ],
          stroke: color,
          strokeWidth: 1,
          lineCap: "round",
          lineJoin: "round",
          tension: 0.5,
        }),
      );
    }
    return lines;
  }

  private createBlockLine(
    startPos: Konva.Vector2d,
    endPos: Konva.Vector2d,
    color: string,
  ): Konva.Shape[] {
    const shapes: Konva.Shape[] = [];
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);

    shapes.push(
      new Konva.Line({
        points: [startPos.x, startPos.y, endPos.x, endPos.y],
        stroke: color,
        strokeWidth: 3,
        lineCap: "square",
        lineJoin: "miter",
      }),
    );

    const blockSize = this.state.config.cellSize / this.getRandomInt(3, 8);
    const numBlocks = Math.floor(length / blockSize);
    for (let i = 0; i < numBlocks; i++) {
      const blockX = startPos.x + Math.cos(angle) * i * blockSize;
      const blockY = startPos.y + Math.sin(angle) * i * blockSize;
      const randomHeight = Math.random() * (2 + 1) + 1;
      const randomWidth = Math.random() * (2 + 1) + 1;
      const randomOffset = Math.random() * 2 - 1;
      shapes.push(
        new Konva.Rect({
          x: blockX - randomOffset,
          y: blockY,
          width: blockSize / randomWidth,
          height: blockSize / randomHeight,
          fill: "white",
          stroke: color,
          strokeWidth: 1,
          rotation: (angle * 180) / Math.PI,
          offsetY: blockSize / 4,
        }),
      );
    }

    return shapes;
  }

  private getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private clearRoughLinePreview(): void {
    if (this.roughLinePreview) {
      this.roughLinePreview.destroy();
      this.roughLinePreview = null;
      this.state.layers.interactionLayer.batchDraw();
    }
  }
}

export class DoorToolState extends BaseToolState {
  private doorPreview: Konva.Group | null = null;

  enter(): void {
    this.stage.container().style.cursor = "pointer";
  }

  exit(): void {
    this.clearDoorPreview();
  }

  handleMouseDown(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = this.snapToEdge(pos);
    this.placeDoor(snappedPos);
  }

  handleMouseMove(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const snappedPos = this.snapToEdge(pos);
    this.updateDoorPreview(snappedPos);
  }

  handleMouseUp(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    // No specific action needed on mouse up for door tool
  }

  private snapToEdge(pos: Konva.Vector2d): Konva.Vector2d {
    const cellX = Math.floor(pos.x / this.state.config.cellSize);
    const cellY = Math.floor(pos.y / this.state.config.cellSize);
    const xOffset = pos.x - cellX * this.state.config.cellSize;
    const yOffset = pos.y - cellY * this.state.config.cellSize;

    if (xOffset < yOffset && xOffset < this.state.config.cellSize - yOffset) {
      // Left edge
      return {
        x: cellX * this.state.config.cellSize,
        y: cellY * this.state.config.cellSize + this.state.config.cellSize / 2,
      };
    } else if (
      yOffset < xOffset &&
      yOffset < this.state.config.cellSize - xOffset
    ) {
      // Top edge
      return {
        x: cellX * this.state.config.cellSize + this.state.config.cellSize / 2,
        y: cellY * this.state.config.cellSize,
      };
    } else if (
      xOffset > yOffset &&
      xOffset > this.state.config.cellSize - yOffset
    ) {
      // Right edge
      return {
        x: (cellX + 1) * this.state.config.cellSize,
        y: cellY * this.state.config.cellSize + this.state.config.cellSize / 2,
      };
    } else {
      // Bottom edge
      return {
        x: cellX * this.state.config.cellSize + this.state.config.cellSize / 2,
        y: (cellY + 1) * this.state.config.cellSize,
      };
    }
  }

  private updateDoorPreview(pos: Konva.Vector2d): void {
    this.clearDoorPreview();
    this.doorPreview = this.createDoorShape(pos);
    this.state.layers.interactionLayer.add(this.doorPreview);
    this.state.layers.interactionLayer.batchDraw();
  }

  private placeDoor(pos: Konva.Vector2d): void {
    const door = this.createDoorShape(pos);
    this.state.layers.edgeLayer.add(door);
    this.state.layers.edgeLayer.batchDraw();

    const key = `${pos.x},${pos.y}`;
    this.state.edges.set(key, { type: "door", konvaObject: door });

    emitDataDirtied();
    debouncedSave(this.state.dungeonMapperGrid, this.state.edges);
  }

  private createDoorShape(pos: Konva.Vector2d): Konva.Group {
    const doorGroup = new Konva.Group();

    const isHorizontal = pos.x % this.state.config.cellSize !== 0;
    const doorWidth = isHorizontal ? this.state.config.cellSize : 5;
    const doorHeight = isHorizontal ? 5 : this.state.config.cellSize;

    const doorLine = new Konva.Rect({
      x: isHorizontal ? pos.x - this.state.config.cellSize / 2 : pos.x - 2.5,
      y: isHorizontal ? pos.y - 2.5 : pos.y - this.state.config.cellSize / 2,
      width: doorWidth,
      height: doorHeight,
      fill: "black",
    });

    const doorHandle = new Konva.Circle({
      x: pos.x + (isHorizontal ? -5 : 0),
      y: pos.y + (isHorizontal ? 0 : -5),
      radius: 2,
      fill: "white",
    });

    doorGroup.add(doorLine, doorHandle);
    return doorGroup;
  }

  private clearDoorPreview(): void {
    if (this.doorPreview) {
      this.doorPreview.destroy();
      this.doorPreview = null;
      this.state.layers.interactionLayer.batchDraw();
    }
  }
}

class ToolStateMachine {
  private currentState: ToolState;
  private toolStates: Record<ToolType, ToolState>;

  constructor(
    private stage: Konva.Stage,
    private state: State,
  ) {
    this.toolStates = {
      [ToolType.PEN]: new PenToolState(stage, state),
      [ToolType.RECT]: new RectToolState(stage, state),
      [ToolType.CIRCLE]: new CircleToolState(stage, state),
      [ToolType.LINE]: new LineToolState(stage, state),
      [ToolType.SELECT]: new SelectToolState(stage, state),
      [ToolType.COLOR]: new ColorToolState(stage, state),
      [ToolType.ROUGH_LINE]: new RoughLineToolState(stage, state),
      [ToolType.DOOR]: new DoorToolState(stage, state),
    };
    this.currentState = this.toolStates[ToolType.PEN];
  }

  setTool(tool: ToolType): void {
    if (this.currentState !== this.toolStates[tool]) {
      this.currentState.exit();
      this.currentState = this.toolStates[tool];
      this.currentState.enter();
      this.state.currentTool = tool;

      const tools = Object.values(ToolType);
      tools.forEach((t) => {
        const element = document.getElementById(`${t}Tool`);
        if (element) {
          element.classList.toggle("active-tool", t === tool);
        }
      });
    }
  }

  handleMouseDown(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    this.currentState.handleMouseDown(_);
  }

  handleMouseMove(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    this.currentState.handleMouseMove(_);
  }

  handleMouseUp(_: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    this.currentState.handleMouseUp(_);
  }
}

export default ToolStateMachine;
