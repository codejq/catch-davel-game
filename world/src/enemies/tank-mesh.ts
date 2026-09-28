import * as THREE from 'three';
import { texture, worldBox } from '../world/materials';
import { TANK, type TankState } from './tank';

export interface TankRig {
  readonly root: THREE.Group;
  readonly turret: THREE.Group;
  readonly barrel: THREE.Group;
  readonly wheels: readonly THREE.Mesh[];
  readonly muzzle: THREE.Mesh;
  readonly body: THREE.MeshStandardMaterial;
  readonly smoke: THREE.Group;
}

const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.95, metalness: 0.2 });
const steel = new THREE.MeshStandardMaterial({ color: 0x3a3c3e, roughness: 0.55, metalness: 0.7 });
const smokeMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false });

function part(width: number, height: number, depth: number, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(worldBox(width, height, depth, 1.5), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A main battle tank: sloped hull, tracks with road wheels, turret with a long gun, hatch, and antenna. */
export function createTankRig(paint: number): TankRig {
  const body = new THREE.MeshStandardMaterial({ color: paint, roughness: 0.75, metalness: 0.3, map: texture('metal'), bumpMap: texture('metal'), bumpScale: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(paint).multiplyScalar(0.6), roughness: 0.8, metalness: 0.3 });
  const root = new THREE.Group();
  const w = TANK.halfWidth; const l = TANK.halfLength;
  // Hull with a sloped glacis at the front.
  root.add(part(w * 2 - 0.9, 0.7, l * 2, body, 0, 0.95, 0));
  const glacis = part(w * 2 - 0.9, 0.5, 1.1, body, 0, 1.15, l - 0.2);
  glacis.rotation.x = 0.6;
  root.add(glacis);
  // Track guards, tracks, and road wheels on both sides.
  const wheels: THREE.Mesh[] = [];
  for (const side of [-1, 1] as const) {
    root.add(part(0.55, 0.12, l * 2 + 0.3, dark, side * (w - 0.28), 1.28, 0));
    root.add(part(0.5, 0.75, l * 2, trackMaterial, side * (w - 0.28), 0.5, 0));
    for (let index = 0; index < 6; index += 1) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 12).rotateZ(Math.PI / 2), steel);
      wheel.position.set(side * (w - 0.02), 0.42, -l + 0.5 + index * ((l * 2 - 1) / 5));
      root.add(wheel);
      wheels.push(wheel);
    }
    // Stowage boxes.
    root.add(part(0.4, 0.3, 1.2, dark, side * (w - 0.55), 1.45, -l + 1));
  }
  const turret = new THREE.Group();
  turret.position.y = TANK.hullHeight;
  turret.add(part(2.3, 0.75, 2.4, body, 0, 0.38, -0.1));
  const front = part(2.0, 0.6, 0.6, body, 0, 0.35, 1.25);
  front.rotation.x = -0.35;
  turret.add(front);
  turret.add(part(0.7, 0.18, 0.7, dark, 0.45, 0.82, -0.4));
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 2.2, 5), steel);
  antenna.position.set(-0.8, 1.8, -1.0);
  turret.add(antenna);
  const barrel = new THREE.Group();
  barrel.position.set(0, 0.4, 1.3);
  const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 3.6, 12).rotateX(Math.PI / 2), steel);
  gun.position.z = 1.8;
  gun.castShadow = true;
  barrel.add(gun);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.35, 12).rotateX(Math.PI / 2), steel);
  brake.position.z = 3.55;
  barrel.add(brake);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  muzzle.position.z = 4.1;
  muzzle.scale.set(1, 1, 2);
  barrel.add(muzzle);
  turret.add(barrel);
  root.add(turret);
  // Burning wreck smoke, shown once destroyed.
  const smoke = new THREE.Group();
  for (let index = 0; index < 6; index += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.6 + index * 0.15, 8, 6), smokeMaterial);
    puff.position.set(Math.sin(index * 2.1) * 0.4, 2.2 + index * 0.9, Math.cos(index * 1.7) * 0.4);
    smoke.add(puff);
  }
  smoke.visible = false;
  root.add(smoke);
  return { root, turret, barrel, wheels, muzzle, body, smoke };
}

export function poseTank(rig: TankRig, tank: TankState, time: number): void {
  rig.root.position.set(tank.position.x, tank.position.y, tank.position.z);
  rig.root.rotation.set(0, tank.heading, 0);
  rig.turret.rotation.y = tank.turret - tank.heading;
  for (const wheel of rig.wheels) wheel.rotation.x = tank.odometer / 0.3;
  const kick = tank.sinceShot < 0.3 ? 1 - tank.sinceShot / 0.3 : 0;
  rig.barrel.position.z = 1.3 - kick * 0.4;
  (rig.muzzle.material as THREE.MeshBasicMaterial).opacity = tank.sinceShot < 0.12 ? 1 : 0;
  if (tank.mode === 'dead') {
    rig.body.color.setHex(0x1a1816);
    rig.smoke.visible = true;
    rig.smoke.children.forEach((puff, index) => {
      puff.position.y = 2.2 + ((time * 0.8 + index * 0.9) % 5.4);
      puff.scale.setScalar(0.8 + ((time * 0.3 + index * 0.2) % 1.2));
    });
    rig.turret.rotation.z = Math.min(0.25, tank.deathTime * 0.5);
  }
}
