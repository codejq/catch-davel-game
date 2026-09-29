import * as THREE from 'three';
import type { LootKind } from '../player/loot';
import { carbine } from '../enemies/robot-mesh';
import { fitModel, modelNow, type ModelName } from './models';

/** Glow colour under each kind of pickup, so you can tell them apart at a glance. */
export const LOOT_GLOW: Record<LootKind, number> = {
  money: 0x6bdc6b, ammo: 0xf2c14e, armor: 0x5aa0ff, medkit: 0xff5a5a, life: 0xff3b6b,
  magazine: 0xffa040, suppressor: 0xc080ff, scope: 0x40e0ff, carbine: 0xff5040,
};

const olive = new THREE.MeshStandardMaterial({ color: 0x4a5236, roughness: 0.8 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x222427, roughness: 0.4, metalness: 0.8 });
const brass = new THREE.MeshStandardMaterial({ color: 0xc9a045, roughness: 0.3, metalness: 0.9 });
const white = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.5 });
const red = new THREE.MeshStandardMaterial({ color: 0xcc2020, roughness: 0.5, emissive: 0x400000 });
const bill = new THREE.MeshStandardMaterial({ color: 0x6f9a5c, roughness: 0.85 });
const band = new THREE.MeshStandardMaterial({ color: 0xe8dcb0, roughness: 0.7 });
const lens = new THREE.MeshStandardMaterial({ color: 0x103040, roughness: 0.05, metalness: 0.5, emissive: 0x0a3848 });
const coyote = new THREE.MeshStandardMaterial({ color: 0x8a7552, roughness: 0.9 });

function box(width: number, height: number, depth: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function tube(radius: number, length: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 16).rotateZ(Math.PI / 2), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

/** Finds drawn from Poly Haven's scanned models (CC0), and how big they show (metres, before the pickup scale). */
const SCANNED: Partial<Record<LootKind, { readonly name: ModelName; readonly size: number }>> = {
  ammo: { name: 'ammo-box', size: 0.3 },
  medkit: { name: 'medical-box', size: 0.34 },
};

function model(kind: LootKind): THREE.Group {
  const group = new THREE.Group();
  const scanned = SCANNED[kind];
  const real = scanned === undefined ? null : modelNow(scanned.name);
  if (real !== null && scanned !== undefined) {
    const fitted = fitModel(real, scanned.size);
    fitted.position.y = -0.12;
    group.add(fitted);
    group.scale.setScalar(1.6);
    return group;
  }
  switch (kind) {
    case 'money':
      // Three banded bundles of notes.
      for (const [x, y, z] of [[-0.09, 0, 0], [0.09, 0, 0.02], [0, 0.05, -0.01]] as const) {
        group.add(box(0.16, 0.05, 0.08, bill, x, y, z));
        group.add(box(0.03, 0.052, 0.082, band, x, y, z));
      }
      break;
    case 'ammo':
      group.add(box(0.3, 0.16, 0.16, olive));
      group.add(box(0.302, 0.03, 0.162, new THREE.MeshStandardMaterial({ color: 0xd9b23a, roughness: 0.6 }), 0, 0.02, 0));
      for (let round = 0; round < 5; round += 1) {
        const cartridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8), brass);
        cartridge.position.set(-0.08 + round * 0.04, 0.125, 0);
        group.add(cartridge);
      }
      break;
    case 'armor':
      // Plate carrier: front plate, shoulder straps, magazine pouches.
      group.add(box(0.34, 0.4, 0.07, coyote));
      for (const side of [-1, 1] as const) group.add(box(0.07, 0.12, 0.2, coyote, side * 0.11, 0.24, -0.06));
      for (let pouch = 0; pouch < 3; pouch += 1) group.add(box(0.08, 0.1, 0.05, olive, -0.1 + pouch * 0.1, -0.08, 0.06));
      group.add(box(0.18, 0.06, 0.02, new THREE.MeshStandardMaterial({ color: 0x5aa0ff, emissive: 0x10305a, roughness: 0.6 }), 0, 0.1, 0.045));
      break;
    case 'medkit':
      group.add(box(0.3, 0.2, 0.12, white));
      group.add(box(0.12, 0.04, 0.01, red, 0, 0, 0.065));
      group.add(box(0.04, 0.12, 0.01, red, 0, 0, 0.065));
      group.add(box(0.1, 0.02, 0.03, darkMetal, 0, 0.11, 0));
      break;
    case 'life': {
      // A glowing heart.
      const glow = new THREE.MeshStandardMaterial({ color: 0xff2a50, emissive: 0xff1040, emissiveIntensity: 1.6, roughness: 0.3 });
      for (const side of [-1, 1] as const) {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), glow);
        lobe.position.set(side * 0.06, 0.04, 0);
        group.add(lobe);
      }
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.118, 0.17, 16), glow);
      point.rotation.z = Math.PI;
      point.position.y = -0.06;
      group.add(point);
      break;
    }
    case 'magazine':
      group.add(box(0.07, 0.24, 0.05, darkMetal));
      group.add(box(0.075, 0.03, 0.055, darkMetal, 0, -0.13, 0));
      group.add(box(0.03, 0.02, 0.03, brass, 0, 0.13, 0));
      group.rotation.z = 0.2;
      break;
    case 'suppressor':
      group.add(tube(0.035, 0.32, darkMetal));
      group.add(tube(0.02, 0.05, brass, -0.18, 0, 0));
      for (let ring = 0; ring < 3; ring += 1) group.add(tube(0.037, 0.012, band, -0.08 + ring * 0.08, 0, 0));
      break;
    case 'carbine': {
      // The dropped robot carbine lying on a salvaged armor plate.
      const { gun } = carbine();
      gun.rotation.y = Math.PI / 2;
      gun.scale.setScalar(0.55);
      group.add(gun);
      group.add(box(0.3, 0.04, 0.3, new THREE.MeshStandardMaterial({ color: 0x55603f, roughness: 0.6, metalness: 0.4 }), 0, -0.1, 0));
      break;
    }
    case 'scope':
      group.add(tube(0.025, 0.3, darkMetal));
      group.add(tube(0.04, 0.08, darkMetal, 0.18, 0, 0));
      group.add(tube(0.032, 0.06, darkMetal, -0.17, 0, 0));
      group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 10), darkMetal).translateY(0.04));
      group.add(tube(0.036, 0.004, lens, 0.222, 0, 0));
      break;
  }
  group.scale.setScalar(1.6);
  return group;
}

/**
 * A pickup the sniper can see and walk up to: the item itself, spinning and bobbing over a soft ring of light in
 * its colour.
 */
export function createPickupMesh(kind: LootKind): { root: THREE.Group; item: THREE.Group } {
  const root = new THREE.Group();
  const item = model(kind);
  root.add(item);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.38, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: LOOT_GLOW[kind], transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.position.y = -0.24;
  root.add(ring);
  return { root, item };
}
