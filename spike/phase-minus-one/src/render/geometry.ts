export interface MeshData {
  readonly vertices: Float32Array;
  readonly indices: Uint16Array;
}

function pushVertex(target: number[], x: number, y: number, z: number, nx: number, ny: number, nz: number): void {
  target.push(x, y, z, nx, ny, nz);
}

export function createSphereGeometry(latitudeSegments = 10, longitudeSegments = 16): MeshData {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let latitude = 0; latitude <= latitudeSegments; latitude += 1) {
    const theta = (latitude / latitudeSegments) * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    for (let longitude = 0; longitude <= longitudeSegments; longitude += 1) {
      const phi = (longitude / longitudeSegments) * Math.PI * 2;
      const x = Math.cos(phi) * sinTheta;
      const y = cosTheta;
      const z = Math.sin(phi) * sinTheta;
      pushVertex(vertices, x, y, z, x, y, z);
    }
  }
  const stride = longitudeSegments + 1;
  for (let latitude = 0; latitude < latitudeSegments; latitude += 1) {
    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const first = latitude * stride + longitude;
      const second = first + stride;
      indices.push(first, second, first + 1, second, second + 1, first + 1);
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

interface CapsuleRing {
  readonly y: number;
  readonly radius: number;
  readonly normalY: number;
  readonly normalRadius: number;
}

export function createCapsuleGeometry(hemisphereSegments = 4, radialSegments = 12): MeshData {
  const rings: CapsuleRing[] = [];
  const radius = 0.25;
  const centerOffset = 0.25;
  for (let segment = 0; segment <= hemisphereSegments; segment += 1) {
    const angle = -Math.PI / 2 + (segment / hemisphereSegments) * (Math.PI / 2);
    rings.push({
      y: -centerOffset + Math.sin(angle) * radius,
      radius: Math.cos(angle) * radius,
      normalY: Math.sin(angle),
      normalRadius: Math.cos(angle),
    });
  }
  rings.push({ y: centerOffset, radius, normalY: 0, normalRadius: 1 });
  for (let segment = 1; segment <= hemisphereSegments; segment += 1) {
    const angle = (segment / hemisphereSegments) * (Math.PI / 2);
    rings.push({
      y: centerOffset + Math.sin(angle) * radius,
      radius: Math.cos(angle) * radius,
      normalY: Math.sin(angle),
      normalRadius: Math.cos(angle),
    });
  }

  const vertices: number[] = [];
  const indices: number[] = [];
  for (const ring of rings) {
    for (let radial = 0; radial <= radialSegments; radial += 1) {
      const angle = (radial / radialSegments) * Math.PI * 2;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      pushVertex(
        vertices,
        cosine * ring.radius,
        ring.y,
        sine * ring.radius,
        cosine * ring.normalRadius,
        ring.normalY,
        sine * ring.normalRadius,
      );
    }
  }
  const stride = radialSegments + 1;
  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let radial = 0; radial < radialSegments; radial += 1) {
      const first = ring * stride + radial;
      const second = first + stride;
      indices.push(first, second, first + 1, second, second + 1, first + 1);
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

export function createFloorGeometry(): MeshData {
  return {
    vertices: new Float32Array([
      -1, 0, -1, 0, 1, 0,
      1, 0, -1, 0, 1, 0,
      1, 0, 1, 0, 1, 0,
      -1, 0, 1, 0, 1, 0,
    ]),
    indices: new Uint16Array([0, 2, 1, 0, 3, 2]),
  };
}

