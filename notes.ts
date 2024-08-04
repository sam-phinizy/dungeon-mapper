// notes.ts

interface Notes {
  [key: string]: string;
}

let notes: Notes = {};
let currentNote: { row: number; col: number } | null = null;

export function initializeNotes(): void {
  const saveNoteButton = document.getElementById("save-note");
  const cancelNoteButton = document.getElementById("cancel-note");

  if (saveNoteButton) {
    saveNoteButton.addEventListener("click", saveNote);
  }
  if (cancelNoteButton) {
    cancelNoteButton.addEventListener("click", closeNoteEditor);
  }
}

export function openNoteEditor(row: number, col: number): void {
  const noteEditor = document.getElementById("note-editor");
  const noteText = document.getElementById("note-text") as HTMLTextAreaElement;

  if (noteEditor && noteText) {
    noteEditor.style.display = "block";

    const key = `${row}-${col}`;
    currentNote = { row, col };
    noteText.value = notes[key] || "";
    noteText.focus();
  }
}

function saveNote(): void {
  if (currentNote) {
    const noteText = document.getElementById(
      "note-text",
    ) as HTMLTextAreaElement;
    if (noteText) {
      const key = `${currentNote.row}-${currentNote.col}`;
      notes[key] = noteText.value;
      highlightNoteCell(currentNote.row, currentNote.col);
      closeNoteEditor();
    }
  }
}

function closeNoteEditor(): void {
  const noteEditor = document.getElementById("note-editor");
  if (noteEditor) {
    noteEditor.style.display = "none";
    currentNote = null;
  }
}

function highlightNoteCell(row: number, col: number): void {
  const cell = (window as any).cellLayer.findOne(`#cell-${row}-${col}`);
  if (cell) {
    cell.stroke("orange");
    cell.strokeWidth(2);
    (window as any).cellLayer.batchDraw();
  }
}

export function showNotePopover(
  row: number,
  col: number,
  pos: { x: number; y: number },
): void {
  const key = `${row}-${col}`;
  const noteText = notes[key];
  const popover = document.getElementById("note-popover");

  if (popover) {
    if (noteText) {
      popover.innerHTML = noteText.replace(/\n/g, "<br>");
      popover.style.display = "block";
      popover.style.left = `${pos.x + 10}px`;
      popover.style.top = `${pos.y + 10}px`;
    } else {
      popover.style.display = "none";
    }
  }
}

export function getNotes(): Notes {
  return notes;
}

export function setNotes(newNotes: Notes): void {
  notes = newNotes;
}
