export interface MeshData {
  readonly vertices: Float32Array;
  readonly indices: Uint16Array;
}

export function createCube(): MeshData {
  return {
    vertices: new Float32Array([
      -0.5, -0.5, 0.5, 0, 0, 1, 0.5, -0.5, 0.5, 0, 0, 1, 0.5, 0.5, 0.5, 0, 0, 1, -0.5, 0.5, 0.5, 0, 0, 1,
      0.5, -0.5, -0.5, 0, 0, -1, -0.5, -0.5, -0.5, 0, 0, -1, -0.5, 0.5, -0.5, 0, 0, -1, 0.5, 0.5, -0.5, 0, 0, -1,
      -0.5, -0.5, -0.5, -1, 0, 0, -0.5, -0.5, 0.5, -1, 0, 0, -0.5, 0.5, 0.5, -1, 0, 0, -0.5, 0.5, -0.5, -1, 0, 0,
      0.5, -0.5, 0.5, 1, 0, 0, 0.5, -0.5, -0.5, 1, 0, 0, 0.5, 0.5, -0.5, 1, 0, 0, 0.5, 0.5, 0.5, 1, 0, 0,
      -0.5, 0.5, 0.5, 0, 1, 0, 0.5, 0.5, 0.5, 0, 1, 0, 0.5, 0.5, -0.5, 0, 1, 0, -0.5, 0.5, -0.5, 0, 1, 0,
      -0.5, -0.5, -0.5, 0, -1, 0, 0.5, -0.5, -0.5, 0, -1, 0, 0.5, -0.5, 0.5, 0, -1, 0, -0.5, -0.5, 0.5, 0, -1, 0,
    ]),
    indices: new Uint16Array([
      0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11,
      12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
    ]),
  };
}

export function createSphere(longitudeSegments = 16, latitudeSegments = 12): MeshData {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let latitude = 0; latitude <= latitudeSegments; latitude += 1) {
    const vertical = latitude / latitudeSegments;
    const polar = vertical * Math.PI;
    const y = Math.cos(polar);
    const ringRadius = Math.sin(polar);
    for (let longitude = 0; longitude <= longitudeSegments; longitude += 1) {
      const azimuth = (longitude / longitudeSegments) * Math.PI * 2;
      const x = Math.cos(azimuth) * ringRadius;
      const z = Math.sin(azimuth) * ringRadius;
      vertices.push(x, y, z, x, y, z);
    }
  }
  for (let latitude = 0; latitude < latitudeSegments; latitude += 1) {
    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const first = latitude * (longitudeSegments + 1) + longitude;
      const second = first + longitudeSegments + 1;
      indices.push(first, second, first + 1, second, second + 1, first + 1);
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

export function createCapsule(radialSegments = 12, capSegments = 4): MeshData {
  const profile: { y: number; radius: number; normalY: number; normalRadius: number }[] = [];
  for (let segment = 0; segment <= capSegments; segment += 1) {
    const angle = -Math.PI / 2 + (segment / capSegments) * (Math.PI / 2);
    profile.push({ y: -0.5 + Math.sin(angle), radius: Math.cos(angle), normalY: Math.sin(angle), normalRadius: Math.cos(angle) });
  }
  profile.push({ y: 0.5, radius: 1, normalY: 0, normalRadius: 1 });
  for (let segment = 1; segment <= capSegments; segment += 1) {
    const angle = (segment / capSegments) * (Math.PI / 2);
    profile.push({ y: 0.5 + Math.sin(angle), radius: Math.cos(angle), normalY: Math.sin(angle), normalRadius: Math.cos(angle) });
  }
  const vertices: number[] = [];
  const indices: number[] = [];
  for (const ring of profile) {
    for (let radial = 0; radial <= radialSegments; radial += 1) {
      const angle = (radial / radialSegments) * Math.PI * 2;
      const x = Math.cos(angle);
      const z = Math.sin(angle);
      vertices.push(x * ring.radius, ring.y, z * ring.radius, x * ring.normalRadius, ring.normalY, z * ring.normalRadius);
    }
  }
  for (let ring = 0; ring < profile.length - 1; ring += 1) {
    for (let radial = 0; radial < radialSegments; radial += 1) {
      const first = ring * (radialSegments + 1) + radial;
      const second = first + radialSegments + 1;
      indices.push(first, second, first + 1, second, second + 1, first + 1);
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

/**
 * A unit box (-0.5..0.5) with rounded edges of the given radius. Grid lines are packed near the edges so the
 * bevel reads smoothly; triangles wind counter-clockwise when viewed from outside.
 */
export function createRoundedBox(radius = 0.1, detailed = true): MeshData {
  const r = Math.max(0.001, Math.min(0.49, radius));
  const coordinates = detailed
    ? [-0.5, -0.5 + r * 0.3, -0.5 + r, 0, 0.5 - r, 0.5 - r * 0.3, 0.5]
    : [-0.5, 0.5];
  const faces: readonly (readonly [readonly number[], readonly number[], readonly number[]])[] = [
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  ];
  const inner = 0.5 - r;
  const vertices: number[] = [];
  const indices: number[] = [];
  const count = coordinates.length;
  for (const [normal, tangent, bitangent] of faces) {
    const base = vertices.length / 6;
    for (const b of coordinates) {
      for (const a of coordinates) {
        const px = normal[0]! * 0.5 + tangent[0]! * a + bitangent[0]! * b;
        const py = normal[1]! * 0.5 + tangent[1]! * a + bitangent[1]! * b;
        const pz = normal[2]! * 0.5 + tangent[2]! * a + bitangent[2]! * b;
        const cx = Math.max(-inner, Math.min(inner, px));
        const cy = Math.max(-inner, Math.min(inner, py));
        const cz = Math.max(-inner, Math.min(inner, pz));
        const dx = px - cx; const dy = py - cy; const dz = pz - cz;
        const length = Math.hypot(dx, dy, dz);
        const nx = length > 1e-6 ? dx / length : normal[0]!;
        const ny = length > 1e-6 ? dy / length : normal[1]!;
        const nz = length > 1e-6 ? dz / length : normal[2]!;
        vertices.push(cx + nx * r, cy + ny * r, cz + nz * r, nx, ny, nz);
      }
    }
    for (let row = 0; row < count - 1; row += 1) {
      for (let column = 0; column < count - 1; column += 1) {
        const first = base + row * count + column;
        const above = first + count;
        indices.push(first, first + 1, above + 1, first, above + 1, above);
      }
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}
