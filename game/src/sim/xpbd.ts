import { FIXED_DT_SECONDS } from './constants';
import type { RobotDefinition, RobotState } from './robots';
import type { LevelDancePerformance } from './dance-performance';

export const XPBD_SUBSTEPS = 2;
export const XPBD_ITERATIONS = 8;
export const BODY_POINT_COUNT = 11;

export const BODY_POINT = {
  hip: 0, chest: 1, head: 2,
  leftElbow: 3, leftHand: 4, rightElbow: 5, rightHand: 6,
  leftKnee: 7, leftFoot: 8, rightKnee: 9, rightFoot: 10,
} as const;

export interface RobotBodyState {
  readonly positions: Float64Array;
  readonly previous: Float64Array;
  readonly restLengths: Float64Array;
}

const LINKS: readonly (readonly [number, number])[] = [
  [BODY_POINT.hip, BODY_POINT.chest], [BODY_POINT.chest, BODY_POINT.head],
  [BODY_POINT.chest, BODY_POINT.leftElbow], [BODY_POINT.leftElbow, BODY_POINT.leftHand],
  [BODY_POINT.chest, BODY_POINT.rightElbow], [BODY_POINT.rightElbow, BODY_POINT.rightHand],
  [BODY_POINT.hip, BODY_POINT.leftKnee], [BODY_POINT.leftKnee, BODY_POINT.leftFoot],
  [BODY_POINT.hip, BODY_POINT.rightKnee], [BODY_POINT.rightKnee, BODY_POINT.rightFoot],
] as const;

function wave(time: number, rate: number, offset = 0): number {
  const cycle = ((time * rate + offset) % 2 + 2) % 2;
  return cycle < 1 ? cycle * 2 - 1 : 3 - cycle * 2;
}

function setLocal(
  target: Float64Array, index: number, rootX: number, rootZ: number, heading: number,
  localX: number, localY: number, localZ: number,
): void {
  const rightX = Math.cos(heading);
  const rightZ = -Math.sin(heading);
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  const offset = index * 3;
  target[offset] = rootX + rightX * localX + forwardX * localZ;
  target[offset + 1] = localY;
  target[offset + 2] = rootZ + rightZ * localX + forwardZ * localZ;
}

function targets(
  rootX: number, rootZ: number, heading: number, danceTime: number, definition: RobotDefinition,
  performance: LevelDancePerformance,
): Float64Array {
  const result = new Float64Array(BODY_POINT_COUNT * 3);
  const scale = definition.scale;
  const performanceTime = performance.motif === 'freeze-dance' ? Math.floor(danceTime * 4) / 4 : danceTime;
  const beat = wave(performanceTime, 2.6);
  const alternate = wave(performanceTime, 1.55, 0.5);
  let bounce = Math.abs(beat) * 0.08;
  let leftElbow: readonly [number, number, number] = [-0.48, 1.42, 0];
  let rightElbow: readonly [number, number, number] = [0.48, 1.42, 0];
  let leftHand: readonly [number, number, number] = [-0.62, 1.16, 0];
  let rightHand: readonly [number, number, number] = [0.62, 1.16, 0];
  let leftFootZ = alternate * 0.13;
  let rightFootZ = -alternate * 0.13;
  let leftFootY = 0.13;
  let rightFootY = 0.13;
  let leftKneeX = -0.22;
  let rightKneeX = 0.22;
  let leftFootX = -0.24;
  let rightFootX = 0.24;
  let hipX = 0;
  let chestX = 0;
  let chestZ = 0;
  let headX = alternate * 0.025;
  let headZ = 0.015;
  if (definition.dance === 'rubber-chicken') {
    leftElbow = [-0.68, 1.47 + beat * 0.16, 0]; rightElbow = [0.68, 1.47 - beat * 0.16, 0];
    leftHand = [-0.48, 1.12 + beat * 0.27, 0.1]; rightHand = [0.48, 1.12 - beat * 0.27, 0.1];
  } else if (definition.dance === 'moonwalker') {
    bounce = 0.03; leftFootZ = alternate * 0.38; rightFootZ = -alternate * 0.38;
    leftHand = [-0.72, 1.06, -alternate * 0.22]; rightHand = [0.72, 1.06, alternate * 0.22];
  } else if (definition.dance === 'tiny-tyrant') {
    bounce = Math.max(0, beat) * 0.14;
    leftElbow = [-0.58, 1.55, 0]; rightElbow = [0.58, 1.55, 0];
    leftHand = [-0.3, 1.73 + beat * 0.08, 0.12]; rightHand = [0.3, 1.73 - beat * 0.08, 0.12];
  } else if (definition.dance === 'big-bouncer') {
    bounce = Math.abs(beat) * 0.22;
    leftHand = [-0.9, 1.05 + beat * 0.17, 0]; rightHand = [0.9, 1.05 + beat * 0.17, 0];
  } else if (definition.dance === 'broken-marionette') {
    bounce = Math.max(0, wave(danceTime, 1.15)) * 0.09;
    leftElbow = [-0.38, 1.66 + wave(danceTime, 3.55) * 0.18, 0.08];
    leftHand = [-0.73, 1.48 + wave(danceTime, 2.35, 0.2) * 0.25, 0.2];
    rightElbow = [0.66, 1.21, -0.1]; rightHand = [0.42, 0.92 + alternate * 0.13, 0.18];
  } else {
    const leftUp = wave(danceTime, 1.05) > 0;
    leftElbow = leftUp ? [-0.46, 1.78, 0] : [-0.72, 1.36, 0];
    leftHand = leftUp ? [-0.2, 2.16, 0.04] : [-0.92, 1.18, 0.1];
    rightElbow = leftUp ? [0.72, 1.36, 0] : [0.46, 1.78, 0];
    rightHand = leftUp ? [0.92, 1.18, 0.1] : [0.2, 2.16, 0.04];
  }
  const intensity = performance.visualIntensity;
  if (performance.motif === 'side-shuffle') {
    hipX = alternate * 0.16 * intensity; chestX = -hipX * 0.55; headX += hipX * 0.8;
    leftFootZ *= 1.45; rightFootZ *= 1.45;
  } else if (performance.motif === 'robot-pop') {
    const pop = beat > 0.48 ? 1 : 0;
    bounce += pop * 0.1 * intensity; chestZ = pop * 0.08;
    leftHand = [-0.4 - pop * 0.2, 1.32 + pop * 0.32, 0.14];
    rightHand = [0.4 + pop * 0.2, 1.32 + pop * 0.32, 0.14];
  } else if (performance.motif === 'corner-peek') {
    chestX = alternate * 0.18 * intensity; headX += alternate * 0.3 * intensity; headZ = 0.11;
    leftHand = [-0.58, 1.48 + beat * 0.13, 0.18]; rightHand = [0.58, 1.18 - beat * 0.1, -0.08];
  } else if (performance.motif === 'heavy-two-step') {
    bounce += Math.max(0, beat) * 0.1 * intensity;
    leftFootY += Math.max(0, beat) * 0.18; rightFootY += Math.max(0, -beat) * 0.18;
    leftFootZ *= 0.45; rightFootZ *= 0.45;
  } else if (performance.motif === 'conveyor-conga') {
    hipX = alternate * 0.13 * intensity; chestX = hipX * 0.75;
    leftFootZ = alternate * 0.36; rightFootZ = -alternate * 0.36;
    leftHand = [-0.52, 1.2 + beat * 0.12, 0.38]; rightHand = [0.52, 1.2 - beat * 0.12, 0.38];
  } else if (performance.motif === 'freeze-dance') {
    bounce *= 0.5; chestX = alternate * 0.1; headX += beat * 0.12;
    leftHand = [-0.78, 1.62 + beat * 0.18, 0.02]; rightHand = [0.38, 1.06 - beat * 0.1, 0.2];
  } else if (performance.motif === 'clockwork-charleston') {
    leftFootZ = alternate * 0.48; rightFootZ = alternate * 0.48;
    leftHand = [-0.18, 1.42 + beat * 0.15, 0.28]; rightHand = [0.18, 1.42 - beat * 0.15, 0.28];
    chestX = -alternate * 0.08;
  } else if (performance.motif === 'turbo-shuffle') {
    bounce += Math.abs(alternate) * 0.12 * intensity; hipX = beat * 0.14; chestX = -beat * 0.18;
    leftFootZ = alternate * 0.44; rightFootZ = -alternate * 0.44;
    leftHand = [-0.86, 1.28 + alternate * 0.32, 0.12]; rightHand = [0.86, 1.28 - alternate * 0.32, 0.12];
  } else if (performance.motif === 'giant-breakdown') {
    hipX = alternate * 0.18 * intensity; chestX = -alternate * 0.24 * intensity; headX += alternate * 0.34;
    bounce += Math.abs(beat) * 0.14; leftHand = [-0.96, 1.12 + beat * 0.24, 0.08];
    rightHand = [0.96, 1.12 - beat * 0.24, 0.08];
  } else if (performance.motif === 'soft-shoe') {
    hipX = alternate * 0.2 * intensity; chestX = -hipX * 0.72; headX += alternate * 0.22;
    leftKneeX = -0.25 + beat * 0.08; rightKneeX = 0.25 + beat * 0.08;
    leftFootX = -0.3 + beat * 0.16; rightFootX = 0.3 + beat * 0.16;
    leftFootZ = alternate * 0.42; rightFootZ = -alternate * 0.3;
    leftFootY += Math.max(0, beat) * 0.08; rightFootY += Math.max(0, -beat) * 0.08;
    leftHand = [-0.84, 1.34 + alternate * 0.16, 0.18]; rightHand = [0.42, 1.58 - alternate * 0.2, 0.12];
  } else if (performance.motif === 'carousel-kick') {
    hipX = beat * 0.12 * intensity; chestX = -alternate * 0.2 * intensity; headX += beat * 0.2;
    leftKneeX = -0.2 - Math.max(0, beat) * 0.12; rightKneeX = 0.2 + Math.max(0, -beat) * 0.12;
    leftFootX = -0.26 - Math.max(0, beat) * 0.2; rightFootX = 0.26 + Math.max(0, -beat) * 0.2;
    leftFootZ = Math.max(0, beat) * 0.58; rightFootZ = Math.max(0, -beat) * 0.58;
    leftFootY += Math.max(0, beat) * 0.22; rightFootY += Math.max(0, -beat) * 0.22;
    leftHand = [-0.9, 1.5 + alternate * 0.2, 0.04]; rightHand = [0.9, 1.5 - alternate * 0.2, 0.04];
  } else if (performance.motif === 'flame-fandango') {
    hipX = alternate * 0.16 * intensity; chestX = -alternate * 0.3 * intensity; chestZ = Math.max(0, beat) * 0.1;
    headX += -alternate * 0.24; headZ = 0.08 + Math.max(0, beat) * 0.08;
    leftFootX = -0.3 - Math.max(0, alternate) * 0.1; rightFootX = 0.3 + Math.max(0, -alternate) * 0.1;
    leftFootZ = alternate * 0.38; rightFootZ = alternate * 0.38;
    leftHand = [-0.96, 1.7 + beat * 0.18, 0.16]; rightHand = [0.96, 1.18 - beat * 0.12, 0.3];
  } else if (performance.motif === 'tempo-twist') {
    const snap = beat > 0.35 ? 1 : 0;
    bounce += snap * 0.12 * intensity; hipX = alternate * 0.22 * intensity; chestX = -hipX * 0.9;
    headX += snap * alternate * 0.28; leftFootZ = alternate * 0.5; rightFootZ = -alternate * 0.5;
    leftFootY += Math.max(0, alternate) * 0.1; rightFootY += Math.max(0, -alternate) * 0.1;
    leftHand = [-0.38 - snap * 0.5, 1.24 + snap * 0.55, 0.2];
    rightHand = [0.38 + snap * 0.5, 1.24 + snap * 0.55, 0.2];
  } else if (performance.motif === 'mirror-lindy') {
    const kick = Math.max(0, alternate); const counterKick = Math.max(0, -alternate);
    bounce += Math.abs(beat) * 0.08 * intensity; hipX = -alternate * 0.18 * intensity;
    chestX = alternate * 0.28 * intensity; headX += -alternate * 0.3;
    leftFootX = -0.28 - kick * 0.12; rightFootX = 0.28 + counterKick * 0.12;
    leftFootZ = kick * 0.62 - counterKick * 0.18; rightFootZ = counterKick * 0.62 - kick * 0.18;
    leftFootY += kick * 0.18; rightFootY += counterKick * 0.18;
    leftHand = [-0.82 + counterKick * 0.36, 1.62 - kick * 0.34, 0.16];
    rightHand = [0.82 - kick * 0.36, 1.62 - counterKick * 0.34, 0.16];
  } else if (performance.motif === 'jackpot-jitter') {
    const grab = Math.max(0, beat); const toss = Math.max(0, -beat);
    bounce += (grab * 0.13 + toss * 0.05) * intensity;
    hipX = alternate * 0.24 * intensity; chestX = -alternate * 0.34 * intensity;
    chestZ = grab * 0.12; headX += alternate * 0.2; headZ = toss * 0.12;
    leftFootX = -0.28 - grab * 0.14; rightFootX = 0.28 + toss * 0.14;
    leftFootZ = grab * 0.48 - toss * 0.12; rightFootZ = toss * 0.48 - grab * 0.12;
    leftFootY += grab * 0.15; rightFootY += toss * 0.15;
    leftHand = [-0.28 - toss * 0.64, 1.1 + grab * 0.86, 0.34];
    rightHand = [0.28 + grab * 0.64, 1.1 + toss * 0.86, 0.34];
  } else if (performance.motif === 'reverse-strut') {
    const forward = Math.max(0, beat); const reverse = Math.max(0, -beat);
    bounce += (forward * 0.08 + reverse * 0.14) * intensity;
    hipX = -alternate * 0.3 * intensity; chestX = alternate * 0.38 * intensity;
    chestZ = (reverse - forward) * 0.11; headX -= alternate * 0.24; headZ = reverse * 0.1;
    leftFootZ = reverse * 0.66 - forward * 0.28; rightFootZ = forward * 0.66 - reverse * 0.28;
    leftFootY += reverse * 0.17; rightFootY += forward * 0.17;
    leftHand = [-0.78 + forward * 0.32, 1.48 + reverse * 0.28, -0.18];
    rightHand = [0.78 - reverse * 0.32, 1.48 + forward * 0.28, -0.18];
  } else if (performance.motif === 'moonlit-swing') {
    const sweep = wave(performanceTime, 0.78, 0.2); const dip = Math.max(0, -beat);
    bounce += Math.abs(beat) * 0.09 * intensity;
    hipX = alternate * 0.22 * intensity; chestX = -alternate * 0.3 * intensity;
    chestZ = dip * 0.14; headX += sweep * 0.18; headZ = -dip * 0.08;
    leftFootX = -0.28 - alternate * 0.13; rightFootX = 0.28 - alternate * 0.13;
    leftFootZ = Math.max(0, beat) * 0.54; rightFootZ = Math.max(0, -beat) * 0.54;
    leftFootY += Math.max(0, beat) * 0.13; rightFootY += Math.max(0, -beat) * 0.13;
    leftHand = [-0.72 - sweep * 0.22, 1.55 + dip * 0.22, 0.18];
    rightHand = [0.72 - sweep * 0.22, 1.55 - dip * 0.18, 0.18];
  } else if (performance.motif === 'ringmaster-revue') {
    const flourish = wave(performanceTime, 0.92, 0.35); const bow = Math.max(0, -beat);
    bounce += Math.max(0, beat) * 0.16 * intensity;
    hipX = -alternate * 0.16 * intensity; chestX = alternate * 0.34 * intensity;
    chestZ = bow * 0.22; headX += flourish * 0.25; headZ = -bow * 0.16;
    leftFootX = -0.3 - Math.max(0, alternate) * 0.16;
    rightFootX = 0.3 + Math.max(0, -alternate) * 0.16;
    leftFootZ = Math.max(0, beat) * 0.42 - bow * 0.18;
    rightFootZ = bow * 0.42 - Math.max(0, beat) * 0.18;
    leftFootY += Math.max(0, beat) * 0.12; rightFootY += bow * 0.12;
    leftHand = [-1.02, 1.42 + flourish * 0.36, 0.08];
    rightHand = [0.42 + flourish * 0.32, 1.94 - bow * 0.48, 0.22];
  } else if (performance.motif === 'pipe-tap') {
    const tap = Math.max(0, beat); const answer = Math.max(0, -beat);
    bounce += (tap + answer) * 0.07 * intensity;
    hipX = alternate * 0.18 * intensity; chestX = -alternate * 0.25 * intensity;
    chestZ = tap * 0.1; headX += -alternate * 0.18; headZ = answer * 0.08;
    leftFootX = -0.28 - tap * 0.12; rightFootX = 0.28 + answer * 0.12;
    leftFootZ = tap * 0.36 - answer * 0.18; rightFootZ = answer * 0.36 - tap * 0.18;
    leftFootY += tap * 0.16; rightFootY += answer * 0.16;
    leftHand = [-0.58 - answer * 0.28, 1.14 + tap * 0.48, 0.38];
    rightHand = [0.58 + tap * 0.28, 1.14 + answer * 0.48, 0.38];
  } else if (performance.motif === 'toxic-toe') {
    const toe = Math.max(0, beat); const recoil = Math.max(0, -beat);
    bounce += (toe + recoil) * 0.09 * intensity;
    hipX = -alternate * 0.2 * intensity; chestX = alternate * 0.28 * intensity;
    chestZ = -recoil * 0.14; headX += alternate * 0.22; headZ = toe * 0.12;
    leftFootX = -0.3 + recoil * 0.18; rightFootX = 0.3 - toe * 0.18;
    leftFootZ = toe * 0.46; rightFootZ = recoil * 0.46;
    leftFootY += toe * 0.2; rightFootY += recoil * 0.2;
    leftHand = [-0.86 - toe * 0.2, 1.48 + recoil * 0.32, 0.18];
    rightHand = [0.86 + recoil * 0.2, 1.48 + toe * 0.32, 0.18];
  } else if (performance.motif === 'flame-lick') {
    const stamp = Math.max(0, beat); const clap = Math.max(0, -beat);
    bounce += stamp * 0.11 * intensity;
    hipX = alternate * 0.24 * intensity; chestX = -alternate * 0.32 * intensity;
    chestZ = stamp * 0.15; headX += -alternate * 0.24; headZ = -clap * 0.1;
    leftFootX = -0.34 - clap * 0.15; rightFootX = 0.34 + stamp * 0.15;
    leftFootZ = clap * 0.24; rightFootZ = stamp * 0.24;
    leftFootY += clap * 0.22; rightFootY += stamp * 0.22;
    leftHand = [-1.02, 1.18 + stamp * 0.62, 0.16 + clap * 0.24];
    rightHand = [1.02, 1.18 + clap * 0.62, 0.16 + stamp * 0.24];
  } else if (performance.motif === 'pressure-step') {
    const pump = Math.max(0, beat); const release = Math.max(0, -beat);
    bounce += (pump * 0.08 + release * 0.04) * intensity;
    hipX = -alternate * 0.28 * intensity; chestX = alternate * 0.34 * intensity;
    chestZ = pump * 0.18 - release * 0.08; headX += -alternate * 0.2; headZ = pump * 0.1;
    leftFootX = -0.3 - pump * 0.2; rightFootX = 0.3 + release * 0.2;
    leftFootZ = release * 0.34; rightFootZ = pump * 0.34;
    leftFootY += release * 0.18; rightFootY += pump * 0.18;
    leftHand = [-0.72 - pump * 0.34, 1.74 + release * 0.2, 0.3];
    rightHand = [0.72 + release * 0.34, 1.04 + pump * 0.48, 0.34];
  } else if (performance.motif === 'duelling-tango') {
    const lunge = Math.max(0, beat); const retreat = Math.max(0, -beat);
    bounce += (lunge + retreat) * 0.055 * intensity;
    hipX = alternate * 0.34 * intensity; chestX = -alternate * 0.4 * intensity;
    chestZ = lunge * 0.24 - retreat * 0.12; headX += alternate * 0.28; headZ = -lunge * 0.08;
    leftFootX = -0.42 + retreat * 0.16; rightFootX = 0.42 - lunge * 0.16;
    leftFootZ = retreat * 0.5; rightFootZ = lunge * 0.5;
    leftFootY += retreat * 0.12; rightFootY += lunge * 0.12;
    leftHand = [-1.04, 1.82 - lunge * 0.36, 0.18 + retreat * 0.3];
    rightHand = [1.04, 1.1 + lunge * 0.64, 0.42];
  } else if (performance.motif === 'detonator-danzon') {
    const fuse = Math.max(0, beat); const recoil = Math.max(0, -beat);
    bounce += (fuse * 0.07 + recoil * 0.11) * intensity;
    hipX = -alternate * 0.3 * intensity; chestX = alternate * 0.38 * intensity;
    chestZ = fuse * 0.2 - recoil * 0.2; headX += -alternate * 0.3; headZ = recoil * 0.12;
    leftFootX = -0.38 - fuse * 0.18; rightFootX = 0.38 + recoil * 0.18;
    leftFootZ = recoil * 0.44; rightFootZ = fuse * 0.44;
    leftFootY += recoil * 0.18; rightFootY += fuse * 0.18;
    leftHand = [-0.9 - fuse * 0.22, 1.1 + recoil * 0.6, 0.42];
    rightHand = [0.9 + recoil * 0.22, 1.72 - fuse * 0.5, 0.2];
  } else if (performance.motif === 'drainpipe-rumba') {
    const climb = Math.max(0, beat); const dip = Math.max(0, -beat);
    bounce += (climb * 0.12 + dip * 0.04) * intensity;
    hipX = alternate * 0.32 * intensity; chestX = -alternate * 0.36 * intensity;
    chestZ = climb * 0.16 - dip * 0.14; headX += alternate * 0.24; headZ = climb * 0.1;
    leftFootX = -0.34 + dip * 0.18; rightFootX = 0.34 - climb * 0.18;
    leftFootZ = dip * 0.38; rightFootZ = climb * 0.52;
    leftFootY += dip * 0.14; rightFootY += climb * 0.28;
    leftHand = [-0.74 - dip * 0.24, 1.78 + climb * 0.28, 0.24];
    rightHand = [0.74 + climb * 0.24, 1.02 + dip * 0.42, 0.38];
  } else if (performance.motif === 'triple-key-cha-cha') {
    const cha = Math.max(0, beat); const lock = Math.max(0, -beat);
    const triple = Math.sin(performanceTime * Math.PI * 6);
    bounce += (cha * 0.08 + Math.abs(triple) * 0.035) * intensity;
    hipX = (alternate * 0.28 + triple * 0.09) * intensity;
    chestX = (-alternate * 0.35 - triple * 0.07) * intensity;
    chestZ = cha * 0.14 - lock * 0.09; headX += alternate * 0.26; headZ = triple * 0.07;
    leftFootX = -0.34 - Math.max(0, triple) * 0.18;
    rightFootX = 0.34 + Math.max(0, -triple) * 0.18;
    leftFootZ = lock * 0.32 + Math.max(0, triple) * 0.2;
    rightFootZ = cha * 0.38 + Math.max(0, -triple) * 0.2;
    leftFootY += lock * 0.16 + Math.max(0, triple) * 0.1;
    rightFootY += cha * 0.18 + Math.max(0, -triple) * 0.1;
    leftHand = [-0.88 - cha * 0.2, 1.14 + lock * 0.58, 0.34];
    rightHand = [0.88 + lock * 0.2, 1.72 - cha * 0.42, 0.18];
  } else if (performance.motif === 'feverish-salsa') {
    const flare = Math.max(0, beat); const shiver = Math.max(0, -beat);
    const fever = Math.sin(performanceTime * Math.PI * 8);
    bounce += (flare * 0.1 + Math.abs(fever) * 0.045) * intensity;
    hipX = (alternate * 0.38 + fever * 0.12) * intensity;
    chestX = (-alternate * 0.44 - fever * 0.08) * intensity;
    chestZ = flare * 0.2 - shiver * 0.14; headX += alternate * 0.32; headZ = fever * 0.1;
    leftFootX = -0.4 - Math.max(0, fever) * 0.2; rightFootX = 0.4 + Math.max(0, -fever) * 0.2;
    leftFootZ = shiver * 0.42 + Math.max(0, fever) * 0.26;
    rightFootZ = flare * 0.5 + Math.max(0, -fever) * 0.26;
    leftFootY += shiver * 0.18 + Math.max(0, fever) * 0.12;
    rightFootY += flare * 0.22 + Math.max(0, -fever) * 0.12;
    leftHand = [-1.02 - flare * 0.18, 1.2 + shiver * 0.62, 0.38];
    rightHand = [1.02 + shiver * 0.18, 1.84 - flare * 0.5, 0.22];
  } else if (performance.motif === 'inferno-flamenco-finale') {
    const blaze = Math.max(0, beat); const smolder = Math.max(0, -beat);
    const castanet = Math.sin(performanceTime * Math.PI * 10);
    bounce += (blaze * 0.13 + Math.abs(castanet) * 0.035) * intensity;
    hipX = (alternate * 0.42 + castanet * 0.08) * intensity;
    chestX = (-alternate * 0.48 - castanet * 0.1) * intensity;
    chestZ = blaze * 0.26 - smolder * 0.16; headX += alternate * 0.36; headZ = -blaze * 0.1;
    leftFootX = -0.46 - blaze * 0.18; rightFootX = 0.46 + smolder * 0.18;
    leftFootZ = smolder * 0.52; rightFootZ = blaze * 0.62;
    leftFootY += smolder * 0.22; rightFootY += blaze * 0.3;
    leftHand = [-1.18 - blaze * 0.22, 1.9 + smolder * 0.18, 0.16];
    rightHand = [1.18 + smolder * 0.22, 1.08 + blaze * 0.78, 0.4];
  } else if (performance.motif === 'chilly-funk-walk') {
    const glide = Math.max(0, beat); const brake = Math.max(0, -beat);
    const chatter = Math.sin(performanceTime * Math.PI * 5);
    bounce += (glide * 0.035 + Math.abs(chatter) * 0.025) * intensity;
    hipX = (alternate * 0.34 + chatter * 0.055) * intensity;
    chestX = (-alternate * 0.42 - chatter * 0.04) * intensity;
    chestZ = glide * 0.16 - brake * 0.2; headX += alternate * 0.28; headZ = chatter * 0.055;
    leftFootX = -0.38 - glide * 0.18; rightFootX = 0.38 + brake * 0.18;
    leftFootZ = brake * 0.64 - glide * 0.12; rightFootZ = glide * 0.64 - brake * 0.12;
    leftFootY += brake * 0.065; rightFootY += glide * 0.065;
    leftHand = [-0.94 - brake * 0.18, 1.5 + chatter * 0.18, 0.3];
    rightHand = [0.94 + glide * 0.18, 1.22 - chatter * 0.18, 0.36];
  } else if (performance.motif === 'ice-slide-moonwalk') {
    const moon = Math.sin(performanceTime * Math.PI * 2);
    const toe = Math.sin(performanceTime * Math.PI * 4 + Math.PI * 0.5);
    const glide = Math.max(0, moon); const retreat = Math.max(0, -moon);
    bounce += (Math.abs(toe) * 0.035 + glide * 0.025) * intensity;
    hipX = (alternate * 0.46 + toe * 0.06) * intensity;
    chestX = (-alternate * 0.5 - toe * 0.04) * intensity;
    chestZ = retreat * 0.24 - glide * 0.12; headX += alternate * 0.34; headZ = -toe * 0.08;
    leftFootX = -0.42 - retreat * 0.22; rightFootX = 0.42 + glide * 0.22;
    leftFootZ = glide * 0.24 - retreat * 0.72; rightFootZ = retreat * 0.24 - glide * 0.72;
    leftFootY += Math.max(0, toe) * 0.08; rightFootY += Math.max(0, -toe) * 0.08;
    leftHand = [-1.06 - retreat * 0.2, 1.1 + glide * 0.68, 0.42];
    rightHand = [1.06 + glide * 0.2, 1.72 - retreat * 0.5, 0.18];
  } else if (performance.motif === 'shield-pose-popping') {
    const lock = Math.max(0, Math.sin(performanceTime * Math.PI * 2));
    const release = Math.max(0, -Math.sin(performanceTime * Math.PI * 2));
    const pop = Math.sin(performanceTime * Math.PI * 8);
    bounce += (lock * 0.04 + Math.abs(pop) * 0.03) * intensity;
    hipX = (alternate * 0.28 + pop * 0.035) * intensity;
    chestX = (-alternate * 0.3 - pop * 0.05) * intensity;
    chestZ = -lock * 0.24 + release * 0.18; headX += alternate * 0.22; headZ = lock * 0.08;
    leftFootX = -0.5 - lock * 0.16; rightFootX = 0.5 + lock * 0.16;
    leftFootZ = release * 0.38; rightFootZ = -release * 0.38;
    leftFootY += Math.max(0, pop) * 0.08; rightFootY += Math.max(0, -pop) * 0.08;
    leftHand = [-1.2 - lock * 0.2, 1.46 + lock * 0.25, 0.48];
    rightHand = [0.66 + release * 0.42, 1.58 + pop * 0.12, 0.62];
  } else if (performance.motif === 'crystal-locking') {
    const lock = Math.sign(Math.sin(performanceTime * Math.PI * 4));
    const prism = Math.sin(performanceTime * Math.PI * 8);
    const sweep = Math.sin(performanceTime * Math.PI * 2);
    bounce += (Math.abs(prism) * 0.045 + Math.max(0, sweep) * 0.025) * intensity;
    hipX = (lock * 0.34 + prism * 0.045) * intensity;
    chestX = (-lock * 0.42 - prism * 0.055) * intensity;
    chestZ = -Math.abs(sweep) * 0.2; headX += lock * 0.3; headZ = -prism * 0.07;
    leftFootX = -0.46 - Math.max(0, -sweep) * 0.26;
    rightFootX = 0.46 + Math.max(0, sweep) * 0.26;
    leftFootZ = sweep * 0.42; rightFootZ = -sweep * 0.42;
    leftFootY += Math.max(0, prism) * 0.09; rightFootY += Math.max(0, -prism) * 0.09;
    leftHand = [-0.78 - lock * 0.36, 1.72 + prism * 0.12, 0.62];
    rightHand = [0.78 - lock * 0.36, 1.12 - prism * 0.12, 0.68];
  }
  setLocal(result, BODY_POINT.hip, rootX, rootZ, heading, hipX * scale, (0.76 + bounce) * scale, 0);
  setLocal(result, BODY_POINT.chest, rootX, rootZ, heading, chestX * scale, (1.36 + bounce) * scale, chestZ * scale);
  setLocal(result, BODY_POINT.head, rootX, rootZ, heading, headX * scale, (1.86 + bounce) * scale, headZ);
  setLocal(result, BODY_POINT.leftElbow, rootX, rootZ, heading, leftElbow[0] * scale, (leftElbow[1] + bounce) * scale, leftElbow[2] * scale);
  setLocal(result, BODY_POINT.leftHand, rootX, rootZ, heading, leftHand[0] * scale, (leftHand[1] + bounce) * scale, leftHand[2] * scale);
  setLocal(result, BODY_POINT.rightElbow, rootX, rootZ, heading, rightElbow[0] * scale, (rightElbow[1] + bounce) * scale, rightElbow[2] * scale);
  setLocal(result, BODY_POINT.rightHand, rootX, rootZ, heading, rightHand[0] * scale, (rightHand[1] + bounce) * scale, rightHand[2] * scale);
  setLocal(result, BODY_POINT.leftKnee, rootX, rootZ, heading, leftKneeX * scale, (0.46 + bounce * 0.45) * scale, leftFootZ * 0.35 * scale);
  setLocal(result, BODY_POINT.leftFoot, rootX, rootZ, heading, leftFootX * scale, leftFootY * scale, leftFootZ * scale);
  setLocal(result, BODY_POINT.rightKnee, rootX, rootZ, heading, rightKneeX * scale, (0.46 + bounce * 0.45) * scale, rightFootZ * 0.35 * scale);
  setLocal(result, BODY_POINT.rightFoot, rootX, rootZ, heading, rightFootX * scale, rightFootY * scale, rightFootZ * scale);
  return result;
}

function pointDistance(positions: Float64Array, first: number, second: number): number {
  const a = first * 3;
  const b = second * 3;
  return Math.hypot(positions[b]! - positions[a]!, positions[b + 1]! - positions[a + 1]!, positions[b + 2]! - positions[a + 2]!);
}

export function createRobotBody(
  rootX: number, rootZ: number, heading: number, danceTime: number, definition: RobotDefinition,
  performance: LevelDancePerformance,
): RobotBodyState {
  const positions = targets(rootX, rootZ, heading, danceTime, definition, performance);
  const previous = positions.slice();
  const restLengths = new Float64Array(LINKS.length);
  for (let index = 0; index < LINKS.length; index += 1) {
    const link = LINKS[index]!;
    restLengths[index] = pointDistance(positions, link[0], link[1]);
  }
  return { positions, previous, restLengths };
}

function solveLink(
  body: RobotBodyState, first: number, second: number, restLength: number,
  lambda: number, inverseSubstepSecondsSquared: number,
): number {
  const a = first * 3;
  const b = second * 3;
  const dx = body.positions[b]! - body.positions[a]!;
  const dy = body.positions[b + 1]! - body.positions[a + 1]!;
  const dz = body.positions[b + 2]! - body.positions[a + 2]!;
  const distance = Math.max(0.00001, Math.hypot(dx, dy, dz));
  const compliance = 0.0000025;
  const alpha = compliance * inverseSubstepSecondsSquared;
  const deltaLambda = (-(distance - restLength) - alpha * lambda) / (2 + alpha);
  const normalX = dx / distance;
  const normalY = dy / distance;
  const normalZ = dz / distance;
  body.positions[a] = body.positions[a]! - normalX * deltaLambda;
  body.positions[a + 1] = body.positions[a + 1]! - normalY * deltaLambda;
  body.positions[a + 2] = body.positions[a + 2]! - normalZ * deltaLambda;
  body.positions[b] = body.positions[b]! + normalX * deltaLambda;
  body.positions[b + 1] = body.positions[b + 1]! + normalY * deltaLambda;
  body.positions[b + 2] = body.positions[b + 2]! + normalZ * deltaLambda;
  return lambda + deltaLambda;
}

function solveMotor(body: RobotBodyState, target: Float64Array, point: number, stiffness: number): void {
  const offset = point * 3;
  body.positions[offset] = body.positions[offset]! + (target[offset]! - body.positions[offset]!) * stiffness;
  body.positions[offset + 1] = body.positions[offset + 1]! + (target[offset + 1]! - body.positions[offset + 1]!) * stiffness;
  body.positions[offset + 2] = body.positions[offset + 2]! + (target[offset + 2]! - body.positions[offset + 2]!) * stiffness;
}

export function stepRobotBody(
  robot: RobotState, definition: RobotDefinition, performance: LevelDancePerformance,
): void {
  const body = robot.body;
  const target = targets(robot.x, robot.z, robot.heading, robot.danceTime, definition, performance);
  const substepSeconds = FIXED_DT_SECONDS / XPBD_SUBSTEPS;
  const inverseSubstepSecondsSquared = 1 / (substepSeconds * substepSeconds);
  for (let substep = 0; substep < XPBD_SUBSTEPS; substep += 1) {
    const linkLambdas = new Float64Array(LINKS.length);
    for (let point = 0; point < BODY_POINT_COUNT; point += 1) {
      const offset = point * 3;
      const x = body.positions[offset]!;
      const y = body.positions[offset + 1]!;
      const z = body.positions[offset + 2]!;
      body.positions[offset] = x + (x - body.previous[offset]!) * 0.91;
      body.positions[offset + 1] = y + (y - body.previous[offset + 1]!) * 0.91 - 4.2 * substepSeconds * substepSeconds;
      body.positions[offset + 2] = z + (z - body.previous[offset + 2]!) * 0.91;
      body.previous[offset] = x;
      body.previous[offset + 1] = y;
      body.previous[offset + 2] = z;
    }
    for (let iteration = 0; iteration < XPBD_ITERATIONS; iteration += 1) {
      for (let linkIndex = 0; linkIndex < LINKS.length; linkIndex += 1) {
        const link = LINKS[linkIndex]!;
        linkLambdas[linkIndex] = solveLink(
          body, link[0], link[1], body.restLengths[linkIndex]!, linkLambdas[linkIndex]!, inverseSubstepSecondsSquared,
        );
      }
      for (let point = 0; point < BODY_POINT_COUNT; point += 1) {
        const stiffness = point === BODY_POINT.hip || point === BODY_POINT.chest ? 0.34 : 0.16;
        solveMotor(body, target, point, stiffness);
        const yOffset = point * 3 + 1;
        body.positions[yOffset] = Math.max(0.07, body.positions[yOffset]!);
      }
    }
  }
}

export function applyRobotBodyImpulse(robot: RobotState, impulseX: number, impulseY: number, impulseZ: number): void {
  for (let point = 0; point < BODY_POINT_COUNT; point += 1) {
    const offset = point * 3;
    const weight = point === BODY_POINT.hip ? 0.45 : 0.8 + point * 0.025;
    robot.body.previous[offset] = robot.body.previous[offset]! - impulseX * weight;
    robot.body.previous[offset + 1] = robot.body.previous[offset + 1]! - impulseY * weight;
    robot.body.previous[offset + 2] = robot.body.previous[offset + 2]! - impulseZ * weight;
  }
}

export function readBodyPoint(body: RobotBodyState, point: number): { x: number; y: number; z: number } {
  const offset = point * 3;
  return { x: body.positions[offset]!, y: body.positions[offset + 1]!, z: body.positions[offset + 2]! };
}
