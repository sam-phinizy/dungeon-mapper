// toolbar.js

let currentColor = '#ffffff'; // Default color

function initializeToolbar() {
    document.getElementById('penTool').addEventListener('click', () => setTool('pen'));
    document.getElementById('rectTool').addEventListener('click', () => setTool('rect'));
    document.getElementById('circleTool').addEventListener('click', () => setTool('circle'));
    document.getElementById('lineTool').addEventListener('click', () => setTool('line'));
    document.getElementById('selectTool').addEventListener('click', () => setTool('select'));
    document.getElementById('doorTool').addEventListener('click', () => setTool('door'));
    document.getElementById('notesTool').addEventListener('click', () => setTool('notes'));
    document.getElementById('downloadTool').addEventListener('click', downloadCanvas);

    initializeColorPicker();
}

function initializeColorPicker() {
    const colors = ['white', 'black', 'red', 'blue', 'green', 'orange', 'yellow', 'purple'];
    const colorPicker = document.createElement('div');
    colorPicker.id = 'color-picker';
    colorPicker.style.display = 'flex';
    colorPicker.style.flexWrap = 'wrap';
    colorPicker.style.justifyContent = 'center';
    colorPicker.style.marginTop = '10px';

    colors.forEach(color => {
        const colorButton = document.createElement('button');
        colorButton.style.width = '30px';
        colorButton.style.height = '30px';
        colorButton.style.backgroundColor = color;
        colorButton.style.margin = '2px';
        colorButton.style.border = '2px solid transparent';
        colorButton.style.cursor = 'pointer';
        colorButton.style.borderRadius = '50%';
        colorButton.dataset.color = color;
        colorButton.addEventListener('click', () => setColor(color));
        colorPicker.appendChild(colorButton);
    });

    document.getElementById('floating-tools').appendChild(colorPicker);

    // Set initial color to white
    setColor('white');
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
}

function setColor(color) {
    currentColor = color;

    // Remove highlight from all color buttons
    const colorButtons = document.querySelectorAll('#color-picker button');
    colorButtons.forEach(button => {
        button.style.boxShadow = 'none';
        button.style.border = '2px solid transparent';
    });

    // Add highlight to the selected color button
    const selectedButton = document.querySelector(`#color-picker button[data-color="${color}"]`);
    if (selectedButton) {
        selectedButton.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        selectedButton.style.border = '2px solid #fff';
    }
}

function getCurrentColor() {
    return currentColor;
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

export { initializeToolbar, setTool, setColor, getCurrentColor };