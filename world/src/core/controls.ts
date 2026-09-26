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
  scope: ['ShiftRight'],
  zoom: ['Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract'],
  interact: ['Enter', 'NumpadEnter', 'KeyE'],
  reload: ['Backspace', 'KeyR'],
  run: ['ShiftLeft'],
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
