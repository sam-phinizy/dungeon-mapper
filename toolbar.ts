import { ColorEnum, ColorMap } from "./colors";

let currentColor: ColorEnum = ColorEnum.WHITE; // Default color
let currentRoughLineType: string = "standard"; // Default rough line type

interface Tool {
  id: string;
  icon: string;
  title: string;
}

declare global {
  interface Window {
    state: {
      currentTool: string;
      debugMode: boolean;
    };
    stage: any; // You might want to replace 'any' with the proper Konva.Stage type
    clearGrid: (cellLayer: any) => void; // Replace 'any' with the proper Konva.Layer type
    edges: Map<string, any>; // Replace 'any' with the proper edge data type
    saveToLocalStorage: () => void;
  }
}

export function initializeToolbar(): void {
  const toolbar = document.getElementById("floating-tools");
  if (!toolbar) return;

  const tools: Tool[] = [
    { id: "penTool", icon: "fi-rr-pencil", title: "Pen Tool" },
    { id: "rectTool", icon: "fi-rr-square", title: "Rectangle Tool" },
    { id: "circleTool", icon: "fi-rr-circle", title: "Circle Tool" },
    { id: "lineTool", icon: "fi-rr-line-width", title: "Line Tool" },
    { id: "selectTool", icon: "fi-rr-cursor", title: "Select Tool" },
    { id: "doorTool", icon: "fi-rr-door-open", title: "Door Tool" },
    { id: "notesTool", icon: "fi-rr-note", title: "Notes Tool" },
    { id: "roughLineTool", icon: "fi-rr-edit", title: "Rough Line Tool" },
    { id: "downloadTool", icon: "fi-rr-download", title: "Download Canvas" },
    { id: "clearMapTool", icon: "fi-rr-trash", title: "Clear Map" },
  ];

  tools.forEach((tool) => {
    const button = document.createElement("button");
    button.id = tool.id;
    button.className = "btn btn-outline-secondary mb-2";
    button.title = tool.title;
    button.innerHTML = `<i class="fi ${tool.icon}"></i>`;
    button.addEventListener("click", () => {
      if (tool.id === "clearMapTool") {
        clearMap();
      } else {
        setTool(tool.id.replace("Tool", ""));
      }
    });
    toolbar.appendChild(button);
  });

  const colorButton = document.createElement("button");
  colorButton.id = "colorTool";
  colorButton.className = "btn btn-outline-secondary mb-2";
  colorButton.title = "Color Picker";
  colorButton.innerHTML = '<i class="fi fi-rr-fill"></i>';
  colorButton.addEventListener("click", toggleColorPicker);
  toolbar.appendChild(colorButton);

  initializeColorPicker();
  initializeRoughLineDropdown();
}

function initializeColorPicker(): void {
  const colorPicker = document.createElement("div");
  colorPicker.id = "color-picker";

  Object.entries(ColorMap).forEach(([colorEnum, hexColor]) => {
    const colorButton = document.createElement("button");
    colorButton.style.backgroundColor = hexColor;
    colorButton.dataset.color = colorEnum;
    colorButton.addEventListener("click", () => {
      setColor(parseInt(colorEnum));
      toggleColorPicker();
    });
    colorPicker.appendChild(colorButton);
  });

  const floatingTools = document.getElementById("floating-tools");
  if (floatingTools) {
    floatingTools.appendChild(colorPicker);
  }

  // Set initial color to white
  setColor(ColorEnum.WHITE);
}

function toggleColorPicker(): void {
  const colorPicker = document.getElementById("color-picker");
  if (colorPicker) {
    colorPicker.style.display =
      colorPicker.style.display === "none" ? "block" : "none";
  }
}

function initializeRoughLineDropdown(): void {
  const roughLineToolButton = document.getElementById("roughLineTool");
  if (!roughLineToolButton) return;

  const dropdownContent = document.createElement("div");
  dropdownContent.className = "dropdown-content";
  dropdownContent.style.display = "none";
  dropdownContent.style.position = "absolute";
  dropdownContent.style.left = "100%";
  dropdownContent.style.top = "";
  dropdownContent.style.zIndex = "1000";

  const options = ["Normal", "Lightly Rough", "Wavy", "Jagged", "Blocks"];
  options.forEach((option) => {
    const item = document.createElement("a");
    item.href = "#";
    item.textContent = option;
    item.addEventListener("click", (e) => {
      e.preventDefault();
      setRoughLineType(option.toLowerCase());
      dropdownContent.style.display = "none";
    });
    dropdownContent.appendChild(item);
  });

  roughLineToolButton.appendChild(dropdownContent);

  roughLineToolButton.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownContent.style.display =
      dropdownContent.style.display === "none" ? "block" : "none";
  });

  document.addEventListener("click", () => {
    dropdownContent.style.display = "none";
  });
}

export function setTool(tool: string): void {
  window.state.currentTool = tool;
  const tools = [
    "pen",
    "rect",
    "circle",
    "line",
    "select",
    "door",
    "notes",
    "roughLine",
  ];
  tools.forEach((t) => {
    const element = document.getElementById(`${t}Tool`);
    if (element) {
      element.classList.toggle("active-tool", t === tool);
    }
  });
}

function setColor(colorEnum: ColorEnum): void {
  currentColor = colorEnum;
  const colorButton = document.getElementById("colorTool");
  if (colorButton) {
    colorButton.style.backgroundColor = ColorMap[colorEnum];
    colorButton.style.borderColor = ColorMap[colorEnum];
  }
}

export function getCurrentColor(): ColorEnum {
  return currentColor;
}

function setRoughLineType(type: string): void {
  currentRoughLineType = type;
  console.log(`Rough line type set to: ${type}`);
  // For now, all options do the same thing
  setTool("roughLine");
}

function toggleDebugMode(): void {
  window.state.debugMode = !window.state.debugMode;
  const debugTool = document.getElementById("debugTool");
  if (debugTool) {
    debugTool.classList.toggle("active-tool", window.state.debugMode);
  }
}

export function initializeDebugTool(): void {
  const debugTool = document.createElement("button");
  debugTool.id = "debugTool";
  debugTool.className = "btn btn-outline-secondary mb-2";
  debugTool.innerHTML = "🐞"; // Bug emoji as the icon
  debugTool.title = "Toggle Debug Mode";
  debugTool.addEventListener("click", toggleDebugMode);
  const floatingTools = document.getElementById("floating-tools");
  if (floatingTools) {
    floatingTools.appendChild(debugTool);
  }
}

export function getCurrentRoughLineType(): string {
  return currentRoughLineType;
}

function downloadCanvas(): void {
  const tempCanvas = document.createElement("canvas");
  const tempContext = tempCanvas.getContext("2d");
  if (!tempContext) return;

  tempCanvas.width = window.stage.width();
  tempCanvas.height = window.stage.height();

  tempContext.fillStyle = "#1a1a1a";
  tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  [
    window.gridLayer,
    window.cellLayer,
    window.doorLayer,
    window.selectionLayer,
  ].forEach((layer) => {
    tempContext.drawImage(layer.canvas._canvas, 0, 0);
  });

  const link = document.createElement("a");
  link.download = "dungeon_map.png";
  link.href = tempCanvas.toDataURL("image/png");

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function clearMap(): void {
  if (confirm("Are you sure you want to clear the entire map?")) {
    window.clearGrid(window.cellLayer);
    window.edges.clear();
    window.edgeLayer.destroyChildren();
    window.edgeLayer.draw();
    window.saveToLocalStorage();
  }
}
