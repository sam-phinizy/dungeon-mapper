import { type DungeonMapGrid } from "./index";

type EventCallback = (data?: any) => void;

class EventEmitter {
  private events: { [key: string]: EventCallback[] } = {};

  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event: string, data?: any) {
    const callbacks = this.events[event];
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }
}

export const dataEvents = new EventEmitter();

export function emitDataSaved(dungeonGrid: DungeonMapGrid) {
  dataEvents.emit("dataSaved", dungeonGrid);
}

export function emitDataDirtied() {
  dataEvents.emit("dataDirtied");
}
