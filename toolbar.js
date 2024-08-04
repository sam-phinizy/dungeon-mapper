import { ColorEnum, ColorMap, getColorEnum, getColorName } from "./colors.js";

let currentColor = ColorEnum.WHITE; // Default color
let currentRoughLineType = "standard"; // Default rough line type

function initializeToolbar() {
  const toolbar = document.getElementById("floating-tools");

  const tools = [
    { id: "penTool", icon: "fi-rr-pencil", title: "Pen Tool" },
    { id: "rectTool", icon: "fi-rr-square", title: "Rectangle Tool" },
    { id: "circleTool", icon: "fi-rr-circle", title: "Circle Tool" },
    { id: "lineTool", icon: "fi-rr-line-width", title: "Line Tool" },
    { id: "selectTool", icon: "fi-rr-cursor", title: "Select Tool" },
    { id: "doorTool", icon: "fi-rr-door-open", title: "Door Tool" },
    { id: "notesTool", icon: "fi-rr-note", title: "Notes Tool" },
    { id: "roughLineTool", icon: "fi-rr-edit", title: "Rough Line Tool" },
    { id: "downloadTool", icon: "fi-rr-download", title: "Download Canvas" },
  ];

  tools.forEach((tool) => {
    const button = document.createElement("button");
    button.id = tool.id;
    button.className = "btn btn-outline-secondary mb-2";
    button.title = tool.title;
    button.innerHTML = `<i class="fi ${tool.icon}"></i>`;
    button.addEventListener("click", () =>
      setTool(tool.id.replace("Tool", "")),
    );
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

function initializeColorPicker() {
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

  document.getElementById("floating-tools").appendChild(colorPicker);

  // Set initial color to white
  setColor(ColorEnum.WHITE);
}

function toggleColorPicker() {
  const colorPicker = document.getElementById("color-picker");
  colorPicker.style.display =
    colorPicker.style.display === "none" ? "block" : "none";
}

function initializeRoughLineDropdown() {
  const roughLineToolButton = document.getElementById("roughLineTool");
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

function setTool(tool) {
  window.state.currentTool = tool;
  document
    .getElementById("penTool")
    .classList.toggle("active-tool", tool === "pen");
  document
    .getElementById("rectTool")
    .classList.toggle("active-tool", tool === "rect");
  document
    .getElementById("circleTool")
    .classList.toggle("active-tool", tool === "circle");
  document
    .getElementById("lineTool")
    .classList.toggle("active-tool", tool === "line");
  document
    .getElementById("selectTool")
    .classList.toggle("active-tool", tool === "select");
  document
    .getElementById("doorTool")
    .classList.toggle("active-tool", tool === "door");
  document
    .getElementById("notesTool")
    .classList.toggle("active-tool", tool === "notes");
  document
    .getElementById("roughLineTool")
    .classList.toggle("active-tool", tool === "roughLine");
}

function setColor(colorEnum) {
  currentColor = colorEnum;
  const colorButton = document.getElementById("colorTool");
  colorButton.style.backgroundColor = ColorMap[colorEnum];
  colorButton.style.borderColor = ColorMap[colorEnum];
}

function getCurrentColor() {
  return currentColor;
}

function setRoughLineType(type) {
  currentRoughLineType = type;
  console.log(`Rough line type set to: ${type}`);
  // For now, all options do the same thing
  setTool("roughLine");
}

function toggleDebugMode() {
  window.state.debugMode = !window.state.debugMode;
  document
    .getElementById("debugTool")
    .classList.toggle("active-tool", window.state.debugMode);
}

function initializeDebugTool() {
  const debugTool = document.createElement("button");
  debugTool.id = "debugTool";
  debugTool.innerHTML = "🐞"; // Bug emoji as the icon
  debugTool.title = "Toggle Debug Mode";
  debugTool.addEventListener("click", toggleDebugMode);
  document.getElementById("toolbar").appendChild(debugTool);
}

function getCurrentRoughLineType() {
  return currentRoughLineType;
}

function downloadCanvas() {
  const tempCanvas = document.createElement("canvas");
  const tempContext = tempCanvas.getContext("2d");
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

export {
  initializeToolbar,
  setTool,
  setColor,
  getCurrentColor,
  getCurrentRoughLineType,
  initializeDebugTool,
};
