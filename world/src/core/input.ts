/** Keyboard + mouse state with pointer lock for first-person look. */
export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private mouseDx = 0;
  private mouseDy = 0;
  private buttons = 0;
  private clicked = 0;
  wheel = 0;

  constructor(private readonly element: HTMLElement) {
    addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.down.add(event.code);
      this.pressed.add(event.code);
      if (['Space', 'Tab', 'ControlLeft', 'KeyC', 'KeyZ'].includes(event.code) && this.locked) event.preventDefault();
    });
    addEventListener('keyup', (event) => this.down.delete(event.code));
    addEventListener('blur', () => { this.down.clear(); this.buttons = 0; });
    addEventListener('mousemove', (event) => {
      if (!this.locked) return;
      this.mouseDx += event.movementX;
      this.mouseDy += event.movementY;
    });
    element.addEventListener('mousedown', (event) => {
      this.buttons |= 1 << event.button;
      this.clicked |= 1 << event.button;
    });
    addEventListener('mouseup', (event) => { this.buttons &= ~(1 << event.button); });
    addEventListener('wheel', (event) => { this.wheel += Math.sign(event.deltaY); }, { passive: true });
    element.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  get locked(): boolean { return document.pointerLockElement === this.element; }

  lock(): void {
    if (!this.locked) void this.element.requestPointerLock();
  }

  isDown(code: string): boolean { return this.down.has(code); }

  wasPressed(code: string): boolean { return this.pressed.has(code); }

  mouseDown(button: number): boolean { return (this.buttons & (1 << button)) !== 0; }

  mouseClicked(button: number): boolean { return (this.clicked & (1 << button)) !== 0; }

  consumeLook(): { readonly dx: number; readonly dy: number } {
    const look = { dx: this.mouseDx, dy: this.mouseDy };
    this.mouseDx = 0;
    this.mouseDy = 0;
    return look;
  }

  /** Clears one-frame edge state; call at the end of every frame. */
  endFrame(): void {
    this.pressed.clear();
    this.clicked = 0;
    this.wheel = 0;
  }
}
