import * as THREE from 'three';
import { texture, worldBox } from '../world/materials';

const gunmetal = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.5, metalness: 0.55, map: texture('metal') });
const woodStock = new THREE.MeshStandardMaterial({ color: 0x5a3b24, roughness: 0.55, map: texture('planks') });
const glove = new THREE.MeshStandardMaterial({ color: 0x1d1f1c, roughness: 0.9 });
const sleeve = new THREE.MeshStandardMaterial({ color: 0x3f4630, roughness: 0.95 });
const lens = new THREE.MeshStandardMaterial({ color: 0x1a3140, roughness: 0.02, metalness: 0.4, envMapIntensity: 2 });

function part(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/** First-person bolt-action rifle with scope, bipod, gloved hands, and sleeves. Units are metres, -Z forward. */
export function createRifleModel(): { group: THREE.Group; bolt: THREE.Group; magazine: THREE.Mesh; flash: THREE.Mesh } {
  const group = new THREE.Group();
  group.add(part(worldBox(0.05, 0.07, 0.34, 0.3), gunmetal, 0, 0, -0.02));
  group.add(part(worldBox(0.058, 0.09, 0.42, 0.3), woodStock, 0, -0.03, 0.34));
  group.add(part(worldBox(0.052, 0.12, 0.12, 0.3), woodStock, 0, -0.07, 0.52));
  group.add(part(worldBox(0.062, 0.06, 0.34, 0.3), woodStock, 0, -0.035, -0.3));
  const barrel = new THREE.CylinderGeometry(0.011, 0.014, 0.62, 16).rotateX(Math.PI / 2);
  group.add(part(barrel, gunmetal, 0, 0.004, -0.62));
  const brake = new THREE.CylinderGeometry(0.019, 0.019, 0.07, 16).rotateX(Math.PI / 2);
  group.add(part(brake, gunmetal, 0, 0.004, -0.95));
  // Scope: tube, bells, turrets, rings.
  group.add(part(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 20).rotateX(Math.PI / 2), gunmetal, 0, 0.075, -0.03));
  group.add(part(new THREE.CylinderGeometry(0.028, 0.019, 0.08, 20).rotateX(Math.PI / 2), gunmetal, 0, 0.075, -0.2));
  group.add(part(new THREE.CylinderGeometry(0.019, 0.024, 0.06, 20).rotateX(Math.PI / 2), gunmetal, 0, 0.075, 0.14));
  group.add(part(new THREE.CircleGeometry(0.026, 20).rotateY(Math.PI), lens, 0, 0.075, -0.241));
  group.add(part(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12), gunmetal, 0, 0.1, -0.03));
  group.add(part(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12).rotateZ(Math.PI / 2), gunmetal, 0.028, 0.075, -0.03));
  for (const z of [-0.1, 0.06]) group.add(part(worldBox(0.03, 0.05, 0.022, 0.2), gunmetal, 0, 0.045, z));
  const magazine = part(worldBox(0.036, 0.07, 0.07, 0.2), gunmetal, 0, -0.07, -0.04);
  group.add(magazine);
  group.add(part(worldBox(0.012, 0.035, 0.05, 0.2), gunmetal, 0, -0.06, 0.07));
  // Folded bipod.
  for (const side of [-1, 1] as const) {
    const leg = part(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 8).rotateX(Math.PI / 2), gunmetal, side * 0.02, -0.07, -0.52);
    group.add(leg);
  }
  const bolt = new THREE.Group();
  bolt.position.set(0.03, 0.02, 0.1);
  bolt.add(part(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8).rotateZ(Math.PI / 2), gunmetal, 0.035, 0, 0));
  bolt.add(part(new THREE.SphereGeometry(0.013, 10, 8), gunmetal, 0.07, 0, 0));
  group.add(bolt);
  // Hands and sleeves.
  const rightHand = part(worldBox(0.07, 0.08, 0.1, 0.2), glove, 0.01, -0.07, 0.2);
  rightHand.rotation.x = 0.35;
  group.add(rightHand);
  group.add(part(new THREE.CylinderGeometry(0.045, 0.055, 0.34, 12).rotateX(Math.PI / 2 - 0.35), sleeve, 0.05, -0.16, 0.38));
  const leftHand = part(worldBox(0.08, 0.06, 0.12, 0.2), glove, -0.01, -0.07, -0.34);
  group.add(leftHand);
  group.add(part(new THREE.CylinderGeometry(0.045, 0.055, 0.4, 12).rotateX(Math.PI / 2 - 0.5).rotateY(0.55), sleeve, -0.12, -0.2, -0.16));
  const flash = part(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0, depthWrite: false }), 0, 0.004, -1.02);
  flash.scale.set(1, 1, 2.5);
  group.add(flash);
  group.traverse((object) => { object.renderOrder = 10; });
  return { group, bolt, magazine, flash };
}
