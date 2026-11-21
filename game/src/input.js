// Ember Veil — keyboard and mouse.
// One job: turn key presses and clicks into one plain input state the
// player reads each frame. WASD or arrows to move, Shift to sneak,
// Q or mouse click to throw a pebble, P or Esc to pause, R to restart.

export class Input {
  constructor(canvas) {
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.sneak = false;
    this.throwPebble = false;
    this.pausePressed = false;
    this.restartPressed = false;
    this.anyKey = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this._keys = new Set();
    this._canvas = canvas;
    this._onKeyDown = (e) => this.keyDown(e);
    this._onKeyUp = (e) => this.keyUp(e);
    this._onMouseMove = (e) => this.mouseMove(e);
    this._onMouseDown = (e) => this.mouseDownFn(e);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
  }

  keyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    this._keys.add(e.key.toLowerCase());
    this.anyKey = true;
    this.syncKeys();
    if (e.key === 'q' || e.key === 'Q') this.throwPebble = true;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') this.pausePressed = true;
    if (e.key === 'r' || e.key === 'R') this.restartPressed = true;
  }

  keyUp(e) {
    this._keys.delete(e.key.toLowerCase());
    this.syncKeys();
  }

  syncKeys() {
    const k = this._keys;
    this.up = k.has('w') || k.has('arrowup');
    this.down = k.has('s') || k.has('arrowdown');
    this.left = k.has('a') || k.has('arrowleft');
    this.right = k.has('d') || k.has('arrowright');
    this.sneak = k.has('shift');
  }

  mouseMove(e) {
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = this._canvas.width / rect.width;
    const scaleY = this._canvas.height / rect.height;
    this.mouseX = (e.clientX - rect.left) * scaleX;
    this.mouseY = (e.clientY - rect.top) * scaleY;
  }

  mouseDownFn(e) {
    this.mouseMove(e);
    this.mouseDown = true;
    this.throwPebble = true;
    this.anyKey = true;
  }

  // One-shot flags are eaten by the game loop each frame. throwPebble
  // is NOT cleared here: the player eats it when the pebble is thrown,
  // so a click during the cooldown queues one throw instead of losing it.
  consume() {
    const out = {
      pausePressed: this.pausePressed,
      restartPressed: this.restartPressed,
      anyKey: this.anyKey,
    };
    this.pausePressed = false;
    this.restartPressed = false;
    this.anyKey = false;
    return out;
  }
}
