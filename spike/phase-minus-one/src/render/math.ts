export function perspective(out: Float32Array, fieldOfView: number, aspect: number, near: number, far: number): void {
  const scale = 1 / Math.tan(fieldOfView / 2);
  out.fill(0);
  out[0] = scale / aspect;
  out[5] = scale;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
}

export function lookAt(
  out: Float32Array,
  eyeX: number,
  eyeY: number,
  eyeZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
): void {
  let zX = eyeX - targetX;
  let zY = eyeY - targetY;
  let zZ = eyeZ - targetZ;
  let inverseLength = 1 / Math.hypot(zX, zY, zZ);
  zX *= inverseLength;
  zY *= inverseLength;
  zZ *= inverseLength;
  let xX = zZ;
  let xY = 0;
  let xZ = -zX;
  inverseLength = 1 / Math.hypot(xX, xY, xZ);
  xX *= inverseLength;
  xY *= inverseLength;
  xZ *= inverseLength;
  const yX = zY * xZ - zZ * xY;
  const yY = zZ * xX - zX * xZ;
  const yZ = zX * xY - zY * xX;
  out.set([
    xX, yX, zX, 0,
    xY, yY, zY, 0,
    xZ, yZ, zZ, 0,
    -(xX * eyeX + xY * eyeY + xZ * eyeZ),
    -(yX * eyeX + yY * eyeY + yZ * eyeZ),
    -(zX * eyeX + zY * eyeY + zZ * eyeZ),
    1,
  ]);
}

export function multiplyMatrix4(out: Float32Array, left: Float32Array, right: Float32Array): void {
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let value = 0;
      for (let index = 0; index < 4; index += 1) {
        value += left[index * 4 + row]! * right[column * 4 + index]!;
      }
      out[column * 4 + row] = value;
    }
  }
}

export function writeTranslationScaleMatrix(
  target: Float32Array,
  offset: number,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
): void {
  target.set([
    scaleX, 0, 0, 0,
    0, scaleY, 0, 0,
    0, 0, scaleZ, 0,
    x, y, z, 1,
  ], offset);
}

export function writeCapsuleMatrix(
  target: Float32Array,
  offset: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  radius: number,
): void {
  const deltaX = bx - ax;
  const deltaY = by - ay;
  const deltaZ = bz - az;
  const length = Math.max(1e-6, Math.hypot(deltaX, deltaY, deltaZ));
  const yX = deltaX / length;
  const yY = deltaY / length;
  const yZ = deltaZ / length;
  const referenceX = Math.abs(yY) > 0.95 ? 1 : 0;
  const referenceY = Math.abs(yY) > 0.95 ? 0 : 1;
  let xX = referenceY * yZ;
  let xY = -referenceX * yZ;
  let xZ = referenceX * yY - referenceY * yX;
  const inverseXLength = 1 / Math.max(1e-6, Math.hypot(xX, xY, xZ));
  xX *= inverseXLength;
  xY *= inverseXLength;
  xZ *= inverseXLength;
  const zX = yY * xZ - yZ * xY;
  const zY = yZ * xX - yX * xZ;
  const zZ = yX * xY - yY * xX;
  target.set([
    xX * radius * 4, xY * radius * 4, xZ * radius * 4, 0,
    yX * length, yY * length, yZ * length, 0,
    zX * radius * 4, zY * radius * 4, zZ * radius * 4, 0,
    (ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5, 1,
  ], offset);
}

