import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CollisionWorld, type Volume } from '../core/collision';
import { Random } from '../core/random';
import type { ContainerPlan, DoorPlan, Part, PartRole } from './buildings';
import type { WorldLayout } from './layout';
import { namedMaterial, partMaterial, srgb, texture, TEXTURE_METRES, worldBox } from './materials';
import { applyWind, bushGeometry, grassBladeGeometry, rockGeometry, treeModel } from './vegetation';
import type { TreeKind } from './themes';

export interface Door {
  readonly plan: DoorPlan;
  readonly pivot: THREE.Group;
  readonly collider: Volume;
  open: boolean;
  angle: number;
}

export interface Container {
  readonly plan: ContainerPlan;
  readonly mesh: THREE.Object3D;
  searched: boolean;
  readonly hasKeycard: boolean;
}

export interface Portal {
  readonly group: THREE.Group;
  readonly field: THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial>;
  readonly light: THREE.PointLight;
  readonly x: number; readonly y: number; readonly z: number;
}

export interface BuiltWorld {
  readonly root: THREE.Group;
  readonly collision: CollisionWorld;
  readonly doors: Door[];
  readonly containers: Container[];
  readonly portal: Portal;
  readonly grass: THREE.Object3D | null;
  /** Hides far tiles and limits shadow casting to nearby tiles; call every frame. */
  updateDetail(cameraX: number, cameraZ: number): void;
  dispose(): void;
}

export type QualityTier = 'low' | 'high';

export function buildWorld(layout: WorldLayout, quality: QualityTier): BuiltWorld {
  const { theme, terrain } = layout;
  const root = new THREE.Group();
  root.name = theme.id;
  const collision = new CollisionWorld((x, z) => terrain.heightAt(x, z));
  const random = new Random(`${theme.seed}-scene`);
  const lod: LodEntry[] = [];

  root.add(terrainMesh(layout));
  if (theme.waterLevel !== null) root.add(waterMesh(theme.size, theme.waterLevel));

  // Keep the player inside the playable area with invisible boundary walls.
  const edge = terrain.playableHalf;
  collision.add('solid', -edge - 2, -50, -edge - 2, edge + 2, 200, -edge);
  collision.add('solid', -edge - 2, -50, edge, edge + 2, 200, edge + 2);
  collision.add('solid', -edge - 2, -50, -edge, -edge, 200, edge);
  collision.add('solid', edge, -50, -edge, edge + 2, 200, edge);

  // Buildings and towers: merge every static box per material into one mesh.
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const pushPart = (part: Part, material: THREE.Material): void => {
    const geometry = worldBox(part.width, part.height, part.depth, TEXTURE_METRES[part.role]);
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(part.x, part.y, part.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(part.pitch ?? 0, part.yaw ?? 0, 0, 'YXZ')),
      new THREE.Vector3(1, 1, 1),
    );
    geometry.applyMatrix4(matrix);
    const list = buckets.get(material) ?? [];
    list.push(geometry);
    buckets.set(material, list);
    if (part.collide) {
      collision.add('solid', part.x - part.width / 2, part.y - part.height / 2, part.z - part.depth / 2,
        part.x + part.width / 2, part.y + part.height / 2, part.z + part.depth / 2, part.role === 'glass' ? 'glass' : undefined);
    }
  };
  const doors: Door[] = [];
  const containers: Container[] = [];
  const allContainers: ContainerPlan[] = [];
  const buildingSets = [
    ...layout.buildings.map((building) => ({ parts: building.parts, style: theme.buildingStyle })),
    ...layout.towers.map((tower) => ({ parts: tower, style: theme.buildingStyle })),
  ];
  for (const { parts, style } of buildingSets) {
    for (const part of parts.parts) pushPart(part, partMaterial(part.role as PartRole, style));
    for (const plan of parts.doors) doors.push(createDoor(plan, root, collision));
    allContainers.push(...parts.containers);
    for (const ladder of parts.ladders) {
      const ladderMesh = ladderGeometry(ladder.topY - ladder.baseY);
      ladderMesh.rotateY(ladder.yaw + (ladder.exit.endsWith('x') ? Math.PI / 2 : 0));
      ladderMesh.translate(ladder.x, ladder.baseY, ladder.z);
      const list = buckets.get(namedMaterial('ladder')) ?? [];
      list.push(ladderMesh);
      buckets.set(namedMaterial('ladder'), list);
      const alongX = ladder.exit.endsWith('x');
      collision.add('ladder', ladder.x - (alongX ? 0.3 : 0.5), ladder.baseY, ladder.z - (alongX ? 0.5 : 0.3),
        ladder.x + (alongX ? 0.3 : 0.5), ladder.topY, ladder.z + (alongX ? 0.5 : 0.3), `ladder:${ladder.exit}`);
    }
  }
  for (const plan of allContainers) {
    const mesh = containerMesh(plan);
    root.add(mesh);
    collision.addBox('solid', plan.x, plan.y, plan.z, Math.max(plan.width, plan.depth) * 0.95, plan.height, Math.max(plan.width, plan.depth) * 0.95);
    containers.push({ plan, mesh, searched: false, hasKeycard: plan.id === layout.keycardContainerId });
  }
  for (const [material, geometries] of buckets) {
    const mesh = new THREE.Mesh(mergeGeometries(geometries)!, material);
    mesh.castShadow = !(material as THREE.MeshStandardMaterial).transparent;
    mesh.receiveShadow = true;
    root.add(mesh);
    for (const geometry of geometries) geometry.dispose();
  }

  // Forests: instanced meshes per tree kind, split into spatial chunks so off-screen chunks are culled.
  const kinds = new Map<TreeKind, typeof layout.trees[number][]>();
  for (const tree of layout.trees) kinds.set(tree.kind, [...(kinds.get(tree.kind) ?? []), tree]);
  for (const [kind, trees] of kinds) {
    const model = treeModel(kind);
    const trunkMaterial = model.trunkMaterial === 'cactus'
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })
      : namedMaterial(model.trunkMaterial);
    const foliageMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
    applyWind(foliageMaterial, kind === 'palm' ? 0.35 : 0.22, model.height);
    const tint = new THREE.Color();
    const matrices = trees.map((tree) => new THREE.Matrix4().compose(new THREE.Vector3(tree.x, tree.y - 0.1, tree.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, tree.yaw, 0)), new THREE.Vector3(tree.scale, tree.scale, tree.scale)));
    const tints = trees.map(() => {
      const shade = 0.85 + random.next() * 0.3;
      return tint.clone().setRGB(shade * (0.92 + random.next() * 0.16), shade, shade * (0.9 + random.next() * 0.1));
    });
    addChunked(root, model.trunk, trunkMaterial, trees, matrices, null, true, lod, 330, 110);
    if (model.foliage !== null) addChunked(root, model.foliage, foliageMaterial, trees, matrices, tints, true, lod, 330, 110);
    trees.forEach((tree) => {
      const radius = model.trunkRadius * tree.scale;
      collision.addBox('solid', tree.x, tree.y - 0.5, tree.z, radius * 2, model.height * tree.scale * 0.7, radius * 2, 'tree');
    });
  }

  // Bushes hide a crouched or prone sniper.
  if (layout.bushes.length > 0) {
    const bushMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    applyWind(bushMaterial, 0.08, 1.4);
    const matrices = layout.bushes.map((bush) => new THREE.Matrix4().compose(new THREE.Vector3(bush.x, bush.y - 0.05, bush.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, bush.yaw, 0)), new THREE.Vector3(bush.scale, bush.scale, bush.scale)));
    addChunked(root, bushGeometry(theme.snow), bushMaterial, layout.bushes, matrices, null, true, lod, 170, 60);
    for (const bush of layout.bushes) {
      collision.add('cover', bush.x - bush.scale, bush.y - 0.2, bush.z - bush.scale, bush.x + bush.scale, bush.y + bush.scale * 1.25, bush.z + bush.scale);
    }
  }

  if (layout.rocks.length > 0) {
    const rocks = new THREE.InstancedMesh(rockGeometry(), namedMaterial('rock'), layout.rocks.length);
    const matrix = new THREE.Matrix4();
    const tint = srgb(theme.ground.slope[0] * 1.6, theme.ground.slope[1] * 1.6, theme.ground.slope[2] * 1.6);
    layout.rocks.forEach((rock, index) => {
      matrix.compose(new THREE.Vector3(rock.x, rock.y - rock.scale * 0.25, rock.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rock.yaw, 0)),
        new THREE.Vector3(rock.scale, rock.scale, rock.scale));
      rocks.setMatrixAt(index, matrix);
      rocks.setColorAt(index, tint);
      if (rock.scale > 0.9) {
        collision.addBox('solid', rock.x, rock.y - 0.3, rock.z, rock.scale * 1.8, rock.scale * 0.95, rock.scale * 1.4);
      }
    });
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    root.add(rocks);
  }

  const grass = theme.grassDensity > 0 ? grassField(layout, quality, lod) : null;
  if (grass !== null) root.add(grass);

  const portal = portalMesh(layout);
  root.add(portal.group);
  collision.add('portal', portal.x - 2, portal.y, portal.z - 1.2, portal.x + 2, portal.y + 4.5, portal.z + 1.2);
  collision.addBox('solid', portal.x - 2.6, portal.y, portal.z, 0.9, 5.4, 1.2);
  collision.addBox('solid', portal.x + 2.6, portal.y, portal.z, 0.9, 5.4, 1.2);

  return {
    root, collision, doors, containers, portal, grass,
    updateDetail(cameraX, cameraZ) {
      for (const entry of lod) {
        const distance = Math.hypot(entry.x - cameraX, entry.z - cameraZ) - CHUNK * 0.7;
        entry.object.visible = distance < entry.visibleWithin;
        if (entry.shadowWithin >= 0) entry.object.castShadow = distance < entry.shadowWithin;
      }
    },
    dispose() {
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
    },
  };
}

const CHUNK = 48;

interface LodEntry { readonly object: THREE.Object3D; readonly x: number; readonly z: number; readonly visibleWithin: number; readonly shadowWithin: number }

/** Adds instanced copies split into CHUNK-sized tiles, so the renderer can frustum-cull each tile separately. */
function addChunked(
  root: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly { x: number; z: number }[],
  matrices: readonly THREE.Matrix4[], colors: readonly THREE.Color[] | null, castShadow: boolean,
  lod: LodEntry[], visibleWithin: number, shadowWithin: number,
): void {
  const tiles = new Map<string, number[]>();
  items.forEach((item, index) => {
    const key = `${Math.floor(item.x / CHUNK)},${Math.floor(item.z / CHUNK)}`;
    tiles.set(key, [...(tiles.get(key) ?? []), index]);
  });
  for (const indices of tiles.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, indices.length);
    indices.forEach((itemIndex, instance) => {
      mesh.setMatrixAt(instance, matrices[itemIndex]!);
      if (colors !== null) mesh.setColorAt(instance, colors[itemIndex]!);
    });
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    root.add(mesh);
    const center = mesh.boundingSphere!.center;
    lod.push({ object: mesh, x: center.x, z: center.z, visibleWithin, shadowWithin: castShadow ? shadowWithin : -1 });
  }
}

function terrainMesh(layout: WorldLayout): THREE.Mesh {
  const { terrain, theme } = layout;
  const geometry = new THREE.PlaneGeometry(theme.size, theme.size, terrain.resolution - 1, terrain.resolution - 1);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const low = srgb(...theme.ground.low);
  const mid = srgb(...theme.ground.mid);
  const high = srgb(...theme.ground.high);
  const slopeColor = srgb(...theme.ground.slope);
  const pathColor = srgb(...theme.ground.path);
  const color = new THREE.Color();
  const random = new Random(`${theme.seed}-terrain`);
  for (let index = 0; index < position.count; index += 1) {
    const column = index % terrain.resolution;
    const row = Math.floor(index / terrain.resolution);
    const height = terrain.heights[row * terrain.resolution + column]!;
    position.setY(index, height);
    const x = position.getX(index);
    const z = position.getZ(index);
    const band = Math.max(0, Math.min(1, (height + 4) / 18));
    color.copy(low).lerp(mid, Math.min(1, band * 2)).lerp(high, Math.max(0, band * 2 - 1));
    color.lerp(slopeColor, Math.min(1, Math.max(0, terrain.slopeAt(x, z) - 0.35) * 1.8));
    color.lerp(pathColor, terrain.pathMask[row * terrain.resolution + column]! * 0.9);
    if (theme.snow && height > 18) color.lerp(srgb(0.97, 0.98, 1), 0.6);
    color.multiplyScalar(0.92 + random.next() * 0.16);
    colors.set([color.r, color.g, color.b], index * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const detail = texture('ground', theme.size / 3);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, map: detail, roughness: theme.snow ? 0.75 : 0.96, metalness: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

function waterMesh(size: number, level: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size, 1, 1).rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x14292c, roughness: 0.16, metalness: 0.05, transparent: true, opacity: 0.93, envMapIntensity: 0.45,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = level;
  mesh.receiveShadow = true;
  mesh.name = 'water';
  return mesh;
}

function createDoor(plan: DoorPlan, root: THREE.Group, collision: CollisionWorld): Door {
  const pivot = new THREE.Group();
  pivot.position.set(plan.hingeX, plan.hingeY, plan.hingeZ);
  pivot.rotation.y = plan.closedYaw;
  const leaf = new THREE.Mesh(worldBox(plan.width - 0.04, plan.height, 0.06, 1.5), namedMaterial('door'));
  leaf.position.set(plan.width / 2, plan.height / 2, 0);
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), namedMaterial('ladder'));
  handle.position.set(plan.width - 0.12, 1.02, 0.06);
  pivot.add(leaf, handle);
  root.add(pivot);
  const cos = Math.cos(plan.closedYaw);
  const sin = -Math.sin(plan.closedYaw);
  const endX = plan.hingeX + cos * plan.width;
  const endZ = plan.hingeZ + sin * plan.width;
  const collider = collision.add('solid',
    Math.min(plan.hingeX, endX) - 0.08, plan.hingeY, Math.min(plan.hingeZ, endZ) - 0.08,
    Math.max(plan.hingeX, endX) + 0.08, plan.hingeY + plan.height, Math.max(plan.hingeZ, endZ) + 0.08, `door:${plan.id}`);
  return { plan, pivot, collider, open: false, angle: 0 };
}

function containerMesh(plan: ContainerPlan): THREE.Object3D {
  const group = new THREE.Group();
  const material = plan.kind === 'crate' ? namedMaterial('crate') : plan.kind === 'locker' ? namedMaterial('locker') : namedMaterial('cabinet');
  const body = new THREE.Mesh(worldBox(plan.width, plan.height, plan.depth, plan.kind === 'crate' ? plan.width : 1.5), material);
  body.position.y = plan.height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  if (plan.kind !== 'crate') {
    // Drawer and door seams on the front face.
    const seamMaterial = new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 0.8 });
    const rows = plan.kind === 'desk' ? 2 : 3;
    for (let row = 1; row < rows; row += 1) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(plan.width * 0.92, 0.02, 0.02), seamMaterial);
      seam.position.set(0, (plan.height * row) / rows, plan.depth / 2 + 0.005);
      group.add(seam);
    }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), namedMaterial('ladder'));
    knob.position.set(plan.width * 0.3, plan.height * 0.55, plan.depth / 2 + 0.02);
    group.add(knob);
  }
  group.position.set(plan.x, plan.y, plan.z);
  group.rotation.y = plan.yaw;
  group.userData.containerId = plan.id;
  return group;
}

function ladderGeometry(height: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [-0.25, 0.25]) parts.push(new THREE.BoxGeometry(0.05, height + 0.9, 0.06).translate(side, (height + 0.9) / 2, 0));
  for (let rung = 0.3; rung < height + 0.6; rung += 0.3) parts.push(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6).rotateZ(Math.PI / 2).translate(0, rung, 0));
  return mergeGeometries(parts.map((part) => part.toNonIndexed()))!;
}

function grassField(layout: WorldLayout, quality: QualityTier, lod: LodEntry[]): THREE.Object3D {
  const { terrain, theme } = layout;
  const random = new Random(`${theme.seed}-grass`);
  const target = Math.round((quality === 'high' ? 90000 : 22000) * theme.grassDensity);
  const material = new THREE.MeshStandardMaterial({ vertexColors: false, side: THREE.DoubleSide, roughness: 0.85, color: srgb(...theme.grassColor) });
  applyWind(material, 0.18, 0.7);
  const positions: { x: number; z: number }[] = [];
  const matrices: THREE.Matrix4[] = [];
  const colors: THREE.Color[] = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const tint = new THREE.Color();
  const extent = terrain.playableHalf;
  let placed = 0;
  for (let attempt = 0; attempt < target * 4 && placed < target; attempt += 1) {
    // Blades clump in patches around a random seed point, like real meadows.
    const x = random.range(-extent, extent);
    const z = random.range(-extent, extent);
    if (terrain.pathAt(x, z) > 0.35 || terrain.slopeAt(x, z) > 0.7) continue;
    if (theme.waterLevel !== null && terrain.heightAt(x, z) < theme.waterLevel + 0.2) continue;
    const blades = 1 + Math.floor(random.next() * 6);
    for (let blade = 0; blade < blades && placed < target; blade += 1) {
      const bx = x + random.range(-0.35, 0.35);
      const bz = z + random.range(-0.35, 0.35);
      euler.set(random.range(-0.25, 0.25), random.range(0, Math.PI * 2), random.range(-0.25, 0.25));
      quaternion.setFromEuler(euler);
      const size = random.range(0.6, 1.5);
      scale.set(size, size * random.range(0.8, 1.3), size);
      matrix.compose(new THREE.Vector3(bx, terrain.heightAt(bx, bz) - 0.02, bz), quaternion, scale);
      matrices.push(matrix.clone());
      positions.push({ x: bx, z: bz });
      const shade = random.range(0.75, 1.2);
      tint.setRGB(shade * random.range(0.9, 1.1), shade, shade * random.range(0.8, 1));
      colors.push(tint.clone());
      placed += 1;
    }
  }
  const group = new THREE.Group();
  group.name = 'grass';
  addChunked(group, grassBladeGeometry(), material, positions, matrices, colors, false, lod, quality === 'high' ? 85 : 55, -1);
  return group;
}

function portalMesh(layout: WorldLayout): Portal {
  const { portal, terrain } = layout;
  const y = terrain.heightAt(portal.x, portal.z);
  const group = new THREE.Group();
  const stone = namedMaterial('portal-stone');
  for (const side of [-1, 1] as const) {
    const pillar = new THREE.Mesh(worldBox(0.9, 5.4, 1.2, 2), stone);
    pillar.position.set(side * 2.6, 2.7, 0);
    pillar.castShadow = true;
    group.add(pillar);
  }
  const lintel = new THREE.Mesh(worldBox(6.4, 0.9, 1.3, 2), stone);
  lintel.position.set(0, 5.6, 0);
  lintel.castShadow = true;
  group.add(lintel);
  const base = new THREE.Mesh(worldBox(7, 0.3, 3, 2), stone);
  base.position.set(0, 0.15, 0);
  base.receiveShadow = true;
  group.add(base);
  const field = new THREE.Mesh(new THREE.CircleGeometry(2.1, 48), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uUnlocked: { value: 0 } },
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float uTime; uniform float uUnlocked; varying vec2 vUv;
      void main(){
        vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
        float swirl = sin(a * 6.0 + r * 14.0 - uTime * 3.0) * 0.5 + 0.5;
        vec3 locked = mix(vec3(0.9,0.12,0.08), vec3(1.0,0.5,0.2), swirl);
        vec3 open = mix(vec3(0.1,0.45,1.0), vec3(0.6,0.95,1.0), swirl);
        vec3 color = mix(locked, open, uUnlocked);
        float alpha = smoothstep(1.0, 0.85, r) * (0.55 + 0.35 * swirl);
        gl_FragColor = vec4(color * 2.2, alpha);
      }`,
  }));
  field.position.set(0, 2.6, 0);
  field.scale.set(1, 1.2, 1);
  group.add(field);
  const light = new THREE.PointLight(0xff5533, 30, 18, 2);
  light.position.set(0, 2.6, 1.2);
  group.add(light);
  group.position.set(portal.x, y, portal.z);
  group.rotation.y = portal.yaw;
  return { group, field, light, x: portal.x, y, z: portal.z };
}
