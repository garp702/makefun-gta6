// InputSystem: keyboard and mouse state with pressed-edge detection.
// The game polls `down(code)` for held keys and `pressed(code)` for single-frame taps.
// Edges are cleared at the end of every frame by the game loop, and `clearEdges()` is
// called when a run starts so the click on the New Game button is never read as a shot.

export class InputSystem {
  constructor(canvas) {
    this.keys = new Set();
    this.edges = new Set();
    this.mouseDown = false;
    this.mouseEdge = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.movementX = 0;

    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.edges.add(e.code);
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouseDown = true; this.mouseEdge = true; }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.movementX += e.movementX || 0;
    });
  }

  down(code) { return this.keys.has(code); }
  pressed(code) { return this.edges.has(code); }

  // WASD + arrows as one axis pair: x = right(+)/left(-), z = forward(+)/back(-).
  axis() {
    const x = (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0) - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0);
    const z = (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0) - (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0);
    return { x, z };
  }

  clearEdges() {
    this.edges.clear();
    this.mouseEdge = false;
    this.movementX = 0;
  }

  endFrame() {
    this.edges.clear();
    this.mouseEdge = false;
    this.movementX = 0;
  }
}
