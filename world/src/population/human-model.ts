import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Realistically proportioned, fully animated people from Quaternius's CC0 "Universal Base Characters" and
 * "Universal Animation Library" (built into public/models by scripts/build-characters.mjs). The base bodies come
 * without clothes, so each person is dressed by a shader that paints shirt, trousers, shoes, gloves, or
 * camouflage onto the body by region (measured on the rest pose), keeping the sculpted folds underneath.
 * Helmets, vests, guns, and hair ride on the skeleton's bones.
 */
export type BodyKind = 'male' | 'female';
export type HairStyle = 'Hair_SimpleParted' | 'Hair_Long' | 'Hair_Buns' | 'Hair_Buzzed' | 'Hair_BuzzedFemale' | 'Hair_Beard';
export type ClipName = 'Idle_Loop' | 'Walk_Loop' | 'Jog_Fwd_Loop' | 'Sprint_Loop' | 'Death01' | 'Crouch_Idle_Loop' | 'Crouch_Fwd_Loop'
  | 'Sitting_Idle_Loop' | 'Idle_Talking_Loop' | 'Pistol_Aim_Neutral' | 'Pistol_Shoot' | 'Hit_Chest';

/** Ground speed (m/s) each moving clip was animated at, so feet don't slide when played at other speeds. */
export const CLIP_SPEED: Partial<Record<ClipName, number>> = { Walk_Loop: 1.35, Jog_Fwd_Loop: 3.3, Sprint_Loop: 5.6, Crouch_Fwd_Loop: 1.1 };

export interface Outfit {
  /** Multiplies the (medium-brown) skin texture: below 1 darker, above 1 lighter. */
  readonly skin: number;
  readonly shirt: number;
  readonly pants: number;
  readonly shoes: number;
  readonly sleeves: 'long' | 'short';
  readonly legs: 'long' | 'shorts';
  /** Three-colour camouflage over shirt and trousers (soldiers). */
  readonly camo?: readonly [number, number, number];
  readonly gloves?: number;
}

interface Assets {
  readonly bodies: Record<BodyKind, THREE.Group>;
  readonly hair: THREE.Group;
  readonly clips: Map<string, THREE.AnimationClip>;
}

let assets: Assets | null = null;
let loading: Promise<Assets | null> | null = null;

export function loadHumans(): Promise<Assets | null> {
  loading ??= (async () => {
    const loader = new GLTFLoader();
    const [male, female, hair, anims] = await Promise.all(['human-male', 'human-female', 'human-hair', 'human-anims'].map((name) => loader.loadAsync(`./models/${name}.glb`)));
    const clips = new Map(anims!.animations.map((clip) => [clip.name, clip]));
    assets = { bodies: { male: male!.scene, female: female!.scene }, hair: hair!.scene, clips };
    return assets;
  })().catch(() => null);
  return loading;
}

export function humansReady(): boolean { return assets !== null; }

const CLOTH_SHADER_KEY = 'zama-outfit-1';

/** A copy of the body material that paints the outfit on by body region. */
function dress(base: THREE.MeshStandardMaterial, outfit: Outfit, height: number): THREE.MeshStandardMaterial {
  const material = base.clone();
  const camo = outfit.camo ?? [outfit.shirt, outfit.shirt, outfit.shirt];
  const uniforms = {
    uShirt: { value: new THREE.Color(outfit.shirt) }, uPants: { value: new THREE.Color(outfit.pants) }, uShoes: { value: new THREE.Color(outfit.shoes) },
    uGloves: { value: new THREE.Color(outfit.gloves ?? 0) }, uGloveOn: { value: outfit.gloves === undefined ? 0 : 1 },
    uCamoA: { value: new THREE.Color(camo[0]) }, uCamoB: { value: new THREE.Color(camo[1]) }, uCamoC: { value: new THREE.Color(camo[2]) }, uCamoOn: { value: outfit.camo === undefined ? 0 : 1 },
    uSkin: { value: outfit.skin }, uSleeveEnd: { value: outfit.sleeves === 'long' ? 0.67 : 0.4 }, uPantsEnd: { value: outfit.legs === 'long' ? 0.1 : 0.5 },
    uScale: { value: 1.81 / height },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec3 vRest;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vRest = position;');
    shader.fragmentShader = `varying vec3 vRest;
uniform vec3 uShirt, uPants, uShoes, uGloves, uCamoA, uCamoB, uCamoC;
uniform float uGloveOn, uCamoOn, uSkin, uSleeveEnd, uPantsEnd, uScale;
float clothHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float clothNoise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(clothHash(i), clothHash(i + vec3(1,0,0)), f.x), mix(clothHash(i + vec3(0,1,0)), clothHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(clothHash(i + vec3(0,0,1)), clothHash(i + vec3(1,0,1)), f.x), mix(clothHash(i + vec3(0,1,1)), clothHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
${shader.fragmentShader}`.replace('#include <map_fragment>', `#include <map_fragment>
  {
    vec3 r = vRest * uScale;
    float ax = abs(r.x);
    bool arm = ax > 0.24 && r.y > 1.28;
    float shade = 0.72 + 0.5 * dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 cloth = vec3(-1.0);
    if (arm) {
      if (ax < uSleeveEnd) cloth = uShirt;
      else if (ax > 0.66 && uGloveOn > 0.5) cloth = uGloves;
    } else if (r.y >= 0.95 && (r.y < 1.49 || (r.y < 1.58 && ax > 0.085))) {
      cloth = uShirt;
    } else if (r.y < 0.95) {
      if (r.y < 0.11) cloth = uShoes;
      else if (r.y > uPantsEnd) cloth = r.y > 0.9 ? uPants * 0.55 : uPants;
    }
    if (cloth.r >= 0.0) {
      if (uCamoOn > 0.5 && cloth != uShoes && cloth != uGloves) {
        float n = clothNoise(r * 12.0) * 0.6 + clothNoise(r * 27.0) * 0.4;
        cloth = n < 0.42 ? uCamoA : n < 0.6 ? uCamoB : uCamoC;
      }
      diffuseColor.rgb = cloth * shade;
    } else {
      diffuseColor.rgb *= uSkin;
    }
  }`).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  { vec3 r = vRest * uScale; if (r.y < 1.5 && (abs(r.x) < uSleeveEnd || r.y < 1.28)) roughnessFactor = max(roughnessFactor, 0.9); }`)
    // Fabric hides most of the sculpted muscle detail: soften the normal map where clothed.
    .replace('#include <normal_fragment_maps>', `vec3 bareNormal = normal;
#include <normal_fragment_maps>
  {
    vec3 r = vRest * uScale; float ax = abs(r.x);
    bool arm = ax > 0.24 && r.y > 1.28;
    bool clothed = arm ? ax < uSleeveEnd : (r.y < 1.49 || (r.y < 1.58 && ax > 0.085)) && (r.y >= 0.95 || r.y > uPantsEnd || r.y < 0.11);
    if (clothed) normal = normalize(mix(normal, bareNormal, 0.7));
  }`);
  };
  material.customProgramCacheKey = () => CLOTH_SHADER_KEY;
  return material;
}

export interface HumanRig {
  readonly kind: 'human';
  readonly root: THREE.Group;
  /** The animated body (hidden when the far stand-in shows). */
  readonly body: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  readonly actions: Map<ClipName, THREE.AnimationAction>;
  current: ClipName | null;
  readonly gun: THREE.Group | null;
  readonly muzzle: THREE.Mesh | null;
  /** A small status light (soldiers' helmets) that shows their mood like the robots' visors. */
  readonly eyes: THREE.MeshStandardMaterial;
  readonly hairMaterial: THREE.MeshStandardMaterial | null;
  lastPhase: number;
}

export interface HumanOptions {
  readonly body: BodyKind;
  readonly outfit: Outfit;
  readonly hair?: HairStyle | null;
  readonly hairColor?: number;
  readonly beard?: boolean;
  /** Overall scale (children are smaller). */
  readonly scale?: number;
  readonly helmet?: number;
  readonly vest?: number;
  /** A carbine in the right hand. */
  readonly gun?: { readonly gun: THREE.Group; readonly muzzle: THREE.Mesh };
}

const hairMaterials = new Map<number, THREE.MeshStandardMaterial>();

function bone(root: THREE.Object3D, name: string): THREE.Object3D {
  return root.getObjectByName(name) ?? root;
}

/** Builds one person. `loadHumans()` must have finished; returns null if it failed. */
export function createHuman(options: HumanOptions): HumanRig | null {
  if (assets === null) return null;
  const body = cloneSkinned(assets.bodies[options.body]);
  const root = new THREE.Group();
  root.add(body);
  body.scale.setScalar(options.scale ?? 1);
  body.updateMatrixWorld(true);
  const height = options.body === 'male' ? 1.81 : 1.78;
  body.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    // Cull off-screen people with a sphere big enough for any pose (standing, crouched, or lying after a fall).
    if (object instanceof THREE.SkinnedMesh) object.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 2.1);
    const material = object.material as THREE.MeshStandardMaterial;
    if (/Superhero/.test(material.name)) object.material = dress(material, options.outfit, height);
  });
  // Everything worn is placed on the rest pose, then attached to its bone so it follows the animation.
  const head = bone(body, 'Head');
  const chest = bone(body, 'spine_03');
  const hand = bone(body, 'hand_r');
  let hairMaterial: THREE.MeshStandardMaterial | null = null;
  const wear = (object: THREE.Object3D, onto: THREE.Object3D): void => { body.add(object); object.updateMatrixWorld(true); onto.attach(object); };
  for (const style of [options.hair ?? null, options.beard === true ? 'Hair_Beard' : null]) {
    if (style === null) continue;
    const template = assets.hair.getObjectByName(style);
    if (template === undefined) continue;
    const piece = template.clone();
    const color = options.hairColor ?? 0x3a2a1c;
    let material = hairMaterials.get(color);
    piece.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (material === undefined) {
        material = (object.material as THREE.MeshStandardMaterial).clone();
        material.color.setHex(color);
        hairMaterials.set(color, material);
      }
      object.material = material;
      object.castShadow = true;
    });
    hairMaterial = material ?? null;
    wear(piece, head);
  }
  const eyes = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x33ddff, emissiveIntensity: 2, fog: false });
  if (options.helmet !== undefined) {
    const shell = new THREE.MeshStandardMaterial({ color: options.helmet, roughness: 0.85, metalness: 0.1 });
    const helmet = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.138, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), shell);
    dome.scale.set(1.02, 0.95, 1.1);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.146, 0.15, 0.018, 18), shell);
    brim.position.y = -0.035;
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), eyes);
    light.position.set(0.09, 0.07, 0.07);
    helmet.add(dome, brim, light);
    for (const mesh of [dome, brim]) mesh.castShadow = true;
    helmet.position.set(0, 1.745 * (height / 1.81), -0.01);
    wear(helmet, head);
  }
  if (options.vest !== undefined) {
    const vestMaterial = new THREE.MeshStandardMaterial({ color: options.vest, roughness: 0.9 });
    const vest = new THREE.Group();
    // A plate carrier: front and back plates hugging the chest, with magazine pouches.
    const plate = new THREE.CapsuleGeometry(0.13, 0.08, 4, 10).scale(1.2, 0.95, 0.28);
    for (const side of [1, -1] as const) {
      const mesh = new THREE.Mesh(plate, vestMaterial);
      mesh.position.set(0, 0, side * 0.115);
      vest.add(mesh);
    }
    for (let pouch = 0; pouch < 3; pouch += 1) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.1, 0.05), vestMaterial);
      mesh.position.set(-0.08 + pouch * 0.08, -0.06, 0.16);
      vest.add(mesh);
    }
    vest.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = true; });
    vest.position.set(0, 1.37 * (height / 1.81), 0.0);
    wear(vest, chest);
  }
  let gun: THREE.Group | null = null; let muzzle: THREE.Mesh | null = null;
  const mixer = new THREE.AnimationMixer(body);
  const actions = new Map<ClipName, THREE.AnimationAction>();
  for (const [name, clip] of assets.clips) actions.set(name as ClipName, mixer.clipAction(clip));
  if (options.gun !== undefined) {
    gun = options.gun.gun; muzzle = options.gun.muzzle;
    // Line the carbine up with the aiming pose: pointing straight ahead (+Z), grip in the right palm.
    const aim = actions.get('Pistol_Aim_Neutral');
    aim?.play(); mixer.update(0.4);
    body.updateMatrixWorld(true);
    const handQuaternion = hand.getWorldQuaternion(new THREE.Quaternion());
    const handScale = hand.getWorldScale(new THREE.Vector3()).x;
    const grip = hand.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(-0.01, 0.02, 0.05));
    hand.add(gun);
    gun.quaternion.copy(handQuaternion.invert());
    gun.position.copy(hand.worldToLocal(grip));
    gun.scale.setScalar(0.85 / handScale);
    aim?.stop();
    mixer.stopAllAction();
  }
  const rig: HumanRig = { kind: 'human', root, body, mixer, actions, current: null, gun, muzzle, eyes, hairMaterial, lastPhase: 0 };
  play(rig, 'Idle_Loop', { fade: 0 });
  mixer.update(Math.random() * 2);
  return rig;
}

/** Cross-fades to a clip (no-op if it is already playing); `rate` scales its speed. */
export function play(rig: HumanRig, name: ClipName, options: { fade?: number; rate?: number; once?: boolean } = {}): void {
  const action = rig.actions.get(name);
  if (action === undefined) return;
  action.timeScale = options.rate ?? 1;
  if (rig.current === name) return;
  const previous = rig.current === null ? null : rig.actions.get(rig.current) ?? null;
  action.reset();
  action.setLoop(options.once === true ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  action.clampWhenFinished = options.once === true;
  action.enabled = true;
  action.setEffectiveWeight(1);
  action.play();
  const fade = options.fade ?? 0.25;
  if (previous !== null && fade > 0) previous.crossFadeTo(action, fade, false);
  else if (previous !== null) previous.stop();
  rig.current = name;
}

/** The moving clip and its playback rate for a ground speed (m/s). */
export function gait(speed: number, crouched = false): { clip: ClipName; rate: number } {
  if (crouched) return speed < 0.15 ? { clip: 'Crouch_Idle_Loop', rate: 1 } : { clip: 'Crouch_Fwd_Loop', rate: THREE.MathUtils.clamp(speed / CLIP_SPEED.Crouch_Fwd_Loop!, 0.6, 1.8) };
  if (speed < 0.15) return { clip: 'Idle_Loop', rate: 1 };
  if (speed < 2.2) return { clip: 'Walk_Loop', rate: THREE.MathUtils.clamp(speed / CLIP_SPEED.Walk_Loop!, 0.6, 1.6) };
  if (speed < 4.6) return { clip: 'Jog_Fwd_Loop', rate: THREE.MathUtils.clamp(speed / CLIP_SPEED.Jog_Fwd_Loop!, 0.7, 1.4) };
  return { clip: 'Sprint_Loop', rate: THREE.MathUtils.clamp(speed / CLIP_SPEED.Sprint_Loop!, 0.7, 1.3) };
}
