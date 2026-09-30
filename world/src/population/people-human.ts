import * as THREE from 'three';
import type { Civilian } from './civilians';
import { createHuman, gait, humansReady, play, type ClipName, type HairStyle, type HumanRig } from './human-model';

/** How much lighter or darker than the base texture (a medium brown) each civilian's skin is. */
function skinFactor(skin: number): number {
  const color = new THREE.Color(skin);
  const luminance = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
  return THREE.MathUtils.clamp(luminance / 0.55, 0.55, 1.45);
}

/** A stable 0..1 number per civilian, for choices that must not change between rebuilds. */
function pick(civilian: Civilian, salt: number): number {
  let hash = salt * 977;
  for (let index = 0; index < civilian.id.length; index += 1) hash = (hash * 31 + civilian.id.charCodeAt(index)) >>> 0;
  return (hash % 1000) / 1000;
}

/** A civilian as a real animated person in their everyday colours, or null while the models are loading. */
export function createHumanCivilian(civilian: Civilian): HumanRig | null {
  if (!humansReady() || civilian.kind === 'dog') return null;
  const { look } = civilian;
  const child = civilian.kind === 'child';
  const female = look.longHair;
  const hairs: HairStyle[] = female ? ['Hair_Long', 'Hair_Buns', 'Hair_BuzzedFemale'] : ['Hair_SimpleParted', 'Hair_Buzzed'];
  const hair = hairs[Math.floor(pick(civilian, 1) * hairs.length)]!;
  return createHuman({
    body: female ? 'female' : 'male',
    outfit: {
      skin: skinFactor(look.skin), shirt: look.shirt, pants: look.pants, shoes: look.shoes,
      sleeves: civilian.cheer > 0.5 ? 'short' : 'long', legs: child || pick(civilian, 2) < 0.3 ? 'shorts' : 'long',
    },
    hair, hairColor: look.hair, beard: !female && !child && pick(civilian, 3) < 0.3, scale: child ? 0.62 : 1,
  });
}

/**
 * Plays the animation for what the civilian is doing: strolling, chatting (cheerful ones talk with their hands),
 * sitting at the picnic, running away, cowering in hiding, or falling when killed. `animate` is false for people
 * far from the player, who keep their last pose until they come closer.
 */
export function poseHumanCivilian(rig: HumanRig, civilian: Civilian, dt: number, animate: boolean): void {
  rig.root.position.set(civilian.position.x, civilian.position.y, civilian.position.z);
  rig.root.rotation.set(0, civilian.heading, 0);
  const scale = civilian.kind === 'child' ? 0.62 : 1;
  let clip: ClipName; let rate = 1; let once = false;
  if (civilian.mode === 'dead') { clip = 'Death01'; once = true; }
  else if (civilian.mode === 'hide') clip = 'Crouch_Idle_Loop';
  else if (civilian.mode === 'calm' && civilian.activity === 'eat' && civilian.seat !== null && civilian.speed < 0.2) clip = 'Sitting_Idle_Loop';
  else if (civilian.speed > 0.15) ({ clip, rate } = gait(civilian.speed / scale));
  else clip = civilian.cheer > 0.55 ? 'Idle_Talking_Loop' : 'Idle_Loop';
  play(rig, clip, { rate, once, fade: 0.25 });
  if (animate) rig.mixer.update(dt);
}
