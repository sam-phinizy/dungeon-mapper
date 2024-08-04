import { ColorEnum } from "./colors.ts";
import { type EdgeData, edges } from "./edges.ts";
import { type DungeonMapGrid } from "./index.ts";

export function snapToGrid(
  x: number,
  y: number,
  CELL_SIZE: number,
): { x: number; y: number } {
  return {
    x: Math.floor(x / CELL_SIZE) * CELL_SIZE,
    y: Math.floor(y / CELL_SIZE) * CELL_SIZE,
  };
}

function debounce<F extends (...args: any[]) => void>(
  func: F,
  wait: number,
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<F>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export const debouncedSave = debounce((dungeonGrid: DungeonMapGrid) => {
  saveToLocalStorage(dungeonGrid);
}, 1000);

export function saveToLocalStorage(dungeonGrid: DungeonMapGrid): void {
  const gridData: Record<string, ColorEnum> = {};
  for (const [key, colorEnum] of dungeonGrid) {
    gridData[key] = colorEnum;
  }
  localStorage.setItem("dungeonMapperGrid", JSON.stringify(gridData));
  localStorage.setItem("dungeonMapperEdges", JSON.stringify(Array.from(edges)));
}

export function loadFromLocalStorage(): {
  gridData: Map<string, ColorEnum>;
  edges: [string, EdgeData][];
} {
  const gridData = new Map<string, ColorEnum>();
  const savedGrid = JSON.parse(
    localStorage.getItem("dungeonMapperGrid") || "{}",
  );
  Object.entries(savedGrid).forEach(([key, value]) => {
    gridData.set(key, value as ColorEnum);
  });

  const edges = JSON.parse(localStorage.getItem("dungeonMapperEdges") || "[]");

  return { gridData, edges };
}
