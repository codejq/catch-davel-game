import * as THREE from 'three';
import { clamp, type Vec3 } from '../core/collision';
import { texture, worldBox } from '../world/materials';
import { SENTRY, type SentryState } from './sentry';

interface Leg { readonly hip: THREE.Group; readonly knee: THREE.Group; readonly ankle: THREE.Group }
interface Arm { readonly shoulder: THREE.Group; readonly elbow: THREE.Group }

export interface RobotRig {
  readonly root: THREE.Group;
  readonly pelvis: THREE.Group;
  readonly torso: THREE.Group;
  readonly head: THREE.Group;
  readonly legs: readonly [Leg, Leg];
  readonly arms: readonly [Arm, Arm];
  readonly gun: THREE.Group;
  /** Visor, chest core, and antenna tip: glows in the colour of the robot's mood. */
  readonly eyes: THREE.MeshStandardMaterial;
  readonly muzzle: THREE.Mesh;
  /** Smoothed walking speed, used to blend between the stride and the standing pose. */
  stride: number;
  lastPhase: number;
}

const THIGH = 0.46;
const SHIN = 0.44;
const HIP_HEIGHT = 1.0;

const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.6, metalness: 0.55 });
const rubberMaterial = new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.95, metalness: 0 });
const steelMaterial = new THREE.MeshStandardMaterial({ color: 0xb4b9be, roughness: 0.22, metalness: 1 });
const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.45, metalness: 0.7, map: texture('metal') });
const lensMaterial = new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.05, metalness: 0.3, envMapIntensity: 2.5 });
const ventMaterial = new THREE.MeshStandardMaterial({ color: 0x0b0c0d, roughness: 0.8, metalness: 0.4 });

/** Worn, scuffed paint over metal plate. */
function armor(color: number, roughness = 0.55): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.25, bumpMap: texture('metal'), bumpScale: 0.6 });
}

/** Stencilled unit number and a hazard stripe, like the markings on military hardware. */
function stencil(serial: string): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 96;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#e8e2d0';
  context.font = 'bold 40px monospace';
  context.textAlign = 'center';
  context.fillText(serial, 64, 44);
  for (let stripe = -2; stripe < 10; stripe += 1) {
    context.fillStyle = stripe % 2 === 0 ? '#d9a21b' : '#161616';
    context.beginPath();
    context.moveTo(stripe * 16, 96); context.lineTo(stripe * 16 + 16, 96); context.lineTo(stripe * 16 + 32, 64); context.lineTo(stripe * 16 + 16, 64);
    context.fill();
  }
  // Scratch the paint.
  context.globalCompositeOperation = 'destination-out';
  for (let scratch = 0; scratch < 40; scratch += 1) context.fillRect((scratch * 37) % 128, (scratch * 53) % 96, 2 + (scratch % 5), 1);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.7, metalness: 0.2 });
}

function box(width: number, height: number, depth: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(worldBox(width, height, depth, 0.8), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radiusTop: number, radiusBottom: number, length: number, material: THREE.Material, x = 0, y = 0, z = 0, segments = 12): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, length, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** A cylinder lying along Z (barrels, lenses). */
function barrel(radius: number, length: number, material: THREE.Material, x: number, y: number, z: number, segments = 10): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments).rotateX(Math.PI / 2), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function sphere(radius: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** A hydraulic ram between two points of the same group: steel rod sliding out of a dark sleeve. */
function piston(from: THREE.Vector3, to: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  const length = from.distanceTo(to);
  group.add(cylinder(0.026, 0.026, length * 0.55, jointMaterial, 0, length * 0.275, 0, 8));
  group.add(cylinder(0.013, 0.013, length * 0.6, steelMaterial, 0, length * 0.7, 0, 8));
  group.position.copy(from);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return group;
}

/** The robot's carbine: receiver, magazine, stock, vented shroud, barrel, brake, optic. Built along +Z. */
function carbine(): { gun: THREE.Group; muzzle: THREE.Mesh } {
  const gun = new THREE.Group();
  gun.add(box(0.07, 0.1, 0.42, gunMaterial, 0, 0, 0.1));
  gun.add(box(0.05, 0.16, 0.07, gunMaterial, 0, -0.12, 0.14));
  gun.add(box(0.05, 0.08, 0.2, gunMaterial, 0, 0.02, -0.2));
  gun.add(barrel(0.03, 0.3, gunMaterial, 0, 0.01, 0.45));
  for (let vent = 0; vent < 4; vent += 1) gun.add(box(0.064, 0.012, 0.03, ventMaterial, 0, 0.034, 0.36 + vent * 0.06));
  gun.add(barrel(0.012, 0.22, steelMaterial, 0, 0.01, 0.68, 8));
  gun.add(barrel(0.02, 0.06, gunMaterial, 0, 0.01, 0.8, 8));
  gun.add(box(0.04, 0.05, 0.1, gunMaterial, 0, 0.08, 0.1));
  gun.add(barrel(0.018, 0.02, lensMaterial, 0, 0.08, 0.155));
  const muzzle = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  muzzle.position.set(0, 0.01, 0.98);
  muzzle.scale.set(0.8, 0.8, 2.4);
  gun.add(muzzle);
  return { gun, muzzle };
}

let serialCounter = 0;

/** Builds a two-metre military combat robot: armored plates over a jointed frame with hydraulics and a carbine. */
export function createRobotRig(paint: number): RobotRig {
  const plate = armor(paint);
  const accent = armor(new THREE.Color(paint).multiplyScalar(0.55).getHex(), 0.65);
  // Unfogged, so the glowing visor gives robots away even far off in haze.
  const eyes = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x33ddff, emissiveIntensity: 4, fog: false });
  serialCounter += 1;
  const markings = stencil(`D-${String(serialCounter).padStart(2, '0')}`);
  const root = new THREE.Group();
  root.scale.setScalar(SENTRY.scale);

  const pelvis = new THREE.Group();
  pelvis.position.y = HIP_HEIGHT;
  pelvis.add(box(0.42, 0.16, 0.28, accent, 0, 0.02, 0));
  pelvis.add(box(0.3, 0.12, 0.08, plate, 0, -0.02, 0.16));
  pelvis.add(cylinder(0.06, 0.06, 0.46, jointMaterial, 0, 0, 0, 10).rotateZ(Math.PI / 2));
  root.add(pelvis);

  const legs = ([-1, 1] as const).map((side): Leg => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.17, 0, 0);
    hip.add(sphere(0.085, jointMaterial));
    hip.add(box(0.19, THIGH * 0.8, 0.22, plate, 0, -THIGH * 0.45, 0.02));
    hip.add(box(0.2, 0.18, 0.06, accent, 0, -THIGH * 0.35, 0.14));
    hip.add(piston(new THREE.Vector3(0, -0.05, -0.12), new THREE.Vector3(0, -THIGH + 0.06, -0.1)));
    const knee = new THREE.Group();
    knee.position.y = -THIGH;
    knee.add(sphere(0.08, jointMaterial));
    knee.add(box(0.16, 0.16, 0.07, plate, 0, 0.01, 0.1));
    knee.add(box(0.16, SHIN * 0.78, 0.18, accent, 0, -SHIN * 0.48, 0));
    knee.add(box(0.13, SHIN * 0.6, 0.05, plate, 0, -SHIN * 0.42, 0.11));
    knee.add(piston(new THREE.Vector3(0, -0.06, -0.11), new THREE.Vector3(0, -SHIN + 0.08, -0.08)));
    const ankle = new THREE.Group();
    ankle.position.y = -SHIN;
    ankle.add(sphere(0.055, jointMaterial));
    ankle.add(box(0.18, 0.07, 0.3, accent, 0, -0.045, 0.06));
    ankle.add(box(0.19, 0.03, 0.34, rubberMaterial, 0, -0.07, 0.06));
    ankle.add(box(0.16, 0.05, 0.08, plate, 0, -0.03, 0.2));
    knee.add(ankle);
    hip.add(knee);
    pelvis.add(hip);
    return { hip, knee, ankle };
  }) as [Leg, Leg];

  const torso = new THREE.Group();
  torso.position.y = 0.1;
  // Flexible spine.
  for (let ring = 0; ring < 3; ring += 1) torso.add(cylinder(0.13 - ring * 0.01, 0.14 - ring * 0.01, 0.06, jointMaterial, 0, 0.06 + ring * 0.07, 0, 10));
  // Chest: layered armor, stencilled markings, and a glowing core.
  torso.add(box(0.56, 0.44, 0.34, plate, 0, 0.47, 0));
  torso.add(box(0.46, 0.3, 0.1, plate, 0, 0.5, 0.2));
  torso.add(box(0.38, 0.14, 0.06, accent, 0, 0.3, 0.17));
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.225), markings);
  decal.position.set(0, 0.52, 0.253);
  torso.add(decal);
  torso.add(sphere(0.035, eyes, 0.15, 0.36, 0.2));
  for (let vent = 0; vent < 3; vent += 1) torso.add(box(0.12, 0.015, 0.02, ventMaterial, -0.13, 0.33 + vent * 0.03, 0.205));
  // Backpack power unit with exhausts, vents, and an antenna.
  torso.add(box(0.44, 0.46, 0.2, accent, 0, 0.5, -0.26));
  for (let vent = 0; vent < 5; vent += 1) torso.add(box(0.3, 0.02, 0.02, ventMaterial, 0, 0.36 + vent * 0.06, -0.365));
  for (const side of [-1, 1] as const) torso.add(cylinder(0.035, 0.04, 0.16, jointMaterial, side * 0.15, 0.8, -0.3, 10));
  torso.add(cylinder(0.005, 0.008, 0.55, steelMaterial, 0.17, 0.98, -0.3, 5));
  torso.add(sphere(0.014, eyes, 0.17, 1.26, -0.3));
  pelvis.add(torso);

  const arms = ([-1, 1] as const).map((side): Arm => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.36, 0.6, 0);
    shoulder.add(sphere(0.085, jointMaterial));
    // Pauldron: a sloped plate over the joint.
    const pauldron = box(0.22, 0.08, 0.3, plate, side * 0.04, 0.08, 0);
    pauldron.rotation.z = -side * 0.35;
    shoulder.add(pauldron);
    shoulder.add(box(0.13, 0.28, 0.14, plate, 0, -0.17, 0));
    shoulder.add(piston(new THREE.Vector3(side * 0.07, -0.04, 0), new THREE.Vector3(side * 0.07, -0.28, 0)));
    const elbow = new THREE.Group();
    elbow.position.y = -0.32;
    elbow.add(sphere(0.065, jointMaterial));
    elbow.add(box(0.12, 0.28, 0.13, accent, 0, -0.16, 0));
    elbow.add(box(0.1, 0.1, 0.12, jointMaterial, 0, -0.34, 0));
    for (const finger of [-1, 1] as const) elbow.add(box(0.025, 0.08, 0.04, jointMaterial, finger * 0.03, -0.42, 0.03));
    shoulder.add(elbow);
    torso.add(shoulder);
    return { shoulder, elbow };
  }) as [Arm, Arm];

  // The carbine is gripped in the right hand.
  const { gun, muzzle } = carbine();
  gun.position.set(0, -0.34, 0.04);
  arms[1].elbow.add(gun);

  // Sensor head: armored helmet, a glowing visor slit behind dark glass, and a rangefinder lens.
  const head = new THREE.Group();
  head.position.set(0, 0.75, 0.02);
  head.add(cylinder(0.05, 0.06, 0.14, jointMaterial, 0, 0.03, 0, 10));
  head.add(piston(new THREE.Vector3(0.07, -0.02, -0.04), new THREE.Vector3(0.05, 0.1, -0.02)));
  const helmet = sphere(0.17, plate, 0, 0.2, -0.01);
  helmet.scale.set(1.05, 0.85, 1.15);
  head.add(helmet);
  head.add(box(0.28, 0.1, 0.16, plate, 0, 0.16, 0.08));
  head.add(box(0.27, 0.065, 0.02, lensMaterial, 0, 0.2, 0.18));
  head.add(box(0.22, 0.018, 0.012, eyes, 0, 0.2, 0.192));
  head.add(barrel(0.03, 0.04, lensMaterial, 0.09, 0.12, 0.17, 12));
  for (const side of [-1, 1] as const) head.add(box(0.05, 0.14, 0.14, accent, side * 0.17, 0.18, 0));
  head.add(box(0.05, 0.05, 0.22, accent, 0, 0.35, -0.03));
  torso.add(head);

  return { root, pelvis, torso, head, legs, arms, gun, eyes, muzzle, stride: 0, lastPhase: 0 };
}

export const MODE_EYE_COLOR: Record<SentryState['mode'], number> = {
  patrol: 0x33ddff, suspicious: 0xffb020, search: 0xffb020, alert: 0xff2a1a, dead: 0x000000,
};

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Poses the rig from sentry state: a heavy, knee-bent stride with hip sway, a combat crouch with the carbine
 * shouldered and the head tracking the player, recoil when firing, and a buckling collapse when destroyed.
 * `target` is the player's eye position, which alerted robots look and aim at.
 */
export function poseRobot(rig: RobotRig, sentry: SentryState, time: number, target: Vec3 | null = null): void {
  const { legs, arms, pelvis, torso, head, gun } = rig;
  rig.root.position.set(sentry.position.x, sentry.position.y, sentry.position.z);
  rig.root.rotation.set(0, sentry.heading, 0);
  const moved = Math.abs(sentry.walkPhase - rig.lastPhase);
  rig.lastPhase = sentry.walkPhase;
  rig.stride += (clamp(moved * 40, 0, 1) - rig.stride) * 0.15;
  const stride = rig.stride;
  const phase = sentry.walkPhase;
  const combat = sentry.mode === 'alert' ? 1 : 0;
  const wary = sentry.mode === 'search' || sentry.mode === 'suspicious' ? 1 : 0;

  // Legs: a base crouch plus the stride. The ankle keeps the foot flat on the ground.
  const crouch = 0.12 + combat * 0.28 + wary * 0.1;
  legs.forEach((leg, index) => {
    const offset = index === 0 ? 0 : Math.PI;
    const swing = Math.sin(phase + offset) * 0.5 * stride;
    const lift = Math.max(0, -Math.sin(phase + offset + 0.6)) * 0.85 * stride;
    leg.hip.rotation.set(-crouch + swing, 0, 0);
    leg.knee.rotation.x = crouch * 2 + lift;
    leg.ankle.rotation.x = -(leg.hip.rotation.x + leg.knee.rotation.x) + Math.max(0, Math.sin(phase + offset)) * 0.25 * stride;
  });
  // The pelvis drops with the crouch, bobs twice per stride, and rolls towards the planted foot.
  const drop = (THIGH + SHIN) * (1 - Math.cos(crouch)) + 0.02;
  const bob = (1 - Math.abs(Math.cos(phase))) * 0.04 * stride;
  pelvis.position.y = HIP_HEIGHT - drop - bob + Math.sin(time * 1.6) * 0.006;
  pelvis.rotation.set(0, Math.sin(phase) * 0.06 * stride, Math.sin(phase) * 0.04 * stride);

  // Recoil kicks the torso and carbine back for a moment after each shot.
  const kick = sentry.sinceShot < 0.25 ? (1 - sentry.sinceShot / 0.25) ** 2 : 0;
  torso.rotation.set(0.05 + combat * 0.12 - kick * 0.09 + Math.sin(time * 1.6) * 0.01, -pelvis.rotation.y * 1.6, -pelvis.rotation.z * 0.8);

  // Where to look and aim.
  let lookYaw: number;
  let lookPitch: number;
  if (target !== null && (combat === 1 || sentry.mode === 'suspicious')) {
    const eyeY = sentry.position.y + SENTRY.eyeHeight;
    lookYaw = clamp(wrapAngle(Math.atan2(target.x - sentry.position.x, target.z - sentry.position.z) - sentry.heading), -1, 1);
    lookPitch = clamp(Math.atan2(target.y - eyeY, Math.hypot(target.x - sentry.position.x, target.z - sentry.position.z)), -0.7, 0.5);
  } else if (wary === 1) {
    lookYaw = Math.sin(time * 1.1) * 0.8;
    lookPitch = Math.sin(time * 0.7) * 0.1 - 0.05;
  } else {
    lookYaw = Math.sin(time * 0.4) * 0.25 * (1 - stride);
    lookPitch = 0;
  }
  head.rotation.set(-lookPitch - torso.rotation.x + Math.sin(time * 7.3) * 0.004, lookYaw * 0.8 - torso.rotation.y, 0);

  // Arms: shouldered carbine when fighting, low ready when wary, a relaxed swing on patrol.
  const [left, right] = arms;
  const armSwing = Math.sin(phase) * 0.35 * stride;
  const ready = Math.max(combat, wary * 0.6);
  const rightShoulder = THREE.MathUtils.lerp(-0.25 + armSwing * 0.4, -1.05 - lookPitch * combat, ready) - kick * 0.25;
  const rightElbow = THREE.MathUtils.lerp(-0.65, -0.55 + (1 - combat) * 0.35, ready);
  right.shoulder.rotation.set(rightShoulder, lookYaw * 0.5 * combat, 0.12 * ready);
  right.elbow.rotation.set(rightElbow, 0, 0);
  left.shoulder.rotation.set(THREE.MathUtils.lerp(-armSwing, -1.15 - lookPitch * combat, ready), lookYaw * 0.4 * combat, -0.5 * ready);
  left.elbow.rotation.set(THREE.MathUtils.lerp(-0.25, -0.75, ready), 0, 0.35 * ready);
  // Keep the carbine level with the aim (or angled at the ground when not fighting) whatever the arm is doing.
  const armPitch = rightShoulder + rightElbow + torso.rotation.x;
  const gunPitch = combat === 1 ? lookPitch + kick * 0.2 : -0.5 - (1 - ready) * 0.4;
  gun.rotation.set(-armPitch - gunPitch, 0, 0);
  gun.position.z = 0.04 - kick * 0.05;

  // Mood lights, pulsing in combat and flickering out as the robot dies.
  rig.eyes.emissive.setHex(MODE_EYE_COLOR[sentry.mode === 'dead' ? 'alert' : sentry.mode]);
  rig.eyes.emissiveIntensity = sentry.mode === 'dead'
    ? (sentry.deathTime < 0.8 && Math.sin(sentry.deathTime * 90) > 0 ? 2 * (1 - sentry.deathTime / 0.8) : 0)
    : 4 + combat * 2 * (0.5 + 0.5 * Math.sin(time * 9));
  (rig.muzzle.material as THREE.MeshBasicMaterial).opacity = sentry.sinceShot < 0.08 ? 1 : 0;
  rig.muzzle.rotation.z = time * 13;

  if (sentry.mode === 'dead') {
    // The knees buckle first, then the whole frame topples backwards.
    const buckle = Math.min(1, sentry.deathTime / 0.45);
    const fall = clamp((sentry.deathTime - 0.25) / 0.8, 0, 1);
    for (const leg of legs) {
      leg.hip.rotation.x = -0.4 - buckle * 0.9;
      leg.knee.rotation.x = buckle * 1.9;
      leg.ankle.rotation.x = -buckle * 0.9;
    }
    pelvis.position.y = HIP_HEIGHT - buckle * 0.5;
    torso.rotation.x = buckle * 0.5;
    head.rotation.set(buckle * 0.6, 0.4 * buckle, 0.3 * buckle);
    right.shoulder.rotation.set(-0.2, 0, 0.6 * buckle);
    left.shoulder.rotation.set(-0.3, 0, -0.7 * buckle);
    rig.root.rotation.x = -fall * fall * 1.35;
    rig.root.position.y = sentry.position.y - fall * 0.35 * SENTRY.scale;
  }
}

export { SENTRY };
