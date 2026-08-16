export interface GamepadButtonLike {
  readonly pressed: boolean;
  readonly value: number;
}

export interface GamepadLike {
  readonly connected: boolean;
  readonly axes: ArrayLike<number>;
  readonly buttons: ArrayLike<GamepadButtonLike>;
}

export interface GamepadProjection {
  readonly connected: boolean;
  readonly forward: number;
  readonly strafe: number;
  readonly yawDelta: number;
  readonly pitchDelta: number;
  readonly sprint: boolean;
  readonly fire: boolean;
  readonly altFire: boolean;
  readonly cycleWeapon: boolean;
  readonly campaign: boolean;
  readonly shop: boolean;
}

const EMPTY_PROJECTION: GamepadProjection = Object.freeze({
  connected: false, forward: 0, strafe: 0, yawDelta: 0, pitchDelta: 0,
  sprint: false, fire: false, altFire: false, cycleWeapon: false, campaign: false, shop: false,
});

function axis(gamepad: GamepadLike, index: number, deadZone = 0.18): number {
  const value = Number(gamepad.axes[index] ?? 0);
  if (!Number.isFinite(value)) return 0;
  const magnitude = Math.min(1, Math.abs(value));
  if (magnitude <= deadZone) return 0;
  return Math.sign(value) * (magnitude - deadZone) / (1 - deadZone);
}

function button(gamepad: GamepadLike, index: number, threshold = 0.35): boolean {
  const candidate = gamepad.buttons[index];
  return candidate !== undefined && (candidate.pressed || candidate.value >= threshold);
}

export function projectStandardGamepad(gamepad: GamepadLike | null | undefined): GamepadProjection {
  if (gamepad === null || gamepad === undefined || !gamepad.connected) return EMPTY_PROJECTION;
  const forwardAxis = axis(gamepad, 1);
  const pitchAxis = axis(gamepad, 3);
  return {
    connected: true,
    forward: forwardAxis === 0 ? 0 : -forwardAxis,
    strafe: axis(gamepad, 0),
    yawDelta: axis(gamepad, 2) * 0.065,
    pitchDelta: pitchAxis === 0 ? 0 : pitchAxis * -0.05,
    sprint: button(gamepad, 10),
    fire: button(gamepad, 7) || button(gamepad, 0),
    altFire: button(gamepad, 6) || button(gamepad, 2),
    cycleWeapon: button(gamepad, 5) || button(gamepad, 15),
    campaign: button(gamepad, 9),
    shop: button(gamepad, 8),
  };
}
