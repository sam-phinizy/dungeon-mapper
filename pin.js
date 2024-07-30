export class Pin {
  constructor(stage, layer) {
    this.stage = stage;
    this.layer = layer;
    this.pin = new Konva.Circle({
      x: 0,
      y: 0,
      radius: 5,
      fill: 'red',
      draggable: true,
    });
    this.layer.add(this.pin);
    this.pin.on('click', () => {
      // Open a text box to enter notes
      const notesInput = document.createElement('input');
      notesInput.type = 'text';
      notesInput.placeholder = 'Enter notes';
      document.body.appendChild(notesInput);
    });
  }

  placePin(x, y) {
    this.pin.position({ x, y });
    this.layer.batchDraw();
  }
}
