// Keyboard + mouse state. `pressed` is an edge set: a key lands there for
// exactly one frame, which is what semi-automatic fire and one-shot actions
// (enter car, cycle radio) read, so a fast tap can never fall between frames.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseDown = false;
    this.mousePressed = false;
    this.yaw = 0; this.pitch = 0.22;
    addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('mousedown', (e) => { if (e.button === 0) { this.mouseDown = true; this.mousePressed = true; } });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        this.yaw -= e.movementX * 0.0026;
        this.pitch = Math.max(-0.1, Math.min(1.0, this.pitch + e.movementY * 0.0022));
      }
    });
    addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });
  }
  down(code) { return this.keys.has(code); }
  wasPressed(code) { return this.pressed.has(code); }
  // Drop every pending edge + held state. Called when a run starts so the
  // click on the NEW GAME button is never read as a gunshot or a carjack.
  clearAll() { this.keys.clear(); this.pressed.clear(); this.mouseDown = false; this.mousePressed = false; }
  endFrame() { this.pressed.clear(); this.mousePressed = false; }
}
