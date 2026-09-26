// Hard-surface part builders for the armored Davel mechs and the first-person weapon view model.
// Everything here is pure geometry: parts are emitted into a sink, so the logic is testable without WebGL.

export type Color = readonly [number, number, number];
export interface Vec3 { readonly x: number; readonly y: number; readonly z: number }

export const PART_MATERIAL = { paint: 0, armor: 1, rubber: 2, chrome: 3, glass: 4 } as const;
export type PartMaterial = typeof PART_MATERIAL[keyof typeof PART_MATERIAL];

export interface PartSink {
  /** Pass `matrix` to place a unit sphere with an arbitrary oriented ellipsoid transform. */
  sphere(center: Vec3, radius: number, color: Color, yScale?: number, zScale?: number, emission?: number,
    material?: PartMaterial, matrix?: readonly number[]): void;
  capsule(start: Vec3, end: Vec3, radius: number, color: Color, emission?: number, material?: PartMaterial): void;
  box(matrix: readonly number[], color: Color, emission?: number, material?: PartMaterial): void;
}

export const vec = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const add = (a: Vec3, b: Vec3): Vec3 => vec(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Vec3, b: Vec3): Vec3 => vec(a.x - b.x, a.y - b.y, a.z - b.z);
export const mul = (a: Vec3, s: number): Vec3 => vec(a.x * s, a.y * s, a.z * s);
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => vec(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, mul(sub(b, a), t));

export function normalize(a: Vec3, fallback: Vec3 = vec(0, 1, 0)): Vec3 {
  const length = Math.hypot(a.x, a.y, a.z);
  return length > 1e-6 ? mul(a, 1 / length) : fallback;
}

/** Offsets a point along a basis: right, up, forward. */
export function along(origin: Vec3, basis: Basis, right: number, up: number, forward: number): Vec3 {
  return add(add(add(origin, mul(basis.right, right)), mul(basis.up, up)), mul(basis.forward, forward));
}

export interface Basis { readonly right: Vec3; readonly up: Vec3; readonly forward: Vec3 }

/** Builds an orthonormal right/up/forward basis from an up direction and a forward hint. */
export function basisFromUp(up: Vec3, forwardHint: Vec3): Basis {
  const u = normalize(up);
  let f = sub(forwardHint, mul(u, dot(forwardHint, u)));
  f = normalize(f, Math.abs(u.y) < 0.9 ? normalize(cross(vec(0, 1, 0), u)) : vec(0, 0, 1));
  const r = normalize(cross(u, f), vec(1, 0, 0));
  return { right: r, up: u, forward: f };
}

/** Column-major model matrix whose columns are right-handed so mesh winding is preserved. */
export function boxMatrix(center: Vec3, basis: Basis, sizeX: number, sizeY: number, sizeZ: number): number[] {
  const z = cross(basis.right, basis.up);
  return [
    basis.right.x * sizeX, basis.right.y * sizeX, basis.right.z * sizeX, 0,
    basis.up.x * sizeY, basis.up.y * sizeY, basis.up.z * sizeY, 0,
    z.x * sizeZ, z.y * sizeZ, z.z * sizeZ, 0,
    center.x, center.y, center.z, 1,
  ];
}

/** A box stretched between two points (its local Y axis), with a side hint for its local X axis. */
export function segmentBoxMatrix(
  start: Vec3, end: Vec3, width: number, depth: number, sideHint: Vec3, lengthScale = 1, offset = 0.5,
): number[] {
  const direction = sub(end, start);
  const length = Math.max(0.001, Math.hypot(direction.x, direction.y, direction.z));
  const y = mul(direction, 1 / length);
  const side = normalize(sub(sideHint, mul(y, dot(sideHint, y))), normalize(cross(y, vec(0, 0, 1)), vec(1, 0, 0)));
  const basis: Basis = { right: side, up: y, forward: cross(side, y) };
  return boxMatrix(lerp(start, end, offset), basis, width, length * lengthScale, depth);
}

function rotateAbout(vector: Vec3, axis: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return add(add(mul(vector, cosine), mul(cross(axis, vector), sine)), mul(axis, dot(axis, vector) * (1 - cosine)));
}

export function rotateBasis(basis: Basis, axis: Vec3, angle: number): Basis {
  return {
    right: rotateAbout(basis.right, axis, angle),
    up: rotateAbout(basis.up, axis, angle),
    forward: rotateAbout(basis.forward, axis, angle),
  };
}

function desaturate(color: Color, amount: number, darken = 1): Color {
  const luminance = color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
  return [
    (color[0] + (luminance - color[0]) * amount) * darken,
    (color[1] + (luminance - color[1]) * amount) * darken,
    (color[2] + (luminance - color[2]) * amount) * darken,
  ];
}

const GUNMETAL: Color = [0.11, 0.115, 0.13];
const RUBBER: Color = [0.05, 0.052, 0.058];
const STEEL: Color = [0.62, 0.64, 0.68];
const VISOR: Color = [0.03, 0.04, 0.06];

export interface MechPose {
  readonly hip: Vec3;
  readonly chest: Vec3;
  readonly head: Vec3;
  readonly leftElbow: Vec3;
  readonly rightElbow: Vec3;
  readonly leftHand: Vec3;
  readonly rightHand: Vec3;
  readonly leftKnee: Vec3;
  readonly rightKnee: Vec3;
  readonly leftFoot: Vec3;
  readonly rightFoot: Vec3;
}

export interface MechLook {
  readonly heading: number;
  readonly scale: number;
  readonly torsoWidth: number;
  readonly headScale: number;
  readonly bodyColor: Color;
  readonly accentColor: Color;
  readonly eyeColor: Color;
  readonly eyeOpen: number;
  readonly browPressure: number;
  readonly mouthOpen: number;
  readonly pupilOffset: number;
  readonly telegraph: boolean;
  readonly fineDetail: boolean;
}

export interface MechHead {
  /** Equivalent sphere radius used by legacy accessory placement. */
  readonly headRadius: number;
  readonly opticLeft: Vec3;
  readonly opticRight: Vec3;
  readonly shoulderLeft: Vec3;
  readonly shoulderRight: Vec3;
}

/**
 * Emits an armored, weathered bipedal mech driven by the authoritative XPBD pose points. Painted armor plates
 * wrap rubber joints and chrome pistons; the head is a helmet with a glass visor, glowing optics, brow plates
 * that follow the expression, and a jaw that drops for telegraphed attacks.
 */
export function buildArmoredMech(sink: PartSink, pose: MechPose, look: MechLook): MechHead {
  const s = look.scale;
  const w = look.torsoWidth;
  const facing = vec(Math.sin(look.heading), 0, Math.cos(look.heading));
  const torso = basisFromUp(sub(pose.chest, pose.hip), facing);
  const body = desaturate(look.bodyColor, 0.42, 0.78);
  const accent = desaturate(look.accentColor, 0.5, 0.72);
  const armor = PART_MATERIAL.armor;
  const detail = look.fineDetail;

  // Pelvis and waist.
  sink.box(boxMatrix(along(pose.hip, torso, 0, 0.02 * s, 0), torso, 0.52 * w * s, 0.2 * s, 0.34 * s), accent, 0, armor);
  sink.box(boxMatrix(along(pose.hip, torso, 0, -0.06 * s, 0.14 * s), torso, 0.2 * w * s, 0.16 * s, 0.1 * s), GUNMETAL, 0, armor);
  const waistTop = along(pose.chest, torso, 0, -0.26 * s, 0);
  for (let ring = 0; ring < 3; ring += 1) {
    const center = lerp(along(pose.hip, torso, 0, 0.12 * s, 0), waistTop, (ring + 0.5) / 3);
    sink.box(boxMatrix(center, torso, (0.4 - ring * 0.02) * w * s, 0.075 * s, 0.28 * s), RUBBER, 0, PART_MATERIAL.rubber);
  }
  if (detail) {
    for (const side of [-1, 1] as const) {
      sink.capsule(along(pose.hip, torso, side * 0.18 * w * s, 0.08 * s, -0.02 * s),
        along(pose.chest, torso, side * 0.2 * w * s, -0.2 * s, -0.04 * s), 0.022 * s, STEEL, 0, PART_MATERIAL.chrome);
    }
  }

  // Chest, chest plate, reactor, collar, and power pack.
  sink.box(boxMatrix(along(pose.chest, torso, 0, 0.02 * s, 0), torso, 0.76 * w * s, 0.5 * s, 0.44 * s), body, 0, armor);
  sink.box(boxMatrix(along(pose.chest, torso, 0, 0.06 * s, 0.2 * s), torso, 0.5 * w * s, 0.3 * s, 0.1 * s), accent, 0, armor);
  const reactor = along(pose.chest, torso, 0, -0.12 * s, 0.25 * s);
  sink.sphere(reactor, 0.075 * s, STEEL, 1, 0.45, 0, PART_MATERIAL.chrome);
  sink.sphere(along(reactor, torso, 0, 0, 0.018 * s), 0.05 * s, look.eyeColor, 1, 0.5, 0.95);
  sink.box(boxMatrix(along(pose.chest, torso, 0, 0.29 * s, -0.02 * s), torso, 0.44 * w * s, 0.08 * s, 0.32 * s), RUBBER, 0, PART_MATERIAL.rubber);
  sink.box(boxMatrix(along(pose.chest, torso, 0, 0.04 * s, -0.3 * s), torso, 0.54 * w * s, 0.46 * s, 0.18 * s), GUNMETAL, 0, armor);
  if (detail) {
    for (const side of [-1, 1] as const) {
      const exhaustBase = along(pose.chest, torso, side * 0.14 * w * s, 0.26 * s, -0.34 * s);
      const exhaustTip = along(exhaustBase, torso, 0, 0.12 * s, -0.04 * s);
      sink.capsule(exhaustBase, exhaustTip, 0.035 * s, STEEL, 0, PART_MATERIAL.chrome);
      sink.sphere(exhaustTip, 0.026 * s, look.accentColor, 1, 1, 0.8);
    }
  }

  // Shoulders and arms.
  const shoulderLeft = along(pose.chest, torso, -0.42 * w * s, 0.14 * s, 0);
  const shoulderRight = along(pose.chest, torso, 0.42 * w * s, 0.14 * s, 0);
  const arms = [
    [shoulderLeft, pose.leftElbow, pose.leftHand, -1],
    [shoulderRight, pose.rightElbow, pose.rightHand, 1],
  ] as const;
  for (const [shoulder, elbow, hand, side] of arms) {
    sink.sphere(shoulder, 0.1 * s, RUBBER, 1, 1, 0, PART_MATERIAL.rubber);
    sink.box(boxMatrix(along(shoulder, torso, side * 0.05 * s, 0.07 * s, 0), torso, 0.28 * s, 0.17 * s, 0.32 * s), body, 0, armor);
    sink.capsule(shoulder, elbow, 0.055 * s, RUBBER, 0, PART_MATERIAL.rubber);
    sink.box(segmentBoxMatrix(shoulder, elbow, 0.15 * s, 0.15 * s, torso.forward, 0.72, 0.52), body, 0, armor);
    sink.sphere(elbow, 0.075 * s, RUBBER, 1, 1, 0, PART_MATERIAL.rubber);
    sink.sphere(along(elbow, torso, side * 0.06 * s, 0, 0), 0.04 * s, STEEL, 1, 1, 0, PART_MATERIAL.chrome);
    sink.capsule(elbow, hand, 0.05 * s, RUBBER, 0, PART_MATERIAL.rubber);
    sink.box(segmentBoxMatrix(elbow, hand, 0.17 * s, 0.17 * s, torso.forward, 0.7, 0.55), accent, 0, armor);
    const forearm = normalize(sub(hand, elbow));
    const handBasis = basisFromUp(forearm, torso.forward);
    sink.box(boxMatrix(along(hand, handBasis, 0, 0.03 * s, 0), handBasis, 0.13 * s, 0.12 * s, 0.07 * s), GUNMETAL, 0, armor);
    if (detail) {
      sink.capsule(along(elbow, handBasis, 0, 0.02 * s, -0.08 * s), along(hand, handBasis, 0, -0.08 * s, -0.07 * s),
        0.018 * s, STEEL, 0, PART_MATERIAL.chrome);
      for (const finger of [-1, 0, 1] as const) {
        const knuckle = along(hand, handBasis, finger * 0.042 * s, 0.09 * s, 0.01 * s);
        sink.capsule(knuckle, along(knuckle, handBasis, 0, 0.08 * s, 0.025 * s), 0.022 * s, GUNMETAL, 0, PART_MATERIAL.armor);
      }
      const thumb = along(hand, handBasis, -side * 0.07 * s, 0.03 * s, 0.03 * s);
      sink.capsule(thumb, along(thumb, handBasis, -side * 0.03 * s, 0.05 * s, 0.03 * s), 0.022 * s, GUNMETAL, 0, PART_MATERIAL.armor);
    }
  }

  // Legs and boots.
  const legs = [
    [along(pose.hip, torso, -0.2 * s, -0.04 * s, 0), pose.leftKnee, pose.leftFoot],
    [along(pose.hip, torso, 0.2 * s, -0.04 * s, 0), pose.rightKnee, pose.rightFoot],
  ] as const;
  const ground = basisFromUp(vec(0, 1, 0), facing);
  for (const [hipJoint, knee, foot] of legs) {
    sink.sphere(hipJoint, 0.1 * s, RUBBER, 1, 1, 0, PART_MATERIAL.rubber);
    sink.capsule(hipJoint, knee, 0.065 * s, RUBBER, 0, PART_MATERIAL.rubber);
    sink.box(segmentBoxMatrix(hipJoint, knee, 0.21 * s, 0.23 * s, torso.right, 0.78, 0.5), body, 0, armor);
    sink.sphere(knee, 0.085 * s, RUBBER, 1, 1, 0, PART_MATERIAL.rubber);
    const shin = normalize(sub(foot, knee));
    const shinBasis = basisFromUp(mul(shin, -1), facing);
    sink.box(boxMatrix(along(knee, shinBasis, 0, 0.01 * s, 0.09 * s), shinBasis, 0.15 * s, 0.17 * s, 0.07 * s), accent, 0, armor);
    sink.capsule(knee, foot, 0.055 * s, RUBBER, 0, PART_MATERIAL.rubber);
    sink.box(segmentBoxMatrix(knee, foot, 0.18 * s, 0.2 * s, torso.right, 0.74, 0.46), accent, 0, armor);
    if (detail) {
      sink.capsule(along(knee, shinBasis, 0, -0.06 * s, -0.09 * s), along(foot, shinBasis, 0, 0.14 * s, -0.08 * s),
        0.022 * s, STEEL, 0, PART_MATERIAL.chrome);
    }
    const heel = vec(foot.x, Math.max(0.055 * s, foot.y - 0.02 * s), foot.z);
    sink.box(boxMatrix(along(heel, ground, 0, 0, 0.06 * s), ground, 0.2 * s, 0.11 * s, 0.38 * s), GUNMETAL, 0, armor);
    sink.box(boxMatrix(along(heel, ground, 0, 0.03 * s, 0.2 * s), ground, 0.18 * s, 0.08 * s, 0.12 * s), accent, 0, armor);
  }

  // Neck and helmet.
  const headRadius = 0.37 * look.headScale * s;
  const head = basisFromUp(lerp(vec(0, 1, 0), normalize(sub(pose.head, pose.chest)), 0.5), facing);
  const neckBase = along(pose.chest, torso, 0, 0.3 * s, 0);
  const neckTop = along(pose.head, head, 0, -headRadius * 0.55, -headRadius * 0.05);
  sink.capsule(neckBase, neckTop, 0.06 * s, STEEL, 0, PART_MATERIAL.chrome);
  if (detail) {
    for (const side of [-1, 1] as const) {
      sink.capsule(along(neckBase, torso, side * 0.1 * s, 0, -0.04 * s),
        along(neckTop, head, side * 0.08 * s, 0, -0.03 * s), 0.024 * s, RUBBER, 0, PART_MATERIAL.rubber);
    }
  }
  const helmet = boxMatrix(pose.head, head, headRadius * 0.78, headRadius * 0.7, headRadius * 0.76);
  sink.sphere(pose.head, 1, body, 1, 1, 0, PART_MATERIAL.paint, helmet);
  sink.box(boxMatrix(along(pose.head, head, 0, headRadius * 0.3, headRadius * 0.42), head,
    headRadius * 1.2, headRadius * 0.2, headRadius * 0.6), body, 0, armor);
  if (detail) {
    sink.box(boxMatrix(along(pose.head, head, 0, headRadius * 0.66, -headRadius * 0.1), head,
      headRadius * 0.18, headRadius * 0.14, headRadius * 1.1), accent, 0, armor);
  }
  for (const side of [-1, 1] as const) {
    sink.box(boxMatrix(along(pose.head, head, side * headRadius * 0.74, -headRadius * 0.05, -headRadius * 0.05), head,
      headRadius * 0.2, headRadius * 0.55, headRadius * 0.55), GUNMETAL, 0, armor);
  }
  const eyeOpen = Math.max(0.12, Math.min(1.4, look.eyeOpen));
  const visorCenter = along(pose.head, head, 0, headRadius * 0.08, headRadius * 0.62);
  sink.box(boxMatrix(visorCenter, head, headRadius * 1.22, headRadius * 0.36, headRadius * 0.26), VISOR, 0, PART_MATERIAL.glass);
  const opticY = headRadius * (0.1 + look.pupilOffset * 0.25);
  const opticLeft = along(pose.head, head, -headRadius * 0.3, opticY, headRadius * 0.76);
  const opticRight = along(pose.head, head, headRadius * 0.3, opticY, headRadius * 0.76);
  for (const optic of [opticLeft, opticRight]) {
    sink.sphere(optic, headRadius * 0.12, look.eyeColor, eyeOpen, 0.35, 1);
  }
  for (const side of [-1, 1] as const) {
    const browBasis = rotateBasis(head, head.forward, side * (0.12 + look.browPressure * 1.4));
    sink.box(boxMatrix(along(pose.head, head, side * headRadius * 0.32, headRadius * 0.3, headRadius * 0.72), browBasis,
      headRadius * 0.56, headRadius * 0.1, headRadius * 0.24), GUNMETAL, 0, armor);
  }
  const jawDrop = Math.max(0, Math.min(0.5, look.mouthOpen)) * headRadius * 0.45;
  const jaw = along(pose.head, head, 0, -headRadius * 0.4 - jawDrop, headRadius * 0.42);
  sink.box(boxMatrix(jaw, head, headRadius * 0.8, headRadius * 0.3, headRadius * 0.5), GUNMETAL, 0, armor);
  const grilleColor: Color = look.telegraph ? [1, 0.2, 0.08] : [0.02, 0.02, 0.025];
  for (let slot = -1; slot <= 1; slot += 1) {
    sink.box(boxMatrix(along(jaw, head, 0, slot * headRadius * 0.075, headRadius * 0.26), head,
      headRadius * 0.6, headRadius * 0.03, headRadius * 0.02), grilleColor, look.telegraph ? 0.9 : 0, PART_MATERIAL.rubber);
  }
  return { headRadius, opticLeft, opticRight, shoulderLeft, shoulderRight };
}

export type ViewmodelWeapon = 'pulse' | 'sword' | 'bomb' | 'laser';

export interface ViewmodelFrame {
  readonly eye: Vec3;
  readonly yaw: number;
  readonly pitch: number;
  readonly tick: number;
  readonly bobPhase: number;
  readonly weapon: ViewmodelWeapon;
  readonly bombs: number;
  readonly laserActive: boolean;
  readonly laserHeat: number;
  readonly swordHeat: number;
  readonly lastPulseTick: number;
  readonly lastSwordTick: number;
  readonly lastSwordCharged: boolean;
  readonly motionScale: number;
  readonly flashScale: number;
}

export function cameraBasis(yaw: number, pitch: number): Basis {
  const cosPitch = Math.cos(pitch);
  const forward = vec(Math.sin(yaw) * cosPitch, Math.sin(pitch), -Math.cos(yaw) * cosPitch);
  const right = vec(Math.cos(yaw), 0, Math.sin(yaw));
  return { right, up: cross(right, forward), forward };
}

const SUIT: Color = [0.1, 0.13, 0.15];
const GLOVE: Color = [0.07, 0.075, 0.08];
const POLYMER: Color = [0.15, 0.155, 0.15];
const RECEIVER: Color = [0.13, 0.135, 0.14];

/** Recoil strength (0..1) for a shot fired `ticksSince` ticks ago. */
export function recoilKick(ticksSince: number): number {
  if (!Number.isFinite(ticksSince) || ticksSince < 0 || ticksSince > 9) return 0;
  return Math.exp(-ticksSince * 0.42);
}

/**
 * Emits the first-person weapon and gloved hands in world space, just in front of the camera. The weapon sways
 * with the authoritative walk phase, kicks back after shots, and glows where its energy systems run hot.
 */
export function buildViewmodel(sink: PartSink, frame: ViewmodelFrame): void {
  const motion = Math.max(0, Math.min(1, frame.motionScale));
  const camera = cameraBasis(frame.yaw, frame.pitch);
  const kick = recoilKick(frame.tick - frame.lastPulseTick) * motion;
  const laserJitter = frame.laserActive ? Math.sin(frame.tick * 2.3) * 0.0015 * motion : 0;
  const swayX = Math.sin(frame.bobPhase) * 0.011 * motion;
  const swayY = -Math.abs(Math.cos(frame.bobPhase)) * 0.009 * motion + Math.sin(frame.tick * 0.032) * 0.0025 * motion;
  let gun = rotateBasis(camera, camera.up, 0.07);
  gun = rotateBasis(gun, gun.right, 0.035 + 0.07 * kick);
  gun = rotateBasis(gun, gun.forward, Math.sin(frame.bobPhase) * 0.02 * motion);
  const pivot = along(frame.eye, camera, 0.115 + swayX + laserJitter, -0.14 + swayY, 0.42 - kick * 0.045);
  const at = (right: number, up: number, forward: number): Vec3 => along(pivot, gun, right, up, forward);
  const part = (right: number, up: number, forward: number, sx: number, sy: number, sz: number, color: Color,
    material: PartMaterial = PART_MATERIAL.armor, emission = 0, basis: Basis = gun): void => {
    sink.box(boxMatrix(at(right, up, forward), basis, sx, sy, sz), color, emission, material);
  };
  const shoulderRight = along(frame.eye, camera, 0.3, -0.5, 0.05);
  const shoulderLeft = along(frame.eye, camera, -0.12, -0.5, 0.3);
  // Only the forearm is drawn: a full arm this close to the lens fills the screen.
  const arm = (shoulder: Vec3, wrist: Vec3): void => {
    const elbow = lerp(wrist, shoulder, 0.55);
    sink.capsule(elbow, wrist, 0.042, SUIT, 0, PART_MATERIAL.rubber);
    sink.box(segmentBoxMatrix(elbow, wrist, 0.085, 0.085, camera.up, 0.7, 0.55), SUIT, 0, PART_MATERIAL.armor);
  };
  const glove = (center: Vec3, basis: Basis, curl: number): void => {
    sink.box(boxMatrix(center, basis, 0.075, 0.085, 0.095), GLOVE, 0, PART_MATERIAL.rubber);
    // Fingers wrap across the front of whatever the hand holds.
    for (const finger of [-1, 0, 1] as const) {
      const knuckle = along(center, basis, 0.03, -0.012 + finger * 0.026, 0.045);
      sink.capsule(knuckle, along(knuckle, basis, -0.055, 0, 0.01 - curl * 0.012), 0.0125, GLOVE, 0, PART_MATERIAL.rubber);
    }
  };

  if (frame.weapon === 'pulse' || frame.weapon === 'laser') {
    const laser = frame.weapon === 'laser';
    const heat = Math.max(0, Math.min(1, frame.laserHeat / 100));
    const energy: Color = laser ? [1, 0.25, 0.62] : [0.2, 0.95, 1];
    const shell: Color = laser ? [0.2, 0.17, 0.24] : POLYMER;
    part(0, 0, 0.02, 0.07, 0.085, 0.34, RECEIVER);
    part(0, 0.052, 0.02, 0.028, 0.016, 0.3, GUNMETAL);
    for (let rib = 0; rib < 5; rib += 1) part(0, 0.062, 0.1 + rib * 0.035, 0.022, 0.006, 0.01, GUNMETAL);
    part(0, 0.078, 0.02, 0.03, 0.03, 0.07, GUNMETAL);
    part(0, 0.078, 0.058, 0.022, 0.02, 0.006, [0.3, 0.9, 1], PART_MATERIAL.glass, 0.35);
    part(0, -0.002, 0.25, 0.066, 0.074, 0.2, shell);
    for (const side of [-1, 1] as const) {
      for (let vent = 0; vent < 3; vent += 1) {
        part(side * 0.034, 0.006, 0.19 + vent * 0.045, 0.004, 0.036, 0.018, energy, PART_MATERIAL.paint, laser ? 0.4 + heat * 0.6 : 0.75);
      }
    }
    const barrelStart = at(0, 0.008, 0.34);
    const barrelEnd = at(0, 0.008, laser ? 0.47 : 0.5);
    sink.capsule(barrelStart, barrelEnd, laser ? 0.022 : 0.014, laser ? [0.55, 0.3, 0.2] : STEEL,
      laser ? heat * 0.7 : 0, PART_MATERIAL.chrome);
    if (laser) {
      part(0, 0.008, 0.49, 0.06, 0.06, 0.05, GUNMETAL);
      sink.sphere(at(0, 0.008, 0.52), 0.028, [0.9, 0.5, 1], 1, 1, 0.2, PART_MATERIAL.glass);
      sink.sphere(at(0, 0.008, 0.52), 0.014, energy, 1, 1, frame.laserActive ? 1 : 0.5);
    } else {
      part(0, 0.008, 0.5, 0.03, 0.03, 0.045, GUNMETAL);
    }
    const magazine = rotateBasis(gun, gun.right, 0.18);
    part(0, -0.085, 0.07, 0.048, 0.1, 0.065, GUNMETAL, PART_MATERIAL.armor, 0, magazine);
    part(0.026, -0.08, 0.07, 0.004, 0.07, 0.02, energy, PART_MATERIAL.paint, 0.8, magazine);
    const grip = rotateBasis(gun, gun.right, -0.3);
    part(0, -0.075, -0.085, 0.042, 0.1, 0.05, GLOVE, PART_MATERIAL.rubber, 0, grip);
    part(0, -0.005, -0.17, 0.05, 0.07, 0.06, shell);
    glove(at(0.012, -0.078, -0.07), grip, 1);
    glove(at(-0.01, -0.052, 0.25), gun, 0.6);
    arm(shoulderRight, at(0.03, -0.1, -0.13));
    arm(shoulderLeft, at(-0.03, -0.07, 0.2));
    const flash = recoilKick(frame.tick - frame.lastPulseTick) * Math.max(0, Math.min(1, frame.flashScale));
    if (!laser && flash > 0.45) {
      const muzzle = at(0, 0.008, 0.54);
      sink.sphere(muzzle, 0.045 * flash, [1, 0.92, 0.55], 1, 1, 1);
      sink.sphere(at(0, 0.008, 0.58), 0.03 * flash, energy, 1, 1.8, 1);
    }
    return;
  }

  if (frame.weapon === 'sword') {
    const since = frame.tick - frame.lastSwordTick;
    const swing = since >= 0 && since < 14 ? Math.sin((since / 14) * Math.PI) * motion : 0;
    let hilt = rotateBasis(camera, camera.forward, 0.55 + swing * 1.2);
    hilt = rotateBasis(hilt, hilt.right, -0.45 - swing * 0.5);
    const base = at(0.06 - swing * 0.16, -0.06 + swing * 0.04, 0.05);
    const heat = Math.max(0, Math.min(1, frame.swordHeat / 100));
    const edge: Color = frame.lastSwordCharged && since < 20 ? [1, 0.3, 0.75] : [0.35, 0.95, 1];
    sink.box(boxMatrix(base, hilt, 0.034, 0.13, 0.034), GLOVE, 0, PART_MATERIAL.rubber);
    sink.box(boxMatrix(along(base, hilt, 0, 0.075, 0), hilt, 0.11, 0.022, 0.04), GUNMETAL, 0, PART_MATERIAL.armor);
    sink.sphere(along(base, hilt, 0, -0.075, 0), 0.022, STEEL, 1, 1, 0, PART_MATERIAL.chrome);
    const bladeStart = along(base, hilt, 0, 0.09, 0);
    sink.box(boxMatrix(along(bladeStart, hilt, 0, 0.27, 0), hilt, 0.03, 0.54, 0.008), STEEL, 0, PART_MATERIAL.chrome);
    sink.capsule(along(bladeStart, hilt, 0.017, 0.01, 0), along(bladeStart, hilt, 0.017, 0.54, 0), 0.006, edge, 0.6 + heat * 0.4);
    sink.capsule(along(bladeStart, hilt, -0.017, 0.01, 0), along(bladeStart, hilt, -0.017, 0.54, 0), 0.006, edge, 0.6 + heat * 0.4);
    glove(along(base, hilt, 0.02, 0, 0), hilt, 1);
    arm(shoulderRight, along(base, hilt, 0.03, -0.05, -0.03));
    return;
  }

  // Bomb: a grenade held in the right hand, the fuse glowing when one is ready.
  const hand = at(0.02, -0.06, 0.06);
  if (frame.bombs > 0) {
    const grenade = along(hand, gun, -0.01, 0.045, 0.02);
    sink.sphere(grenade, 0.04, [0.2, 0.22, 0.18], 1.1, 1, 0, PART_MATERIAL.paint);
    sink.sphere(grenade, 0.041, [1, 0.45, 0.08], 0.1, 1, 0.8);
    sink.box(boxMatrix(along(grenade, gun, 0, 0.05, 0), gun, 0.022, 0.022, 0.022), STEEL, 0, PART_MATERIAL.chrome);
    sink.capsule(along(grenade, gun, 0.01, 0.055, 0), along(grenade, gun, 0.04, 0.035, -0.02), 0.004, STEEL, 0, PART_MATERIAL.chrome);
  }
  glove(hand, rotateBasis(gun, gun.right, 0.3), frame.bombs > 0 ? 0.8 : 0.3);
  arm(shoulderRight, along(hand, gun, 0.02, -0.06, -0.08));
}
