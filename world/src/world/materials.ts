import * as THREE from 'three';
import { Random } from '../core/random';
import type { BuildingStyle } from './themes';
import type { PartRole } from './buildings';

type Painter = (context: CanvasRenderingContext2D, size: number, random: Random) => void;

const cache = new Map<string, THREE.CanvasTexture>();

function canvasTexture(key: string, painter: Painter, size = 512, repeat = 1): THREE.CanvasTexture {
  const existing = cache.get(key);
  if (existing !== undefined) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('2D canvas is unavailable');
  painter(context, size, new Random(key));
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  cache.set(key, texture);
  return texture;
}

function noiseLayer(context: CanvasRenderingContext2D, size: number, scale: number, alpha: number, dark: string, light: string, seed: number): void {
  const image = context.getImageData(0, 0, size, size);
  const data = image.data;
  const darkRgb = hexRgb(dark);
  const lightRgb = hexRgb(light);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = tileNoise(x / scale, y / scale, Math.max(1, Math.round(size / scale)), seed);
      const tint = n < 0.5 ? darkRgb : lightRgb;
      const strength = Math.abs(n - 0.5) * 2 * alpha;
      const index = (y * size + x) * 4;
      data[index] = data[index]! + (tint[0] - data[index]!) * strength;
      data[index + 1] = data[index + 1]! + (tint[1] - data[index + 1]!) * strength;
      data[index + 2] = data[index + 2]! + (tint[2] - data[index + 2]!) * strength;
    }
  }
  context.putImageData(image, 0, 0);
}

function speckle(context: CanvasRenderingContext2D, size: number, random: Random, count: number, colors: readonly string[], maxRadius: number): void {
  for (let index = 0; index < count; index += 1) {
    context.fillStyle = random.pick(colors);
    context.globalAlpha = random.range(0.05, 0.3);
    const radius = random.range(0.4, maxRadius);
    context.beginPath();
    context.arc(random.range(0, size), random.range(0, size), radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function latticeHash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Value noise whose lattice wraps every `period` cells, so canvas textures tile seamlessly. */
function tileNoise(x: number, y: number, period: number, seed: number): number {
  const ix = Math.floor(x); const iy = Math.floor(y);
  const fx = x - ix; const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx); const sy = fy * fy * (3 - 2 * fy);
  const wrap = (value: number): number => ((value % period) + period) % period;
  const a = latticeHash(wrap(ix), wrap(iy), seed);
  const b = latticeHash(wrap(ix + 1), wrap(iy), seed);
  const c = latticeHash(wrap(ix), wrap(iy + 1), seed);
  const d = latticeHash(wrap(ix + 1), wrap(iy + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function hexRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const painters: Record<string, Painter> = {
  plaster(context, size, random) {
    context.fillStyle = '#c4b9a5';
    context.fillRect(0, 0, size, size);
    noiseLayer(context, size, 38, 0.35, '#a39580', '#d8cfbe', 3);
    speckle(context, size, random, 1600, ['#8f846f', '#fffaf0', '#a89880'], 1.6);
    for (let index = 0; index < 6; index += 1) {
      // Rain stains running down from the top.
      const x = random.range(0, size);
      const gradient = context.createLinearGradient(x, 0, x, size * random.range(0.3, 0.8));
      gradient.addColorStop(0, 'rgba(90,80,65,0.22)');
      gradient.addColorStop(1, 'rgba(90,80,65,0)');
      context.fillStyle = gradient;
      context.fillRect(x - 10, 0, random.range(8, 26), size);
    }
  },
  brick(context, size, random) {
    context.fillStyle = '#8d8578';
    context.fillRect(0, 0, size, size);
    const rows = 16; const columns = 4;
    const brickHeight = size / rows; const brickWidth = size / columns;
    for (let row = 0; row < rows; row += 1) {
      for (let column = -1; column < columns; column += 1) {
        const offset = row % 2 === 0 ? 0 : brickWidth / 2;
        const shade = random.range(-18, 18);
        const r = 138 + shade + random.range(-10, 10); const g = 62 + shade * 0.6; const b = 44 + shade * 0.5;
        context.fillStyle = `rgb(${r},${g},${b})`;
        context.fillRect(column * brickWidth + offset + 2, row * brickHeight + 2, brickWidth - 4, brickHeight - 4);
      }
    }
    noiseLayer(context, size, 9, 0.25, '#4a2a20', '#c49a80', 5);
    speckle(context, size, random, 900, ['#2a1a14', '#e0c0a0'], 1.3);
  },
  adobe(context, size, random) {
    context.fillStyle = '#c89f74';
    context.fillRect(0, 0, size, size);
    noiseLayer(context, size, 50, 0.45, '#a67b52', '#dcb88f', 9);
    noiseLayer(context, size, 8, 0.15, '#8c6440', '#e8c9a4', 12);
    context.strokeStyle = 'rgba(80,55,35,0.35)';
    for (let index = 0; index < 14; index += 1) {
      context.lineWidth = random.range(0.6, 1.6);
      context.beginPath();
      let x = random.range(0, size); let y = random.range(0, size);
      context.moveTo(x, y);
      for (let step = 0; step < 6; step += 1) {
        x += random.range(-18, 18); y += random.range(4, 22);
        context.lineTo(x, y);
      }
      context.stroke();
    }
  },
  concrete(context, size, random) {
    context.fillStyle = '#8e9090';
    context.fillRect(0, 0, size, size);
    noiseLayer(context, size, 30, 0.35, '#6e7070', '#a8aaa8', 17);
    speckle(context, size, random, 2400, ['#555', '#bbb', '#777'], 1.1);
    context.fillStyle = 'rgba(40,40,40,0.35)';
    context.fillRect(0, size / 2 - 1, size, 2);
    context.fillRect(size / 2 - 1, 0, 2, size);
    for (let index = 0; index < 5; index += 1) {
      const x = random.range(0, size);
      const gradient = context.createLinearGradient(x, size / 2, x, size);
      gradient.addColorStop(0, 'rgba(60,55,45,0.3)');
      gradient.addColorStop(1, 'rgba(60,55,45,0)');
      context.fillStyle = gradient;
      context.fillRect(x, size / 2, random.range(6, 20), size / 2);
    }
  },
  planks(context, size, random) {
    const planks = 8;
    for (let plank = 0; plank < planks; plank += 1) {
      const shade = random.range(-20, 20);
      context.fillStyle = `rgb(${120 + shade},${84 + shade * 0.7},${52 + shade * 0.5})`;
      context.fillRect(0, plank * size / planks, size, size / planks);
      context.strokeStyle = 'rgba(40,24,12,0.35)';
      for (let grain = 0; grain < 10; grain += 1) {
        context.lineWidth = random.range(0.4, 1.4);
        context.beginPath();
        const y = plank * size / planks + random.range(2, size / planks - 2);
        context.moveTo(0, y);
        context.bezierCurveTo(size * 0.3, y + random.range(-3, 3), size * 0.6, y + random.range(-3, 3), size, y);
        context.stroke();
      }
      context.fillStyle = 'rgba(20,12,6,0.55)';
      context.fillRect(0, plank * size / planks, size, 2);
      context.fillRect(random.range(0, size), plank * size / planks, 2, size / planks);
    }
  },
  tiles(context, size, random) {
    context.fillStyle = '#5a2c22';
    context.fillRect(0, 0, size, size);
    const rows = 12; const columns = 10;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const shade = random.range(-25, 25);
        const x = column * size / columns + (row % 2) * size / columns / 2;
        const y = row * size / rows;
        const gradient = context.createLinearGradient(0, y, 0, y + size / rows);
        gradient.addColorStop(0, `rgb(${150 + shade},${70 + shade * 0.5},${48 + shade * 0.4})`);
        gradient.addColorStop(1, `rgb(${96 + shade},${42 + shade * 0.4},${30 + shade * 0.3})`);
        context.fillStyle = gradient;
        context.beginPath();
        context.roundRect(x + 1, y + 1, size / columns - 2, size / rows - 1, 6);
        context.fill();
      }
    }
    speckle(context, size, random, 1200, ['#2d4a22', '#1d1d1d', '#d9b99a'], 1.8);
  },
  metal(context, size, random) {
    context.fillStyle = '#6b7075';
    context.fillRect(0, 0, size, size);
    for (let line = 0; line < size; line += 1) {
      context.fillStyle = `rgba(255,255,255,${random.range(0, 0.05)})`;
      context.fillRect(0, line, size, 1);
    }
    noiseLayer(context, size, 40, 0.3, '#4c3a2a', '#8a9096', 23);
    speckle(context, size, random, 400, ['#6a3d1e', '#3a2618'], 3);
  },
  bark(context, size, random) {
    context.fillStyle = '#4a3a2c';
    context.fillRect(0, 0, size, size);
    for (let stripe = 0; stripe < 90; stripe += 1) {
      context.fillStyle = random.chance(0.5) ? 'rgba(20,14,10,0.45)' : 'rgba(110,95,78,0.35)';
      const x = random.range(0, size);
      context.fillRect(x, 0, random.range(1, 6), size);
    }
    noiseLayer(context, size, 12, 0.3, '#2a2018', '#6a5a48', 31);
  },
  'birch-bark'(context, size, random) {
    context.fillStyle = '#dcd8cf';
    context.fillRect(0, 0, size, size);
    for (let mark = 0; mark < 70; mark += 1) {
      context.fillStyle = 'rgba(30,28,26,0.75)';
      context.fillRect(random.range(0, size), random.range(0, size), random.range(8, 40), random.range(2, 6));
    }
    noiseLayer(context, size, 20, 0.15, '#9a968c', '#f2efe8', 37);
  },
  ground(context, size) {
    context.fillStyle = '#e4e4e4';
    context.fillRect(0, 0, size, size);
    noiseLayer(context, size, 6, 0.5, '#c2c2c2', '#ffffff', 41);
    noiseLayer(context, size, 24, 0.35, '#cbcbcb', '#f6f6f6', 43);
  },
  crate(context, size, random) {
    painters.planks!(context, size, random);
    context.strokeStyle = '#3b2716';
    context.lineWidth = size * 0.07;
    context.strokeRect(size * 0.035, size * 0.035, size * 0.93, size * 0.93);
    context.beginPath();
    context.moveTo(size * 0.07, size * 0.07);
    context.lineTo(size * 0.93, size * 0.93);
    context.stroke();
  },
  fabric(context, size, random) {
    context.fillStyle = '#6d7a8a';
    context.fillRect(0, 0, size, size);
    for (let line = 0; line < size; line += 4) {
      context.fillStyle = 'rgba(0,0,0,0.08)';
      context.fillRect(0, line, size, 2);
      context.fillRect(line, 0, 2, size);
    }
    speckle(context, size, random, 500, ['#fff', '#333'], 1);
  },
};

export function texture(kind: keyof typeof painters, repeat = 1): THREE.CanvasTexture {
  return canvasTexture(kind, painters[kind]!, kind === 'ground' ? 256 : 512, repeat);
}

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function standard(key: string, create: () => THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const existing = materialCache.get(key);
  if (existing !== undefined) return existing;
  const material = create();
  materialCache.set(key, material);
  return material;
}

/** Surface texture size in metres for each role, used to scale box UVs to world units. */
export const TEXTURE_METRES: Record<PartRole, number> = {
  wall: 3, 'wall-inner': 3, floor: 2.5, roof: 3, trim: 2, glass: 1, stairs: 1.5, metal: 2, wood: 1.5, fabric: 1,
};

export function partMaterial(role: PartRole, style: BuildingStyle): THREE.MeshStandardMaterial {
  const wallKind = style === 'adobe' ? 'adobe' : style === 'bunker' ? 'concrete' : 'plaster';
  switch (role) {
    case 'wall':
    case 'wall-inner':
      return standard(`wall-${style}`, () => {
        const map = texture(wallKind === 'plaster' && style === 'village' ? 'plaster' : wallKind);
        return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 1.2, roughness: 0.92, metalness: 0 });
      });
    case 'floor':
      return standard(`floor-${style}`, () => {
        const map = texture(style === 'bunker' ? 'concrete' : 'planks');
        return new THREE.MeshStandardMaterial({ map, roughness: style === 'bunker' ? 0.85 : 0.7 });
      });
    case 'roof':
      return standard(`roof-${style}`, () => {
        const map = texture(style === 'village' ? 'tiles' : style === 'adobe' ? 'adobe' : 'metal');
        return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 2, roughness: style === 'bunker' ? 0.55 : 0.85, metalness: style === 'bunker' ? 0.5 : 0 });
      });
    case 'trim':
      return standard(`trim-${style}`, () => new THREE.MeshStandardMaterial({
        map: texture(style === 'village' ? 'planks' : 'concrete'), color: style === 'village' ? 0x8a7560 : 0xb0a898, roughness: 0.85,
      }));
    case 'glass':
      return standard('glass', () => new THREE.MeshStandardMaterial({
        color: 0x223038, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.45, envMapIntensity: 1.5,
      }));
    case 'stairs':
    case 'wood':
      return standard('wood', () => new THREE.MeshStandardMaterial({ map: texture('planks'), roughness: 0.75 }));
    case 'metal':
      return standard('metal', () => new THREE.MeshStandardMaterial({ map: texture('metal'), roughness: 0.5, metalness: 0.7 }));
    case 'fabric':
      return standard('fabric', () => new THREE.MeshStandardMaterial({ map: texture('fabric'), roughness: 0.95 }));
  }
}

export function namedMaterial(name: 'crate' | 'locker' | 'cabinet' | 'bark' | 'birch-bark' | 'rock' | 'ladder' | 'door' | 'portal-stone'): THREE.MeshStandardMaterial {
  return standard(`named-${name}`, () => {
    switch (name) {
      case 'crate': return new THREE.MeshStandardMaterial({ map: texture('crate'), roughness: 0.8 });
      case 'locker': return new THREE.MeshStandardMaterial({ map: texture('metal'), color: 0x587060, roughness: 0.45, metalness: 0.65 });
      case 'cabinet': return new THREE.MeshStandardMaterial({ map: texture('planks'), color: 0x9a7a5a, roughness: 0.6 });
      case 'bark': return new THREE.MeshStandardMaterial({ map: texture('bark'), bumpMap: texture('bark'), bumpScale: 3, roughness: 0.95 });
      case 'birch-bark': return new THREE.MeshStandardMaterial({ map: texture('birch-bark'), roughness: 0.85 });
      case 'rock': return new THREE.MeshStandardMaterial({ map: texture('concrete'), color: 0x9a9690, roughness: 0.95, bumpMap: texture('concrete'), bumpScale: 3 });
      case 'ladder': return new THREE.MeshStandardMaterial({ map: texture('metal'), roughness: 0.5, metalness: 0.75 });
      case 'door': return new THREE.MeshStandardMaterial({ map: texture('planks'), color: 0x7a5236, roughness: 0.65 });
      case 'portal-stone': return new THREE.MeshStandardMaterial({ map: texture('concrete'), color: 0x8c8a86, roughness: 0.9, bumpMap: texture('concrete'), bumpScale: 2 });
    }
  });
}

/** Box geometry whose UVs are scaled by the face size so textures keep a constant world-space density. */
export function worldBox(width: number, height: number, depth: number, metresPerTile: number): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const faceSizes: readonly (readonly [number, number])[] = [
    [depth, height], [depth, height], [width, depth], [width, depth], [width, height], [width, height],
  ];
  for (let face = 0; face < 6; face += 1) {
    const [u, v] = faceSizes[face]!;
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const index = face * 4 + vertex;
      uv.setXY(index, uv.getX(index) * u / metresPerTile, uv.getY(index) * v / metresPerTile);
    }
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Colour from sRGB components (how every palette value in this project is authored). */
export function srgb(r: number, g: number, b: number): THREE.Color {
  return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
}
