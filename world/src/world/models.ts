import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Photo-scanned and professionally modelled props from Poly Haven (CC0), optimized into public/models by
 * scripts/fetch-models.mjs. Each loads once and is cloned wherever it is used (clones share geometry and
 * textures). Anything that fails to load resolves to null and the game keeps its built-in stand-in.
 */
export type ModelName = 'sniper-rifle' | 'ammo-box' | 'medical-box' | 'jerrycan' | 'barrel';

const loaded = new Map<ModelName, THREE.Group>();
const pending = new Map<ModelName, Promise<THREE.Group | null>>();

export function loadModel(name: ModelName): Promise<THREE.Group | null> {
  const existing = pending.get(name);
  if (existing !== undefined) return existing;
  const promise = new GLTFLoader().loadAsync(`./models/${name}.glb`).then((gltf) => {
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    loaded.set(name, gltf.scene);
    return gltf.scene;
  }).catch(() => null);
  pending.set(name, promise);
  return promise;
}

/** Starts loading every model in the background. */
export function preloadModels(names: readonly ModelName[] = ['sniper-rifle', 'ammo-box', 'medical-box', 'jerrycan', 'barrel']): Promise<unknown> {
  return Promise.all(names.map((name) => loadModel(name)));
}

/** A copy of a model that has already loaded, or null if it hasn't (yet). */
export function modelNow(name: ModelName): THREE.Group | null {
  return loaded.get(name)?.clone() ?? null;
}

/** Scales a model so its longest side is `size` metres and sits it on y = 0, centred on x and z. */
export function fitModel(model: THREE.Object3D, size: number): THREE.Object3D {
  const box = new THREE.Box3().setFromObject(model);
  const extent = box.getSize(new THREE.Vector3());
  const scale = size / Math.max(extent.x, extent.y, extent.z, 1e-6);
  const wrapper = new THREE.Group();
  model.scale.multiplyScalar(scale);
  const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
  model.position.set(-center.x, -box.min.y * scale, -center.z);
  wrapper.add(model);
  return wrapper;
}
