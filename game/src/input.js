// Sky Courier — Valley Run: keyboard and mouse input.
// One job: turn keys and pointer drags into one clean input state the
// flight model reads every frame. Nothing here knows about the game.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered, consumed by the game
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this.throttleDrag = false;
    this.onFirstGesture = null;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    canvas.addEventListener('pointerdown', (e) => {
      const p = this.toCanvas(e);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.down = true;
      this.mouse.clicked = true;
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('pointermove', (e) => {
      const p = this.toCanvas(e);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
    });
    window.addEventListener('pointerup', () => {
      this.mouse.down = false;
      this.throttleDrag = false;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
      this.throttleDrag = false;
    });
  }

  toCanvas(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * this.canvas.width,
      y: ((e.clientY - r.top) / r.height) * this.canvas.height,
    };
  }

  held(...names) {
    return names.some((n) => this.keys.has(n));
  }

  // True once, on the frame the key went down.
  wasPressed(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
