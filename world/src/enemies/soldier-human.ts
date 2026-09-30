import * as THREE from 'three';
import { createHuman, gait, humansReady, play, type ClipName, type HumanRig } from '../population/human-model';
import type { Random } from '../core/random';
import { carbine, createSoldierFarProxy, MODE_EYE_COLOR } from './robot-mesh';
import { SENTRY_KINDS, type SentryState } from './sentry';

/**
 * A soldier drawn as a real, animated person (Quaternius's CC0 base characters in camouflage fatigues, helmet,
 * plate carrier, gloves, and a carbine), driven by the same sentry AI as the robots. Exposes the fields the game
 * uses on every enemy rig: the root, the body to hide at a distance, the far stand-in, and the gun it drops.
 */
export interface HumanSoldierRig {
  readonly kind: 'human';
  readonly root: THREE.Group;
  /** The animated body; hidden (with the far stand-in shown) when the soldier is far away. */
  readonly pelvis: THREE.Object3D;
  readonly far: THREE.Group;
  readonly gun: THREE.Group;
  readonly muzzle: THREE.Mesh;
  readonly human: HumanRig;
  /** Smoothed ground speed (m/s), from how far the walk cycle moved. */
  speed: number;
  lastPhase: number;
}

const SKIN_TONES = [0.72, 0.85, 0.95, 1.08, 1.2, 1.3];

/** Camouflage in three shades of the world's fatigue colour. */
function camoOf(base: number): [number, number, number] {
  const color = new THREE.Color(base);
  return [color.getHex(), color.clone().multiplyScalar(0.58).getHex(), color.clone().lerp(new THREE.Color(0xc9b98a), 0.35).getHex()];
}

/** Builds a human soldier, or null while the character models are still loading. */
export function createHumanSoldierRig(fatigues: number, random: Random): HumanSoldierRig | null {
  if (!humansReady()) return null;
  const camo = camoOf(fatigues);
  const { gun, muzzle } = carbine();
  const human = createHuman({
    body: random.chance(0.25) ? 'female' : 'male',
    outfit: { skin: random.pick(SKIN_TONES), shirt: camo[0], pants: camo[0], shoes: 0x2a2118, sleeves: 'long', legs: 'long', camo, gloves: 0x1c1c1a },
    helmet: new THREE.Color(fatigues).multiplyScalar(0.85).getHex(), vest: new THREE.Color(fatigues).multiplyScalar(0.62).getHex(), gun: { gun, muzzle },
  });
  if (human === null) return null;
  const far = createSoldierFarProxy(fatigues, 0xc68a62, human.eyes);
  far.scale.setScalar(SENTRY_KINDS.soldier.scale);
  human.root.add(far);
  return { kind: 'human', root: human.root, pelvis: human.body, far, gun, muzzle, human, speed: 0, lastPhase: 0 };
}

export function isHumanRig(rig: object): rig is HumanSoldierRig {
  return (rig as HumanSoldierRig).kind === 'human';
}

/** Full model up close, the far stand-in further off. Returns true when the full model shows. */
export function setHumanDetail(rig: HumanSoldierRig, near: boolean): boolean {
  rig.pelvis.visible = near;
  rig.far.visible = !near;
  return near;
}

/**
 * Picks the animation from the soldier's state: patrolling walk, a jog or sprint when hunting, crouched in cover,
 * rifle up and firing when engaging, and a fall when killed. `animate` is false far away (only placement updates).
 */
export function poseHumanSoldier(rig: HumanSoldierRig, sentry: SentryState, dt: number, animate: boolean): void {
  const moved = Math.abs(sentry.walkPhase - rig.lastPhase) / 2.4;
  rig.lastPhase = sentry.walkPhase;
  rig.speed += ((dt > 0 ? moved / dt : 0) - rig.speed) * Math.min(1, dt * 8);
  rig.root.position.set(sentry.position.x, sentry.position.y, sentry.position.z);
  rig.root.rotation.set(0, sentry.heading, 0);
  const human = rig.human;
  human.eyes.emissive.setHex(MODE_EYE_COLOR[sentry.mode === 'dead' ? 'alert' : sentry.mode]);
  human.eyes.emissiveIntensity = sentry.mode === 'dead' ? 0 : 2.5;
  (rig.muzzle.material as THREE.MeshBasicMaterial).opacity = sentry.sinceShot < 0.08 ? 1 : 0;
  if (sentry.mode === 'dead') {
    play(human, 'Death01', { once: true, fade: 0.15 });
  } else {
    let clip: ClipName; let rate = 1;
    const speed = rig.speed;
    if (sentry.mode === 'alert') {
      if (speed > 0.6) ({ clip, rate } = gait(speed, sentry.tactic === 'cover' && speed < 2));
      else if (sentry.tactic === 'cover') clip = 'Crouch_Idle_Loop';
      else clip = sentry.sinceShot < 0.3 ? 'Pistol_Shoot' : 'Pistol_Aim_Neutral';
    } else if (sentry.mode === 'suspicious' && speed < 0.3) {
      clip = 'Pistol_Aim_Neutral';
    } else {
      ({ clip, rate } = gait(speed));
    }
    play(human, clip, { rate, fade: 0.22 });
  }
  if (animate) human.mixer.update(dt);
}
