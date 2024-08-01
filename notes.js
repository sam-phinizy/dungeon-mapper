// notes.js

let notes = {};
let currentNote = null;

function initializeNotes() {
    document.getElementById('save-note').addEventListener('click', saveNote);
    document.getElementById('cancel-note').addEventListener('click', closeNoteEditor);
}

function openNoteEditor(row, col) {
    const noteEditor = document.getElementById('note-editor');
    noteEditor.style.display = 'block';

    const noteText = document.getElementById('note-text');
    const key = `${row}-${col}`;
    currentNote = { row, col };
    noteText.value = notes[key] || '';
    noteText.focus();
}

function saveNote() {
    if (currentNote) {
        const noteText = document.getElementById('note-text').value;
        const key = `${currentNote.row}-${currentNote.col}`;
        notes[key] = noteText;
        highlightNoteCell(currentNote.row, currentNote.col);
        closeNoteEditor();
    }
}

function closeNoteEditor() {
    const noteEditor = document.getElementById('note-editor');
    noteEditor.style.display = 'none';
    currentNote = null;
}

function highlightNoteCell(row, col) {
    const cell = window.cellLayer.findOne(`#cell-${row}-${col}`);
    if (cell) {
        cell.stroke('orange');
        cell.strokeWidth(2);
        window.cellLayer.batchDraw();
    }
}

function showNotePopover(row, col, pos) {
    const key = `${row}-${col}`;
    const noteText = notes[key];
    const popover = document.getElementById('note-popover');
    if (noteText) {
        popover.innerHTML = noteText.replace(/\n/g, '<br>');
        popover.style.display = 'block';
        popover.style.left = `${pos.x + 10}px`;
        popover.style.top = `${pos.y + 10}px`;
    } else {
        popover.style.display = 'none';
    }
}

function getNotes() {
    return notes;
}

function setNotes(newNotes) {
    notes = newNotes;
}

export { initializeNotes, openNoteEditor, showNotePopover, getNotes, setNotes };