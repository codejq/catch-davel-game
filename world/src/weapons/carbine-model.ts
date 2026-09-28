import * as THREE from 'three';
import { carbine } from '../enemies/robot-mesh';

const glove = new THREE.MeshStandardMaterial({ color: 0x1d1f1c, roughness: 0.9 });
const sleeve = new THREE.MeshStandardMaterial({ color: 0x3f4630, roughness: 0.95 });

/** First-person view of the robot carbine held in gloved hands. Built along -Z like the sniper rifle. */
export function createCarbineViewModel(): { group: THREE.Group; flash: THREE.Mesh } {
  const group = new THREE.Group();
  const { gun, muzzle } = carbine();
  // The robot's gun points along +Z; turn it to face away from the camera.
  gun.rotation.y = Math.PI;
  gun.scale.setScalar(0.9);
  gun.position.set(0, 0, 0.1);
  group.add(gun);
  const flash = muzzle;
  (flash.material as THREE.MeshBasicMaterial).opacity = 0;
  const hand = (x: number, y: number, z: number): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.08, 0.11), glove);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  hand(0.005, -0.07, 0.02);
  hand(-0.01, -0.03, -0.38);
  const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.34, 12).rotateX(Math.PI / 2 - 0.35), sleeve);
  rightSleeve.position.set(0.05, -0.16, 0.2);
  group.add(rightSleeve);
  const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.4, 12).rotateX(Math.PI / 2 - 0.5).rotateY(0.55), sleeve);
  leftSleeve.position.set(-0.12, -0.18, -0.2);
  group.add(leftSleeve);
  group.traverse((object) => { object.renderOrder = 10; if (object instanceof THREE.Mesh) { object.castShadow = false; object.receiveShadow = false; } });
  group.visible = false;
  return { group, flash };
}
