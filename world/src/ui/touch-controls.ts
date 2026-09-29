import type { ControlAction } from '../core/controls';
import type { Input } from '../core/input';

/** Phones and tablets: a coarse pointer (a finger) and no fine one, or a touch screen on a mobile browser. */
export function isTouchDevice(): boolean {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const mobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  return coarse || (mobile && touch);
}

export interface TouchHooks {
  /** Raise or lower the scope. */
  toggleScope(): void;
  /** Open the pause menu. */
  pause(): void;
}

/** Keeps a finger's moves coming to the control it started on, even after it slides off (best effort). */
function capture(element: HTMLElement, pointer: number): void {
  try { element.setPointerCapture(pointer); } catch { /* the pointer already ended */ }
}

/** How far (px) the stick can be pushed, and how much drag (px) turns like one pixel of mouse movement. */
const STICK_RADIUS = 56;
const LOOK_GAIN = 1.5;

/**
 * On-screen controls for touch screens: a movement stick on the left (push it all the way forward to sprint),
 * drag anywhere else to look, and buttons for fire, scope, reload, use, jump, crouch, crawl, weapon, and zoom.
 * Everything drives the same actions as the keyboard, so the game treats touch exactly like keys.
 */
export class TouchControls {
  private stickPointer: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private readonly lookPointers = new Map<number, { x: number; y: number }>();

  constructor(private readonly root: HTMLElement, private readonly input: Input, private readonly hooks: TouchHooks) {
    root.hidden = false;
    document.body.classList.add('touch');
    this.bindStick(root.querySelector<HTMLElement>('#touch-stick')!, root.querySelector<HTMLElement>('#touch-knob')!);
    this.bindLook(root.querySelector<HTMLElement>('#touch-look')!);
    for (const button of root.querySelectorAll<HTMLElement>('[data-action]')) this.bindButton(button);
  }

  private bindStick(base: HTMLElement, knob: HTMLElement): void {
    const move = (event: PointerEvent): void => {
      const dx = event.clientX - this.stickOrigin.x; const dy = event.clientY - this.stickOrigin.y;
      const length = Math.hypot(dx, dy);
      const scale = length > STICK_RADIUS ? STICK_RADIUS / length : 1;
      knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
      const forward = -dy * scale / STICK_RADIUS; const strafe = dx * scale / STICK_RADIUS;
      // A small dead zone so a resting thumb does not creep.
      this.input.analog.forward = Math.abs(forward) < 0.12 ? 0 : forward;
      this.input.analog.strafe = Math.abs(strafe) < 0.12 ? 0 : strafe;
      this.input.setVirtual('run', forward > 0.92);
      base.classList.toggle('sprint', forward > 0.92);
    };
    const release = (event: PointerEvent): void => {
      if (event.pointerId !== this.stickPointer) return;
      this.stickPointer = null;
      knob.style.transform = '';
      base.classList.remove('active', 'sprint');
      this.input.analog.forward = 0; this.input.analog.strafe = 0;
      this.input.setVirtual('run', false);
    };
    base.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (this.stickPointer !== null) return;
      this.stickPointer = event.pointerId;
      capture(base, event.pointerId);
      const rect = base.getBoundingClientRect();
      this.stickOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      base.classList.add('active');
      move(event);
    });
    base.addEventListener('pointermove', (event) => { if (event.pointerId === this.stickPointer) move(event); });
    base.addEventListener('pointerup', release);
    base.addEventListener('pointercancel', release);
  }

  private bindLook(area: HTMLElement): void {
    area.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      capture(area, event.pointerId);
      this.lookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    });
    area.addEventListener('pointermove', (event) => {
      const last = this.lookPointers.get(event.pointerId);
      if (last === undefined) return;
      this.input.addLook((event.clientX - last.x) * LOOK_GAIN, (event.clientY - last.y) * LOOK_GAIN);
      this.lookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    });
    const end = (event: PointerEvent): void => { this.lookPointers.delete(event.pointerId); };
    area.addEventListener('pointerup', end);
    area.addEventListener('pointercancel', end);
  }

  /**
   * `data-action` names a control action: held buttons (fire, use) hold it while pressed and also tap it, so both
   * the automatic carbine and the one-shot rifle fire; the rest just tap. `scope` and `pause` call the hooks.
   * Dragging from a button also turns the view, so the thumb on FIRE can keep aiming.
   */
  private bindButton(button: HTMLElement): void {
    const action = button.dataset.action!;
    const hold = button.dataset.hold === 'true';
    let pointer: number | null = null;
    let last = { x: 0, y: 0 };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      pointer = event.pointerId;
      last = { x: event.clientX, y: event.clientY };
      capture(button, event.pointerId);
      button.classList.add('pressed');
      if (action === 'scope') this.hooks.toggleScope();
      else if (action === 'pause') this.hooks.pause();
      else {
        this.input.tapVirtual(action as ControlAction);
        if (hold) this.input.setVirtual(action as ControlAction, true);
      }
      navigator.vibrate?.(8);
    });
    button.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointer || action !== 'fire') return;
      this.input.addLook((event.clientX - last.x) * LOOK_GAIN, (event.clientY - last.y) * LOOK_GAIN);
      last = { x: event.clientX, y: event.clientY };
    });
    const up = (event: PointerEvent): void => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      button.classList.remove('pressed');
      if (hold) this.input.setVirtual(action as ControlAction, false);
    };
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
  }

  /** Lets go of everything (on pause or when the page loses focus). */
  reset(): void {
    this.input.releaseVirtual();
    this.stickPointer = null;
    this.lookPointers.clear();
    for (const element of this.root.querySelectorAll('.pressed, .active, .sprint')) element.classList.remove('pressed', 'active', 'sprint');
    const knob = this.root.querySelector<HTMLElement>('#touch-knob');
    if (knob !== null) knob.style.transform = '';
  }
}
