import * as THREE from 'three';
import { texture, worldBox } from '../world/materials';
import { SENTRY, type SentryState } from './sentry';

export interface RobotRig {
  readonly root: THREE.Group;
  readonly torso: THREE.Group;
  readonly head: THREE.Group;
  readonly legs: readonly { readonly hip: THREE.Group; readonly knee: THREE.Group }[];
  readonly arms: readonly THREE.Group[];
  readonly eyes: THREE.MeshStandardMaterial;
  readonly muzzle: THREE.Mesh;
}

const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.55, metalness: 0.6 });
const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.28, metalness: 0.95 });
const visorMaterial = new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.08, metalness: 0.2 });

function armor(color: number): THREE.MeshStandardMaterial {
  const bump = texture('metal');
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.35, bumpMap: bump, bumpScale: 0.8 });
}

function box(width: number, height: number, depth: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(worldBox(width, height, depth, 0.8), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radius: number, length: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** Builds a two-metre armored combat robot out of plates, pistons, and joints. */
export function createRobotRig(paint: number): RobotRig {
  const plate = armor(paint);
  const accent = armor(new THREE.Color(paint).multiplyScalar(0.6).getHex());
  const eyes = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x33ddff, emissiveIntensity: 4 });
  const root = new THREE.Group();

  const legs = ([-1, 1] as const).map((side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.2, 1.02, 0);
    hip.add(box(0.22, 0.5, 0.26, plate, 0, -0.26, 0.02));
    hip.add(cylinder(0.07, 0.5, jointMaterial, 0, -0.25, -0.06));
    const knee = new THREE.Group();
    knee.position.set(0, -0.52, 0);
    knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), jointMaterial));
    knee.add(box(0.18, 0.2, 0.08, accent, 0, 0.02, 0.12));
    knee.add(box(0.19, 0.46, 0.22, accent, 0, -0.26, 0));
    knee.add(cylinder(0.025, 0.4, steelMaterial, 0, -0.22, -0.13));
    knee.add(box(0.22, 0.1, 0.38, jointMaterial, 0, -0.5, 0.06));
    hip.add(knee);
    root.add(hip);
    return { hip, knee };
  });

  const pelvis = box(0.5, 0.2, 0.32, accent, 0, 1.05, 0);
  root.add(pelvis);
  const torso = new THREE.Group();
  torso.position.set(0, 1.15, 0);
  for (let ring = 0; ring < 3; ring += 1) torso.add(box(0.36 - ring * 0.02, 0.07, 0.26, jointMaterial, 0, 0.06 + ring * 0.08, 0));
  torso.add(box(0.66, 0.46, 0.4, plate, 0, 0.5, 0));
  torso.add(box(0.44, 0.26, 0.08, accent, 0, 0.55, 0.22));
  torso.add(box(0.48, 0.42, 0.18, jointMaterial, 0, 0.5, -0.28));
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), eyes);
  core.position.set(0, 0.42, 0.25);
  torso.add(core);
  for (const side of [-1, 1] as const) {
    torso.add(cylinder(0.035, 0.18, steelMaterial, side * 0.14, 0.82, -0.3));
    torso.add(box(0.26, 0.16, 0.3, plate, side * 0.4, 0.74, 0));
  }
  root.add(torso);

  const arms = ([-1, 1] as const).map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.43, 0.68, 0);
    shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), jointMaterial));
    shoulder.add(box(0.14, 0.36, 0.15, plate, 0, -0.2, 0));
    const forearm = box(0.15, 0.34, 0.15, accent, 0, -0.5, 0.06);
    forearm.rotation.x = -0.5;
    shoulder.add(forearm);
    if (side === 1) {
      // Arm-mounted rifle.
      const gun = new THREE.Group();
      gun.position.set(0, -0.62, 0.18);
      gun.add(box(0.1, 0.12, 0.55, jointMaterial, 0, 0, 0.12));
      gun.add(cylinder(0.025, 0.3, steelMaterial, 0, 0.02, 0.5).rotateX(Math.PI / 2));
      shoulder.add(gun);
    }
    torso.add(shoulder);
    return shoulder;
  });

  const head = new THREE.Group();
  head.position.set(0, 0.86, 0.02);
  head.add(cylinder(0.05, 0.14, steelMaterial, 0, 0.02, 0));
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), plate);
  helmet.scale.set(1.05, 0.92, 1.1);
  helmet.position.y = 0.2;
  helmet.castShadow = true;
  head.add(helmet);
  head.add(box(0.34, 0.1, 0.12, visorMaterial, 0, 0.21, 0.16));
  for (const side of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), eyes);
    eye.position.set(side * 0.075, 0.215, 0.225);
    head.add(eye);
    head.add(box(0.06, 0.16, 0.16, jointMaterial, side * 0.2, 0.18, -0.01));
  }
  head.add(box(0.2, 0.08, 0.12, jointMaterial, 0, 0.08, 0.15));
  head.add(box(0.04, 0.06, 0.26, accent, 0, 0.38, -0.02));
  torso.add(head);

  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc36a, transparent: true, opacity: 0 }));
  muzzle.position.set(0, -0.6, 0.85);
  arms[1]!.add(muzzle);
  return { root, torso, head, legs, arms, eyes, muzzle };
}

export const MODE_EYE_COLOR: Record<SentryState['mode'], number> = {
  patrol: 0x33ddff, suspicious: 0xffb020, search: 0xffb020, alert: 0xff2a1a, dead: 0x000000,
};

/** Poses the rig from sentry state: walk cycle, aiming, and a collapse when destroyed. */
export function poseRobot(rig: RobotRig, sentry: SentryState, time: number): void {
  rig.root.position.set(sentry.position.x, sentry.position.y, sentry.position.z);
  rig.root.rotation.y = sentry.heading;
  const swing = Math.sin(sentry.walkPhase) * 0.55;
  rig.legs[0]!.hip.rotation.x = swing;
  rig.legs[1]!.hip.rotation.x = -swing;
  rig.legs[0]!.knee.rotation.x = Math.max(0, -Math.sin(sentry.walkPhase + 0.6)) * 0.8;
  rig.legs[1]!.knee.rotation.x = Math.max(0, Math.sin(sentry.walkPhase + 0.6)) * 0.8;
  rig.torso.position.y = 1.15 + Math.abs(Math.cos(sentry.walkPhase)) * 0.04;
  const aiming = sentry.mode === 'alert';
  rig.arms[1]!.rotation.x = aiming ? -1.35 : -0.2 + swing * 0.3;
  rig.arms[0]!.rotation.x = aiming ? -1.1 : -swing * 0.4;
  rig.arms[0]!.rotation.z = aiming ? -0.35 : 0;
  rig.head.rotation.y = sentry.mode === 'search' || sentry.mode === 'suspicious' ? Math.sin(time * 1.3) * 0.7 : 0;
  rig.eyes.emissive.setHex(MODE_EYE_COLOR[sentry.mode]);
  rig.eyes.emissiveIntensity = sentry.mode === 'dead' ? 0 : 4;
  (rig.muzzle.material as THREE.MeshBasicMaterial).opacity = sentry.sinceShot < 0.06 ? 1 : 0;
  if (sentry.mode === 'dead') {
    const fall = Math.min(1, sentry.deathTime / 0.9);
    rig.root.rotation.x = -fall * fall * 1.45;
    rig.root.position.y = sentry.position.y - fall * 0.1;
    rig.legs[0]!.knee.rotation.x = fall * 1.2;
    rig.legs[1]!.knee.rotation.x = fall * 0.9;
  }
}

export { SENTRY };
