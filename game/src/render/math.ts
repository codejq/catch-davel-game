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
  let inverseLength = 1 / Math.max(1e-8, Math.hypot(zX, zY, zZ));
  zX *= inverseLength;
  zY *= inverseLength;
  zZ *= inverseLength;
  let xX = zZ;
  let xZ = -zX;
  inverseLength = 1 / Math.max(1e-8, Math.hypot(xX, xZ));
  xX *= inverseLength;
  xZ *= inverseLength;
  const yX = zY * xZ;
  const yY = zZ * xX - zX * xZ;
  const yZ = -zY * xX;
  out.set([
    xX, yX, zX, 0,
    0, yY, zY, 0,
    xZ, yZ, zZ, 0,
    -(xX * eyeX + xZ * eyeZ),
    -(yX * eyeX + yY * eyeY + yZ * eyeZ),
    -(zX * eyeX + zY * eyeY + zZ * eyeZ),
    1,
  ]);
}

export function multiplyMatrix4(out: Float32Array, left: Float32Array, right: Float32Array): void {
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let value = 0;
      for (let index = 0; index < 4; index += 1) value += left[index * 4 + row]! * right[column * 4 + index]!;
      out[column * 4 + row] = value;
    }
  }
}

export function writeTranslationScale(
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

export function orthographic(
  out: Float32Array, left: number, right: number, bottom: number, top: number, near: number, far: number,
): void {
  out.fill(0);
  out[0] = 2 / (right - left);
  out[5] = 2 / (top - bottom);
  out[10] = -2 / (far - near);
  out[12] = -(right + left) / (right - left);
  out[13] = -(top + bottom) / (top - bottom);
  out[14] = -(far + near) / (far - near);
  out[15] = 1;
}
