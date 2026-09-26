import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { valueNoise } from '../core/noise';
import { Random } from '../core/random';
import type { TreeKind } from './themes';
import { srgb } from './materials';

/** Shared wind clock for foliage and grass shaders. */
export const windUniforms = { uTime: { value: 0 }, uWind: { value: 1 } };

/**
 * Adds a vertex-shader sway to a material: vertices move more the higher they sit above the mesh origin, and each
 * instance gets its own phase so a forest never moves in lockstep.
 */
export function applyWind(material: THREE.Material, strength: number, heightScale: number): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWind = windUniforms.uWind;
    shader.vertexShader = `uniform float uTime;\nuniform float uWind;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 windOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
        vec3 windOrigin = vec3(0.0);
      #endif
      float windHeight = max(0.0, position.y) / ${heightScale.toFixed(2)};
      float windPhase = uTime * 1.7 + windOrigin.x * 0.21 + windOrigin.z * 0.17;
      float gust = 0.6 + 0.4 * sin(uTime * 0.37 + windOrigin.x * 0.013);
      transformed.x += sin(windPhase) * ${strength.toFixed(3)} * windHeight * windHeight * gust * uWind;
      transformed.z += cos(windPhase * 0.83) * ${(strength * 0.6).toFixed(3)} * windHeight * windHeight * gust * uWind;`,
    );
  };
  material.customProgramCacheKey = () => `wind-${strength}-${heightScale}`;
}

/** Merges duplicated vertices (keeping positions only) so noise displacement stays watertight and normals smooth. */
function weld(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const positionOnly = new THREE.BufferGeometry();
  positionOnly.setAttribute('position', geometry.getAttribute('position'));
  if (geometry.index !== null) positionOnly.setIndex(geometry.index);
  const welded = mergeVertices(positionOnly, 1e-4);
  welded.computeVertexNormals();
  return welded;
}

/** Displaces vertices with noise so primitive blobs read as organic foliage or rock. */
function roughen(geometry: THREE.BufferGeometry, amount: number, frequency: number, seed: number): THREE.BufferGeometry {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const n = valueNoise(vertex.x * frequency + seed, vertex.z * frequency + vertex.y * frequency * 0.7, seed) - 0.5;
    vertex.multiplyScalar(1 + n * amount);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function colorize(geometry: THREE.BufferGeometry, base: THREE.Color, variation: number, snowUp = 0, seed = 1): THREE.BufferGeometry {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const random = new Random(seed);
  const snow = srgb(0.94, 0.96, 1);
  const color = new THREE.Color();
  for (let index = 0; index < position.count; index += 1) {
    const shade = 1 + (random.next() - 0.5) * variation;
    // Darker inside the crown (ambient occlusion baked into vertex colour).
    const inner = 0.72 + Math.min(1, Math.hypot(position.getX(index), position.getZ(index)) / 2) * 0.35;
    color.copy(base).multiplyScalar(shade * inner);
    if (snowUp > 0) color.lerp(snow, Math.max(0, normal.getY(index) - 0.25) * snowUp);
    colors.set([color.r, color.g, color.b], index * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export interface TreeModel {
  readonly trunk: THREE.BufferGeometry;
  readonly foliage: THREE.BufferGeometry | null;
  readonly trunkMaterial: 'bark' | 'birch-bark' | 'cactus';
  readonly trunkRadius: number;
  readonly height: number;
}

export function treeModel(kind: TreeKind): TreeModel {
  const random = new Random(`tree-${kind}`);
  switch (kind) {
    case 'pine':
    case 'snow-pine': {
      const height = 11;
      const trunk = new THREE.CylinderGeometry(0.14, 0.34, height * 0.75, 9).translate(0, height * 0.375, 0);
      const layers: THREE.BufferGeometry[] = [];
      for (let layer = 0; layer < 5; layer += 1) {
        const radius = 2.9 - layer * 0.5;
        const cone = new THREE.ConeGeometry(radius, 3.2 - layer * 0.25, 10, 2).translate(0, 3 + layer * 1.55, 0);
        layers.push(roughen(weld(cone), 0.28, 1.4, layer + 3));
      }
      const foliage = colorize(mergeGeometries(layers)!, srgb(0.1, 0.2, 0.1), 0.35, kind === 'snow-pine' ? 1.6 : 0, 7);
      return { trunk, foliage, trunkMaterial: 'bark', trunkRadius: 0.3, height };
    }
    case 'oak':
    case 'birch': {
      const birch = kind === 'birch';
      const height = birch ? 10 : 9;
      const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(birch ? 0.14 : 0.25, birch ? 0.22 : 0.45, height * 0.6, 10).translate(0, height * 0.3, 0)];
      for (let branch = 0; branch < 4; branch += 1) {
        const angle = branch * Math.PI / 2 + random.range(-0.4, 0.4);
        const limb = new THREE.CylinderGeometry(0.06, 0.13, 3, 6).translate(0, 1.5, 0);
        limb.rotateZ(0.7).rotateY(angle).translate(0, height * 0.45, 0);
        parts.push(limb);
      }
      const trunk = mergeGeometries(parts.map((part) => part.toNonIndexed()))!;
      const clumps: THREE.BufferGeometry[] = [];
      const count = birch ? 5 : 7;
      for (let clump = 0; clump < count; clump += 1) {
        const radius = random.range(1.6, 2.6) * (birch ? 0.75 : 1);
        const sphere = new THREE.IcosahedronGeometry(radius, 1);
        const angle = random.range(0, Math.PI * 2);
        const spread = random.range(0.6, 2.4) * (birch ? 0.7 : 1);
        sphere.translate(Math.cos(angle) * spread, height * 0.62 + random.range(-0.4, 2.6), Math.sin(angle) * spread);
        clumps.push(roughen(weld(sphere), 0.42, 0.9, clump * 5 + 1));
      }
      const leaf = birch ? srgb(0.28, 0.4, 0.14) : srgb(0.17, 0.3, 0.1);
      const foliage = colorize(mergeGeometries(clumps)!, leaf, 0.4, 0, birch ? 11 : 13);
      return { trunk, foliage, trunkMaterial: birch ? 'birch-bark' : 'bark', trunkRadius: birch ? 0.2 : 0.4, height };
    }
    case 'palm': {
      const height = 9;
      const segments: THREE.BufferGeometry[] = [];
      for (let segment = 0; segment < 9; segment += 1) {
        const piece = new THREE.CylinderGeometry(0.2, 0.24, 1.05, 8).translate(Math.sin(segment * 0.18) * 0.6, segment + 0.5, 0);
        segments.push(piece.toNonIndexed());
      }
      const trunk = mergeGeometries(segments)!;
      const fronds: THREE.BufferGeometry[] = [];
      for (let frond = 0; frond < 9; frond += 1) {
        const leaf = new THREE.PlaneGeometry(0.9, 4.2, 1, 6);
        const position = leaf.getAttribute('position') as THREE.BufferAttribute;
        for (let index = 0; index < position.count; index += 1) {
          const along = (position.getY(index) + 2.1) / 4.2;
          position.setZ(index, -along * along * 1.6);
          position.setX(index, position.getX(index) * (1 - along * 0.8));
        }
        leaf.translate(0, 2.1, 0).rotateX(-1.1).rotateY(frond * Math.PI * 2 / 9).translate(Math.sin(8 * 0.18) * 0.6, height, 0);
        fronds.push(leaf.toNonIndexed());
      }
      const foliage = colorize(mergeGeometries(fronds)!, srgb(0.22, 0.34, 0.12), 0.3, 0, 17);
      foliage.computeVertexNormals();
      return { trunk, foliage, trunkMaterial: 'bark', trunkRadius: 0.25, height };
    }
    case 'cactus': {
      const parts = [new THREE.CapsuleGeometry(0.32, 3.2, 6, 12).translate(0, 1.9, 0)];
      for (const side of [-1, 1] as const) {
        parts.push(new THREE.CapsuleGeometry(0.2, 0.9, 4, 10).rotateZ(side * Math.PI / 2).translate(side * 0.6, 1.8 + side * 0.3, 0));
        parts.push(new THREE.CapsuleGeometry(0.19, 1.2, 4, 10).translate(side * 1.05, 2.4 + side * 0.3, 0));
      }
      const trunk = colorize(mergeGeometries(parts.map((part) => part.toNonIndexed()))!, srgb(0.24, 0.4, 0.2), 0.2, 0, 19);
      return { trunk, foliage: null, trunkMaterial: 'cactus', trunkRadius: 0.35, height: 3.8 };
    }
    case 'dead': {
      const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.12, 0.32, 6, 8).translate(0, 3, 0)];
      for (let branch = 0; branch < 5; branch += 1) {
        const limb = new THREE.CylinderGeometry(0.03, 0.09, random.range(1.5, 2.8), 5).translate(0, 1.1, 0);
        limb.rotateZ(random.range(0.5, 1.1)).rotateY(random.range(0, Math.PI * 2)).translate(0, random.range(2.5, 5.5), 0);
        parts.push(limb);
      }
      return { trunk: mergeGeometries(parts.map((part) => part.toNonIndexed()))!, foliage: null, trunkMaterial: 'bark', trunkRadius: 0.28, height: 6 };
    }
  }
}

export function bushGeometry(snow: boolean): THREE.BufferGeometry {
  const random = new Random('bush');
  const clumps: THREE.BufferGeometry[] = [];
  for (let clump = 0; clump < 5; clump += 1) {
    const sphere = new THREE.IcosahedronGeometry(random.range(0.55, 0.9), 1);
    sphere.scale(1, 0.8, 1).translate(random.range(-0.6, 0.6), random.range(0.35, 0.8), random.range(-0.6, 0.6));
    clumps.push(roughen(weld(sphere), 0.45, 1.6, clump * 3 + 2));
  }
  return colorize(mergeGeometries(clumps)!, snow ? srgb(0.2, 0.26, 0.2) : srgb(0.16, 0.28, 0.09), 0.45, snow ? 1.4 : 0, 23);
}

export function rockGeometry(): THREE.BufferGeometry {
  const rock = weld(new THREE.DodecahedronGeometry(1, 1));
  rock.scale(1.3, 0.75, 1);
  return roughen(rock, 0.5, 1.3, 29).translate(0, 0.35, 0);
}

/** A single grass blade: a tapered, slightly curved strip. */
export function grassBladeGeometry(): THREE.BufferGeometry {
  const blade = new THREE.PlaneGeometry(0.07, 0.7, 1, 4);
  const position = blade.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    const along = (position.getY(index) + 0.35) / 0.7;
    position.setX(index, position.getX(index) * (1 - along * 0.9));
    position.setZ(index, along * along * 0.12);
  }
  blade.translate(0, 0.35, 0);
  blade.computeVertexNormals();
  return blade;
}
