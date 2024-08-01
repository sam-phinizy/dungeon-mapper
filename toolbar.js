
import { ColorEnum, ColorMap, getColorEnum, getColorName } from './colors.js';

let currentColor = ColorEnum.WHITE; // Default color
let currentRoughLineType = 'standard'; // Default rough line type

function initializeToolbar() {
    document.getElementById('penTool').addEventListener('click', () => setTool('pen'));
    document.getElementById('rectTool').addEventListener('click', () => setTool('rect'));
    document.getElementById('circleTool').addEventListener('click', () => setTool('circle'));
    document.getElementById('lineTool').addEventListener('click', () => setTool('line'));
    document.getElementById('selectTool').addEventListener('click', () => setTool('select'));
    document.getElementById('doorTool').addEventListener('click', () => setTool('door'));
    document.getElementById('notesTool').addEventListener('click', () => setTool('notes'));
    document.getElementById('roughLineTool').addEventListener('click', () => setTool('roughLine'));
    document.getElementById('downloadTool').addEventListener('click', downloadCanvas);

    initializeColorPicker();
    initializeRoughLineDropdown();
}

function initializeColorPicker() {
    const colorPicker = document.createElement('div');
    colorPicker.id = 'color-picker';
    colorPicker.style.display = 'flex';
    colorPicker.style.flexWrap = 'wrap';
    colorPicker.style.justifyContent = 'center';
    colorPicker.style.marginTop = '10px';

    Object.entries(ColorMap).forEach(([colorEnum, hexColor]) => {
        const colorButton = document.createElement('button');
        colorButton.style.width = '30px';
        colorButton.style.height = '30px';
        colorButton.style.backgroundColor = hexColor;
        colorButton.style.margin = '2px';
        colorButton.style.border = '2px solid transparent';
        colorButton.style.cursor = 'pointer';
        colorButton.style.borderRadius = '50%';
        colorButton.dataset.color = colorEnum;
        colorButton.addEventListener('click', () => setColor(parseInt(colorEnum)));
        colorPicker.appendChild(colorButton);
    });

    document.getElementById('floating-tools').appendChild(colorPicker);

    // Set initial color to white
    setColor(ColorEnum.WHITE);
}

function initializeRoughLineDropdown() {
    const roughLineToolButton = document.getElementById('roughLineTool');
    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'dropdown-content';
    dropdownContent.style.display = 'none';
    dropdownContent.style.position = 'absolute';
    dropdownContent.style.backgroundColor = '#f9f9f9';
    dropdownContent.style.minWidth = '120px';
    dropdownContent.style.boxShadow = '0px 8px 16px 0px rgba(0,0,0,0.2)';
    dropdownContent.style.zIndex = '1';

    const options = ['Normal', 'Lightly Rough', 'Wavy', 'Jagged', 'Blocks'];
    options.forEach(option => {
        const item = document.createElement('a');
        item.href = '#';
        item.textContent = option;
        item.style.color = 'black';
        item.style.padding = '12px 16px';
        item.style.textDecoration = 'none';
        item.style.display = 'block';
        item.addEventListener('click', (e) => {
            e.preventDefault();
            setRoughLineType(option.toLowerCase());
            dropdownContent.style.display = 'none';
        });
        dropdownContent.appendChild(item);
    });

    const dropdownArrow = document.createElement('span');
    dropdownArrow.textContent = '▼';
    dropdownArrow.style.marginLeft = '5px';
    dropdownArrow.style.fontSize = '10px';
    roughLineToolButton.appendChild(dropdownArrow);

    roughLineToolButton.parentNode.style.position = 'relative';
    roughLineToolButton.parentNode.appendChild(dropdownContent);

    roughLineToolButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContent.style.display = dropdownContent.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
        dropdownContent.style.display = 'none';
    });
}

function setTool(tool) {
    window.state.currentTool = tool;
    document.getElementById('penTool').classList.toggle('active-tool', tool === 'pen');
    document.getElementById('rectTool').classList.toggle('active-tool', tool === 'rect');
    document.getElementById('circleTool').classList.toggle('active-tool', tool === 'circle');
    document.getElementById('lineTool').classList.toggle('active-tool', tool === 'line');
    document.getElementById('selectTool').classList.toggle('active-tool', tool === 'select');
    document.getElementById('doorTool').classList.toggle('active-tool', tool === 'door');
    document.getElementById('notesTool').classList.toggle('active-tool', tool === 'notes');
    document.getElementById('roughLineTool').classList.toggle('active-tool', tool === 'roughLine');
}

function setColor(colorEnum) {
    currentColor = colorEnum;

    // Remove highlight from all color buttons
    const colorButtons = document.querySelectorAll('#color-picker button');
    colorButtons.forEach(button => {
        button.style.boxShadow = 'none';
        button.style.border = '2px solid transparent';
    });

    // Add highlight to the selected color button
    const selectedButton = document.querySelector(`#color-picker button[data-color="${colorEnum}"]`);
    if (selectedButton) {
        selectedButton.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        selectedButton.style.border = '2px solid #fff';
    }
}

function getCurrentColor() {
    return currentColor;
}

function setRoughLineType(type) {
    currentRoughLineType = type;
    console.log(`Rough line type set to: ${type}`);
    // For now, all options do the same thing
    setTool('roughLine');
}

function getCurrentRoughLineType() {
    return currentRoughLineType;
}

function downloadCanvas() {
    const tempCanvas = document.createElement('canvas');
    const tempContext = tempCanvas.getContext('2d');
    tempCanvas.width = window.stage.width();
    tempCanvas.height = window.stage.height();

    tempContext.fillStyle = '#1a1a1a';
    tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    [window.gridLayer, window.cellLayer, window.doorLayer, window.selectionLayer].forEach(layer => {
        tempContext.drawImage(layer.canvas._canvas, 0, 0);
    });

    const link = document.createElement('a');
    link.download = 'dungeon_map.png';
    link.href = tempCanvas.toDataURL('image/png');

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export { initializeToolbar, setTool, setColor, getCurrentColor, getCurrentRoughLineType };
