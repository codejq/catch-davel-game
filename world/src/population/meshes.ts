import * as THREE from 'three';
import type { Civilian } from './civilians';
import type { PicnicPlan } from './placement';

const materials = new Map<number, THREE.MeshStandardMaterial>();
function paint(color: number, roughness = 0.8): THREE.MeshStandardMaterial {
  const key = color * 10 + Math.round(roughness * 9);
  let material = materials.get(key);
  if (material === undefined) { material = new THREE.MeshStandardMaterial({ color, roughness }); materials.set(key, material); }
  return material;
}
const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.3 });
const cheekMaterial = new THREE.MeshStandardMaterial({ color: 0xf08f8a, roughness: 0.9, transparent: true, opacity: 0.55 });

function box(width: number, height: number, depth: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}
function ball(radius: number, material: THREE.Material, x = 0, y = 0, z = 0, segments = 12): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(6, segments - 4)), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}
function limb(radius: number, length: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, length, 8), material);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  return mesh;
}

export interface PersonRig {
  readonly root: THREE.Group;
  readonly hips: THREE.Group;
  readonly torso: THREE.Group;
  readonly head: THREE.Group;
  readonly legs: readonly [{ hip: THREE.Group; knee: THREE.Group }, { hip: THREE.Group; knee: THREE.Group }];
  readonly arms: readonly [{ shoulder: THREE.Group; elbow: THREE.Group }, { shoulder: THREE.Group; elbow: THREE.Group }];
  readonly food: THREE.Mesh;
}

export interface DogRig {
  readonly root: THREE.Group;
  readonly body: THREE.Group;
  readonly head: THREE.Group;
  readonly tail: THREE.Group;
  readonly legs: readonly THREE.Group[];
}

/** A friendly, clearly unarmed civilian in bright everyday clothes: round face, smile-rosy cheeks, children smaller with bigger heads. */
export function createPersonRig(civilian: Civilian): PersonRig {
  const { look } = civilian;
  const skin = paint(look.skin, 0.7);
  const shirt = paint(look.shirt, 0.85);
  const pants = paint(look.pants, 0.9);
  const shoes = paint(look.shoes, 0.6);
  const hair = paint(look.hair, 0.95);
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.92;
  root.add(hips);
  hips.add(box(0.34, 0.16, 0.2, pants));

  const legs = ([-1, 1] as const).map((side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, -0.04, 0);
    hip.add(limb(0.075, 0.44, pants));
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    knee.add(limb(0.065, 0.42, pants));
    knee.add(box(0.11, 0.08, 0.22, shoes, 0, -0.44, 0.04));
    hip.add(knee);
    hips.add(hip);
    return { hip, knee };
  }) as unknown as PersonRig['legs'];

  const torso = new THREE.Group();
  torso.position.y = 0.08;
  torso.add(box(0.38, 0.5, 0.22, shirt, 0, 0.25, 0));
  // A pocket and collar so the shirt reads as clothing, not armour.
  torso.add(box(0.1, 0.08, 0.01, paint(new THREE.Color(look.shirt).multiplyScalar(0.8).getHex()), 0.09, 0.36, 0.111));
  torso.add(box(0.2, 0.04, 0.2, paint(new THREE.Color(look.shirt).multiplyScalar(0.85).getHex()), 0, 0.5, 0));
  hips.add(torso);

  const arms = ([-1, 1] as const).map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.23, 0.46, 0);
    shoulder.add(limb(0.055, 0.3, shirt));
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    elbow.add(limb(0.048, 0.27, skin));
    elbow.add(ball(0.05, skin, 0, -0.3, 0, 8));
    shoulder.add(elbow);
    torso.add(shoulder);
    return { shoulder, elbow };
  }) as unknown as PersonRig['arms'];

  const head = new THREE.Group();
  head.position.y = 0.52;
  head.add(limb(0.05, 0.08, skin).translateY(0.1));
  const face = ball(0.12, skin, 0, 0.16, 0, 16);
  face.scale.set(0.95, 1.08, 0.98);
  head.add(face);
  for (const side of [-1, 1] as const) {
    head.add(ball(0.016, eyeMaterial, side * 0.042, 0.18, 0.108, 8));
    head.add(ball(0.024, cheekMaterial, side * 0.07, 0.13, 0.095, 8));
  }
  // Smile.
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 4, 10, Math.PI), eyeMaterial);
  smile.position.set(0, 0.12, 0.112);
  smile.rotation.z = Math.PI;
  head.add(smile);
  const cap = ball(0.128, hair, 0, 0.2, -0.012, 14);
  cap.scale.set(1, 0.75, 1.02);
  head.add(cap);
  if (look.longHair) head.add(box(0.22, 0.24, 0.07, hair, 0, 0.1, -0.1));
  torso.add(head);

  // Something to eat, held while dining.
  const food = ball(0.045, paint(civilian.family % 2 === 0 ? 0xd94030 : 0xe0b060, 0.6), 0, -0.34, 0.05, 8);
  food.visible = false;
  arms[1].elbow.add(food);

  if (civilian.kind === 'child') {
    root.scale.setScalar(0.64);
    head.scale.setScalar(1.3);
  }
  return { root, hips, torso, head, legs, arms, food };
}

export function createDogRig(civilian: Civilian): DogRig {
  const coat = paint(civilian.look.skin, 0.95);
  const patch = paint(civilian.look.hair, 0.95);
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.42;
  const torso = box(0.26, 0.24, 0.62, coat);
  body.add(torso);
  body.add(box(0.2, 0.05, 0.3, patch, 0, 0.12, -0.05));
  root.add(body);
  const legs = [[-0.09, 0.22], [0.09, 0.22], [-0.09, -0.22], [0.09, -0.22]].map(([x, z]) => {
    const leg = new THREE.Group();
    leg.position.set(x!, -0.08, z!);
    leg.add(limb(0.04, 0.34, coat));
    body.add(leg);
    return leg;
  });
  const head = new THREE.Group();
  head.position.set(0, 0.16, 0.34);
  head.add(box(0.2, 0.2, 0.2, coat, 0, 0.02, 0));
  head.add(box(0.12, 0.1, 0.16, patch, 0, -0.04, 0.14));
  head.add(ball(0.025, eyeMaterial, 0, -0.02, 0.23, 6));
  for (const side of [-1, 1] as const) {
    head.add(ball(0.018, eyeMaterial, side * 0.06, 0.06, 0.1, 6));
    const ear = box(0.06, civilian.look.longHair ? 0.14 : 0.1, 0.03, patch, side * 0.1, civilian.look.longHair ? 0.02 : 0.14, -0.02);
    head.add(ear);
  }
  // Collar in a cheerful colour.
  head.add(box(0.22, 0.04, 0.22, paint(civilian.look.shirt, 0.6), 0, -0.1, -0.06));
  body.add(head);
  const tail = new THREE.Group();
  tail.position.set(0, 0.08, -0.31);
  const tip = limb(0.025, 0.22, coat);
  tail.add(tip);
  tail.rotation.x = -2.3;
  body.add(tail);
  return { root, body, head, tail, legs };
}

/** A wooden picnic table with benches, plates of food, a jug, and a bowl of fruit. */
export function createPicnic(plan: PicnicPlan): THREE.Group {
  const group = new THREE.Group();
  const wood = paint(0x9a6a3e, 0.85);
  const cloth = paint(0xd94a4a, 0.9);
  group.add(box(0.9, 0.05, 2.0, wood, 0, 0.74, 0));
  group.add(box(0.92, 0.01, 2.02, cloth, 0, 0.77, 0));
  for (const [x, z] of [[-0.35, -0.85], [0.35, -0.85], [-0.35, 0.85], [0.35, 0.85]] as const) group.add(box(0.06, 0.74, 0.06, wood, x, 0.37, z));
  for (const side of [-1, 1] as const) {
    group.add(box(0.3, 0.05, 2.0, wood, side * 0.72, 0.44, 0));
    group.add(box(0.05, 0.44, 0.05, wood, side * 0.72, 0.22, -0.8));
    group.add(box(0.05, 0.44, 0.05, wood, side * 0.72, 0.22, 0.8));
  }
  const plate = paint(0xf4f4f0, 0.4);
  const foods = [0xd94030, 0xe0b060, 0x6cbf4a, 0xf2d06b, 0xb5642e];
  for (let index = 0; index < 4; index += 1) {
    const side = index % 2 === 0 ? 1 : -1;
    const z = (Math.floor(index / 2) - 0.5) * 0.75;
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.02, 14), plate);
    dish.position.set(side * 0.25, 0.79, z);
    group.add(dish);
    group.add(ball(0.05, paint(foods[index % foods.length]!, 0.6), side * 0.25, 0.83, z, 8));
  }
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.1, 14), paint(0x5a8ad0, 0.5));
  bowl.position.set(0, 0.83, 0);
  group.add(bowl);
  for (let index = 0; index < 5; index += 1) group.add(ball(0.045, paint(foods[index]!, 0.6), Math.cos(index * 1.3) * 0.07, 0.9, Math.sin(index * 1.3) * 0.07, 8));
  const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.2, 10), paint(0xf2a93b, 0.4));
  jug.position.set(0.1, 0.87, 0.55);
  group.add(jug);
  group.position.set(plan.x, plan.y, plan.z);
  // The table's length runs along `heading`'s perpendicular so the benches face across it.
  group.rotation.y = plan.heading + Math.PI / 2;
  return group;
}

/** Poses a person from their state: walking, running with arms up, sitting and eating, cowering, or fallen. */
export function posePerson(rig: PersonRig, civilian: Civilian, time: number): void {
  const { root, hips, torso, head, legs, arms } = rig;
  root.position.set(civilian.position.x, civilian.position.y, civilian.position.z);
  root.rotation.set(0, civilian.heading, 0);
  const moving = Math.min(1, civilian.speed / 1.3);
  const running = civilian.speed > 2.2 ? 1 : 0;
  const phase = civilian.walkPhase;
  const swing = Math.sin(phase) * (0.45 + running * 0.35) * moving;
  hips.position.y = 0.92 - Math.abs(Math.cos(phase)) * 0.03 * moving;
  hips.rotation.set(0, 0, 0);
  torso.rotation.set(running * 0.25, 0, 0);
  head.rotation.set(-running * 0.15, 0, 0);
  rig.food.visible = false;
  legs[0].hip.rotation.x = swing; legs[1].hip.rotation.x = -swing;
  legs[0].knee.rotation.x = Math.max(0, -Math.sin(phase)) * (0.6 + running * 0.6) * moving;
  legs[1].knee.rotation.x = Math.max(0, Math.sin(phase)) * (0.6 + running * 0.6) * moving;
  arms[0].shoulder.rotation.set(-swing * 0.8, 0, 0.08); arms[1].shoulder.rotation.set(swing * 0.8, 0, -0.08);
  arms[0].elbow.rotation.x = -0.25 - running * 0.9; arms[1].elbow.rotation.x = -0.25 - running * 0.9;

  if (civilian.mode === 'dead') {
    const fall = Math.min(1, civilian.deathTime / 0.7);
    root.rotation.x = -fall * fall * Math.PI / 2;
    root.position.y = civilian.position.y + fall * 0.1;
    return;
  }
  if (civilian.mode === 'hide') {
    // Crouched low with hands over the head.
    hips.position.y = 0.48;
    for (const leg of legs) { leg.hip.rotation.x = -1.4; leg.knee.rotation.x = 2.1; }
    torso.rotation.x = 0.55;
    for (const [index, arm] of arms.entries()) { arm.shoulder.rotation.set(-2.6, 0, index === 0 ? 0.5 : -0.5); arm.elbow.rotation.x = -1.8; }
    head.rotation.set(0.3 + Math.sin(time * 9) * 0.03, 0, 0);
    return;
  }
  if (civilian.mode === 'flee' && running) {
    // Panicked: one arm flung up.
    arms[1].shoulder.rotation.set(-2.4 + Math.sin(time * 12) * 0.2, 0, -0.3);
    return;
  }
  const seated = civilian.mode === 'calm' && civilian.activity === 'eat' && civilian.seat !== null && moving < 0.2;
  if (seated) {
    hips.position.y = 0.48;
    for (const leg of legs) { leg.hip.rotation.x = -1.5; leg.knee.rotation.x = 1.5; }
    // Bring food to the mouth every few seconds, chat and laugh in between.
    const bite = Math.max(0, Math.sin(time * 1.3 + civilian.walkPhase));
    arms[1].shoulder.rotation.set(-0.6 - bite * 1.3, 0, -0.1);
    arms[1].elbow.rotation.x = -0.9 - bite * 1.2;
    arms[0].shoulder.rotation.set(-0.7, 0, 0.1);
    arms[0].elbow.rotation.x = -0.9;
    rig.food.visible = true;
    head.rotation.set(Math.sin(time * 2.1 + civilian.cheer * 5) * 0.08, Math.sin(time * 0.6 + civilian.cheer * 9) * 0.35, 0);
    torso.rotation.x = Math.sin(time * 3 + civilian.cheer * 7) * 0.03 * civilian.cheer;
    return;
  }
  if (moving < 0.2) {
    // Standing: breathing, looking about, and cheerful ones wave and bob.
    hips.position.y = 0.92 + Math.max(0, Math.sin(time * 5 + civilian.cheer * 11)) * 0.03 * civilian.cheer;
    head.rotation.set(0, Math.sin(time * 0.5 + civilian.cheer * 3) * 0.5, 0);
    if (civilian.cheer > 0.55) {
      arms[1].shoulder.rotation.set(-2.7, 0, -0.35 + Math.sin(time * 6 + civilian.cheer * 4) * 0.35);
      arms[1].elbow.rotation.x = -0.4;
    }
  }
}

export function poseDog(rig: DogRig, dog: Civilian, time: number): void {
  const { root, body, head, tail, legs } = rig;
  root.position.set(dog.position.x, dog.position.y, dog.position.z);
  root.rotation.set(0, dog.heading, 0);
  const moving = Math.min(1, dog.speed / 1.2);
  const phase = dog.walkPhase;
  legs.forEach((leg, index) => { leg.rotation.x = Math.sin(phase + (index % 2 === 0 ? 0 : Math.PI) + (index > 1 ? 0.8 : 0)) * 0.7 * moving; });
  body.position.y = 0.42 + Math.abs(Math.sin(phase)) * 0.04 * moving;
  body.rotation.set(0, 0, 0);
  head.rotation.set(Math.sin(time * 2) * 0.05, Math.sin(time * 0.8) * 0.3 * (1 - moving), 0);
  // Happy dogs wag; frightened ones tuck the tail.
  tail.rotation.set(dog.mode === 'calm' ? -2.3 : -0.6, Math.sin(time * (dog.mode === 'calm' ? 14 : 3)) * (dog.mode === 'calm' ? 0.6 : 0.1), 0);
  if (dog.mode === 'dead') {
    const fall = Math.min(1, dog.deathTime / 0.5);
    root.rotation.z = fall * Math.PI / 2;
    root.position.y = dog.position.y + 0.1 * fall;
    return;
  }
  if (dog.mode === 'hide' || (dog.mode === 'calm' && moving < 0.1 && Math.sin(time * 0.2 + dog.walkPhase) > 0.3)) {
    // Sitting (or cowering) with the back end down.
    body.rotation.x = -0.45;
    body.position.y = 0.34;
    legs[2]!.rotation.x = 1.2; legs[3]!.rotation.x = 1.2;
  }
}
