/**
 * Keyboard bindings. Every action has a right-hand key around the arrow cluster (arrows move and turn,
 * Ctrl fires, like the classic maze game) and the familiar WASD/mouse layout keeps working alongside it.
 */
export const CONTROLS = {
  forward: ['ArrowUp', 'KeyW'],
  back: ['ArrowDown', 'KeyS'],
  turnLeft: ['ArrowLeft'],
  turnRight: ['ArrowRight'],
  strafeLeft: ['Home', 'KeyA'],
  strafeRight: ['End', 'KeyD'],
  lookUp: ['PageUp', 'Insert'],
  lookDown: ['PageDown', 'Delete'],
  fire: ['ControlRight', 'ControlLeft'],
  /** Right Shift tapped on its own toggles the scope; held while moving it sprints (see `run`). */
  scope: ['ShiftRight'],
  zoom: ['Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract'],
  interact: ['Enter', 'NumpadEnter', 'KeyE'],
  reload: ['Backspace', 'KeyR'],
  run: ['ShiftLeft', 'ShiftRight'],
  /** Weapons: 1 sniper rifle, 2 robot carbine, Q switches between them. */
  weapon1: ['Digit1', 'Numpad1'],
  weapon2: ['Digit2', 'Numpad2'],
  switchWeapon: ['KeyQ'],
  jump: ['Space'],
  crouch: ['KeyC'],
  prone: ['KeyZ'],
} as const satisfies Record<string, readonly string[]>;

export type ControlAction = keyof typeof CONTROLS;

/** Keys whose default browser behaviour (scrolling, navigation) must not fire while playing. */
export const CAPTURED_KEYS: ReadonlySet<string> = new Set(Object.values(CONTROLS).flat());

/** Turning speed for the arrow keys, in radians per second. */
export const KEYBOARD_TURN_SPEED = 2.1;
export const KEYBOARD_LOOK_SPEED = 1.3;
