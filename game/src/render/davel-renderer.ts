import type { MeshData } from './geometry';
import { createCapsule, createSphere } from './geometry';
import { ROBOT_DEFINITIONS, type RobotDefinition } from '../sim/robots';
import { BODY_POINT } from '../sim/xpbd';
import { PLAYER_EYE_HEIGHT } from '../sim/constants';
import type { RenderGameState, RenderRobotState } from './render-model';

type Color = readonly [number, number, number];
interface Point { readonly x: number; readonly y: number; readonly z: number }

const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aMatrix0;
layout(location=3) in vec4 aMatrix1;
layout(location=4) in vec4 aMatrix2;
layout(location=5) in vec4 aMatrix3;
layout(location=6) in vec3 aColor;
uniform mat4 uViewProjection;
out vec3 vNormal;
out vec3 vColor;
out float vGlow;
void main() {
  mat4 model = mat4(aMatrix0, aMatrix1, aMatrix2, aMatrix3);
  vec4 world = model * vec4(aPosition, 1.0);
  vNormal = normalize(mat3(model) * aNormal);
  vColor = aColor;
  vGlow = max(max(aColor.r, aColor.g), aColor.b);
  gl_Position = uViewProjection * world;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
in float vGlow;
out vec4 outColor;
void main() {
  vec3 normal = normalize(vNormal);
  vec3 light = normalize(vec3(-0.35, 0.82, 0.45));
  float diffuse = max(dot(normal, light), 0.0);
  float rim = pow(1.0 - abs(normal.z), 2.0) * 0.12;
  vec3 color = vColor * (0.52 + diffuse * 0.55 + rim);
  outColor = vec4(color, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error('Unable to allocate Davel shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Davel shader compilation failed');
  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const result = gl.createProgram();
  if (result === null) throw new Error('Unable to allocate Davel program');
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(result, vertex);
  gl.attachShader(result, fragment);
  gl.linkProgram(result);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result) ?? 'Davel program link failed');
  return result;
}

class InstanceBatch {
  private readonly vao: WebGLVertexArrayObject;
  private readonly matrixBuffer: WebGLBuffer;
  private readonly colorBuffer: WebGLBuffer;
  private readonly matrices: Float32Array;
  private readonly colors: Float32Array;
  private readonly indexCount: number;
  count = 0;

  constructor(private readonly gl: WebGL2RenderingContext, mesh: MeshData, capacity: number) {
    const vao = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    const matrixBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    if (vao === null || vertexBuffer === null || indexBuffer === null || matrixBuffer === null || colorBuffer === null) {
      throw new Error('Unable to allocate Davel mesh buffers');
    }
    this.vao = vao;
    this.matrixBuffer = matrixBuffer;
    this.colorBuffer = colorBuffer;
    this.matrices = new Float32Array(capacity * 16);
    this.colors = new Float32Array(capacity * 3);
    this.indexCount = mesh.indices.length;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, matrixBuffer);
    for (let column = 0; column < 4; column += 1) {
      const location = 2 + column;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 64, column * 16);
      gl.vertexAttribDivisor(location, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 3, gl.FLOAT, false, 12, 0);
    gl.vertexAttribDivisor(6, 1);
  }

  reset(): void { this.count = 0; }

  addMatrix(matrix: readonly number[], color: Color): void {
    if ((this.count + 1) * 16 > this.matrices.length) throw new Error('Davel instance capacity exceeded');
    this.matrices.set(matrix, this.count * 16);
    this.colors.set(color, this.count * 3);
    this.count += 1;
  }

  draw(): void {
    if (this.count === 0) return;
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.matrices.subarray(0, this.count * 16), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors.subarray(0, this.count * 3), gl.DYNAMIC_DRAW);
    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0, this.count);
  }
}

function ellipsoidMatrix(point: Point, xScale: number, yScale: number, zScale: number): number[] {
  return [xScale, 0, 0, 0, 0, yScale, 0, 0, 0, 0, zScale, 0, point.x, point.y, point.z, 1];
}

function capsuleMatrix(start: Point, end: Point, radius: number): number[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const length = Math.max(0.01, Math.hypot(dx, dy, dz));
  const yx = dx / length;
  const yy = dy / length;
  const yz = dz / length;
  let xx = Math.abs(yy) > 0.94 ? 1 : yz;
  let xy = 0;
  let xz = Math.abs(yy) > 0.94 ? 0 : -yx;
  const xLength = Math.max(0.001, Math.hypot(xx, xy, xz));
  xx /= xLength; xy /= xLength; xz /= xLength;
  const zx = xy * yz - xz * yy;
  const zy = xz * yx - xx * yz;
  const zz = xx * yy - xy * yx;
  const yScale = length / 3;
  return [
    xx * radius, xy * radius, xz * radius, 0,
    yx * yScale, yy * yScale, yz * yScale, 0,
    zx * radius, zy * radius, zz * radius, 0,
    (start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2, 1,
  ];
}

function localPoint(robot: RenderRobotState, localX: number, localY: number, localZ: number): Point {
  const rightX = Math.cos(robot.heading);
  const rightZ = -Math.sin(robot.heading);
  const forwardX = Math.sin(robot.heading);
  const forwardZ = Math.cos(robot.heading);
  return {
    x: robot.x + rightX * localX + forwardX * localZ,
    y: localY,
    z: robot.z + rightZ * localX + forwardZ * localZ,
  };
}

interface Pose {
  readonly hip: Point;
  readonly chest: Point;
  readonly head: Point;
  readonly leftElbow: Point;
  readonly rightElbow: Point;
  readonly leftHand: Point;
  readonly rightHand: Point;
  readonly leftKnee: Point;
  readonly rightKnee: Point;
  readonly leftFoot: Point;
  readonly rightFoot: Point;
}

function bodyPoint(robot: RenderRobotState, point: number): Point {
  const offset = point * 3;
  return {
    x: robot.body.positions[offset]!,
    y: robot.body.positions[offset + 1]!,
    z: robot.body.positions[offset + 2]!,
  };
}

function pose(robot: RenderRobotState): Pose {
  return {
    hip: bodyPoint(robot, BODY_POINT.hip),
    chest: bodyPoint(robot, BODY_POINT.chest),
    head: bodyPoint(robot, BODY_POINT.head),
    leftElbow: bodyPoint(robot, BODY_POINT.leftElbow),
    rightElbow: bodyPoint(robot, BODY_POINT.rightElbow),
    leftHand: bodyPoint(robot, BODY_POINT.leftHand),
    rightHand: bodyPoint(robot, BODY_POINT.rightHand),
    leftKnee: bodyPoint(robot, BODY_POINT.leftKnee),
    rightKnee: bodyPoint(robot, BODY_POINT.rightKnee),
    leftFoot: bodyPoint(robot, BODY_POINT.leftFoot),
    rightFoot: bodyPoint(robot, BODY_POINT.rightFoot),
  };
}

function blendPoint(stable: Point, animated: Point, animatedWeight: number): Point {
  return {
    x: stable.x + (animated.x - stable.x) * animatedWeight,
    y: stable.y + (animated.y - stable.y) * animatedWeight,
    z: stable.z + (animated.z - stable.z) * animatedWeight,
  };
}

function motionScaledPose(robot: RenderRobotState, definition: RobotDefinition, motionScale: number): Pose {
  const animated = pose(robot);
  const scale = definition.scale;
  const width = definition.torsoWidth * scale;
  const stable: Pose = {
    hip: localPoint(robot, 0, 0.82 * scale, 0),
    chest: localPoint(robot, 0, 1.34 * scale, 0),
    head: localPoint(robot, 0, 1.92 * scale, 0),
    leftElbow: localPoint(robot, -0.5 * width, 1.26 * scale, 0),
    rightElbow: localPoint(robot, 0.5 * width, 1.26 * scale, 0),
    leftHand: localPoint(robot, -0.56 * width, 0.88 * scale, 0.04 * scale),
    rightHand: localPoint(robot, 0.56 * width, 0.88 * scale, 0.04 * scale),
    leftKnee: localPoint(robot, -0.18 * scale, 0.45 * scale, 0),
    rightKnee: localPoint(robot, 0.18 * scale, 0.45 * scale, 0),
    leftFoot: localPoint(robot, -0.21 * scale, 0.1 * scale, 0.08 * scale),
    rightFoot: localPoint(robot, 0.21 * scale, 0.1 * scale, 0.08 * scale),
  };
  const animatedWeight = 0.16 + Math.max(0, Math.min(1, motionScale)) * 0.84;
  return {
    hip: blendPoint(stable.hip, animated.hip, animatedWeight),
    chest: blendPoint(stable.chest, animated.chest, animatedWeight),
    head: blendPoint(stable.head, animated.head, animatedWeight),
    leftElbow: blendPoint(stable.leftElbow, animated.leftElbow, animatedWeight),
    rightElbow: blendPoint(stable.rightElbow, animated.rightElbow, animatedWeight),
    leftHand: blendPoint(stable.leftHand, animated.leftHand, animatedWeight),
    rightHand: blendPoint(stable.rightHand, animated.rightHand, animatedWeight),
    leftKnee: blendPoint(stable.leftKnee, animated.leftKnee, animatedWeight),
    rightKnee: blendPoint(stable.rightKnee, animated.rightKnee, animatedWeight),
    leftFoot: blendPoint(stable.leftFoot, animated.leftFoot, animatedWeight),
    rightFoot: blendPoint(stable.rightFoot, animated.rightFoot, animatedWeight),
  };
}

function blendColor(from: Color, to: Color, amount: number): Color {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

export class DavelRenderer {
  private readonly program: WebGLProgram;
  private readonly viewProjectionLocation: WebGLUniformLocation;
  private readonly spheres: InstanceBatch;
  private readonly capsules: InstanceBatch;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.program = createProgram(gl);
    const uniform = gl.getUniformLocation(this.program, 'uViewProjection');
    if (uniform === null) throw new Error('Davel view projection uniform is unavailable');
    this.viewProjectionLocation = uniform;
    this.spheres = new InstanceBatch(gl, createSphere(), 640);
    this.capsules = new InstanceBatch(gl, createCapsule(), 384);
  }

  render(state: RenderGameState, viewProjection: Float32Array, motionScale = 1, flashScale = 1): void {
    this.spheres.reset();
    this.capsules.reset();
    for (const robot of state.robots) {
      if (robot.active) this.addRobot(robot, ROBOT_DEFINITIONS[robot.id]!, motionScale, flashScale);
    }
    for (const projectile of state.projectiles) {
      const center = { x: projectile.x, y: projectile.y, z: projectile.z };
      const trail = {
        x: projectile.x - projectile.velocityX * 0.055,
        y: projectile.y - projectile.velocityY * 0.055,
        z: projectile.z - projectile.velocityZ * 0.055,
      };
      if (projectile.kind === 'fireball') {
        this.addCapsule(trail, center, 0.15, [1, 0.08, 0.02]);
        this.addSphere(center, 0.3, [1, 0.28, 0.035]);
        this.addSphere(center, 0.14, [1, 0.96, 0.38]);
      } else if (projectile.kind === 'slider-bolt') {
        this.addCapsule(trail, center, 0.08, [0.12, 0.72, 1]);
        this.addSphere(center, 0.13, [0.58, 0.95, 1]);
      } else {
        this.addCapsule(trail, center, 0.075, [1, 0.18, 0.72]);
        this.addSphere(center, 0.16, [1, 0.82, 0.08]);
        this.addSphere(center, 0.075, [1, 1, 0.72]);
      }
    }
    for (const bomb of state.playerBombs) {
      const center = { x: bomb.x, y: bomb.y, z: bomb.z };
      const pulse = 0.19 + Math.sin(bomb.fuseTicks * 0.35) * 0.025 * motionScale;
      this.addSphere(center, pulse, [0.08, 0.1, 0.16]);
      this.addSphere(
        { x: bomb.x, y: bomb.y + 0.15, z: bomb.z }, 0.07,
        bomb.fuseTicks < 30 ? [1, 0.12, 0.04] : [1, 0.72, 0.08],
      );
    }
    if (state.laserActive) {
      const player = state.player;
      const cosPitch = Math.cos(player.pitch);
      const directionX = Math.sin(player.yaw) * cosPitch;
      const directionY = Math.sin(player.pitch);
      const directionZ = -Math.cos(player.yaw) * cosPitch;
      const start = { x: player.x, y: PLAYER_EYE_HEIGHT - 0.09, z: player.z };
      const end = {
        x: start.x + directionX * state.laserBeamDistance,
        y: start.y + directionY * state.laserBeamDistance,
        z: start.z + directionZ * state.laserBeamDistance,
      };
      this.addCapsule(start, end, 0.035, state.laserFocusTicks > 45 ? [1, 0.22, 0.52] : [0.18, 1, 0.9]);
      this.addSphere(end, 0.1, [0.8, 1, 1]);
    }
    this.gl.useProgram(this.program);
    this.gl.uniformMatrix4fv(this.viewProjectionLocation, false, viewProjection);
    this.capsules.draw();
    this.spheres.draw();
  }

  private addSphere(point: Point, radius: number, color: Color, yScale = 1, zScale = 1): void {
    this.spheres.addMatrix(ellipsoidMatrix(point, radius, radius * yScale, radius * zScale), color);
  }

  private addCapsule(start: Point, end: Point, radius: number, color: Color): void {
    this.capsules.addMatrix(capsuleMatrix(start, end, radius), color);
  }

  private addRobot(
    robot: RenderRobotState, definition: RobotDefinition, motionScale: number, flashScale: number,
  ): void {
    const p = motionScale < 1 ? motionScaledPose(robot, definition, motionScale) : pose(robot);
    const scale = definition.scale;
    const jointColor: Color = [0.055, 0.075, 0.14];
    const bodyColor: Color = robot.hitFlashTicks > 0 ? blendColor(definition.bodyColor, [1, 1, 1], flashScale)
      : robot.combatState === 'telegraph' ? [1, 0.22, 0.16] : definition.bodyColor;
    const accentColor: Color = robot.hitFlashTicks > 0 ? blendColor(definition.accentColor, [0.6, 1, 1], flashScale)
      : robot.tempoBuffTicks > 0 ? [0.18, 1, 0.72] : definition.accentColor;
    const shoulderLeft = localPoint(robot, -0.36 * definition.torsoWidth * scale, p.chest.y, 0);
    const shoulderRight = localPoint(robot, 0.36 * definition.torsoWidth * scale, p.chest.y, 0);
    const hipLeft = localPoint(robot, -0.2 * scale, p.hip.y, 0);
    const hipRight = localPoint(robot, 0.2 * scale, p.hip.y, 0);
    this.addSphere(p.chest, 0.39 * definition.torsoWidth * scale, bodyColor, 1.32, 0.82);
    if (robot.hitFlashTicks > 0 && flashScale > 0) {
      const travel = (7 - robot.hitFlashTicks) * 0.075;
      for (let index = 0; index < 4; index += 1) {
        const angle = robot.id * 1.37 + index * Math.PI * 0.5 + robot.hitFlashTicks * 0.11;
        this.addSphere({
          x: p.chest.x + Math.cos(angle) * (0.36 * scale + travel),
          y: p.chest.y + (index - 1.5) * 0.13 + travel * 0.35,
          z: p.chest.z + Math.sin(angle) * (0.36 * scale + travel),
        }, 0.055 * scale * flashScale, index % 2 === 0 ? [1, 0.92, 0.18] : [0.25, 1, 1]);
      }
    }
    this.addSphere(p.hip, 0.33 * definition.torsoWidth * scale, accentColor, 0.82, 0.78);
    this.addCapsule(shoulderLeft, p.leftElbow, 0.105 * scale, bodyColor);
    this.addCapsule(p.leftElbow, p.leftHand, 0.09 * scale, accentColor);
    this.addCapsule(shoulderRight, p.rightElbow, 0.105 * scale, bodyColor);
    this.addCapsule(p.rightElbow, p.rightHand, 0.09 * scale, accentColor);
    this.addCapsule(hipLeft, p.leftKnee, 0.12 * scale, bodyColor);
    this.addCapsule(p.leftKnee, p.leftFoot, 0.105 * scale, accentColor);
    this.addCapsule(hipRight, p.rightKnee, 0.12 * scale, bodyColor);
    this.addCapsule(p.rightKnee, p.rightFoot, 0.105 * scale, accentColor);
    for (const joint of [shoulderLeft, shoulderRight, p.leftElbow, p.rightElbow, p.leftKnee, p.rightKnee]) {
      this.addSphere(joint, 0.13 * scale, jointColor, 0.82, 0.82);
    }
    this.addSphere(p.leftHand, 0.15 * scale, accentColor, 0.88, 0.88);
    this.addSphere(p.rightHand, 0.15 * scale, accentColor, 0.88, 0.88);
    this.addSphere(p.leftFoot, 0.17 * scale, jointColor, 0.62, 1.35);
    this.addSphere(p.rightFoot, 0.17 * scale, jointColor, 0.62, 1.35);
    const headRadius = 0.37 * definition.headScale * scale;
    this.addSphere(p.head, headRadius, bodyColor, 0.9, 0.83);
    const eyeY = p.head.y + headRadius * 0.13;
    const eyeForward = headRadius * 0.78;
    const eyeLeft = localPoint(robot, -headRadius * 0.36, eyeY, eyeForward);
    const eyeRight = localPoint(robot, headRadius * 0.36, eyeY, eyeForward);
    this.addSphere(eyeLeft, headRadius * 0.15, definition.eyeColor, 1.25, 0.55);
    this.addSphere(eyeRight, headRadius * 0.15, definition.eyeColor, 1.25, 0.55);
    if (definition.archetype === 'blue-slider') {
      this.addCapsule(eyeLeft, eyeRight, headRadius * 0.14, [0.08, 0.16, 0.34]);
    }
    const browLeftStart = localPoint(robot, -headRadius * 0.53, eyeY + headRadius * 0.22, eyeForward * 1.01);
    const browLeftEnd = localPoint(robot, -headRadius * 0.16, eyeY + headRadius * 0.13, eyeForward * 1.03);
    const browRightStart = localPoint(robot, headRadius * 0.53, eyeY + headRadius * 0.22, eyeForward * 1.01);
    const browRightEnd = localPoint(robot, headRadius * 0.16, eyeY + headRadius * 0.13, eyeForward * 1.03);
    this.addCapsule(browLeftStart, browLeftEnd, headRadius * 0.045, jointColor);
    this.addCapsule(browRightStart, browRightEnd, headRadius * 0.045, jointColor);
    const smileLeft = localPoint(robot, -headRadius * 0.42, eyeY - headRadius * 0.36, eyeForward * 1.02);
    const smileMiddle = localPoint(robot, 0, eyeY - headRadius * 0.48, eyeForward * 1.06);
    const smileRight = localPoint(robot, headRadius * 0.42, eyeY - headRadius * 0.36, eyeForward * 1.02);
    this.addCapsule(smileLeft, smileMiddle, headRadius * 0.045, jointColor);
    this.addCapsule(smileMiddle, smileRight, headRadius * 0.045, jointColor);
    if (definition.archetype === 'red-firemouth') {
      const nozzleBase = localPoint(robot, 0, eyeY - headRadius * 0.38, eyeForward * 0.84);
      const nozzleTip = localPoint(robot, 0, eyeY - headRadius * 0.38, eyeForward * 1.55);
      this.addCapsule(nozzleBase, nozzleTip, headRadius * 0.2, [0.18, 0.07, 0.05]);
      this.addSphere(nozzleTip, headRadius * 0.22, robot.combatState === 'telegraph' ? [1, 0.78, 0.08] : [0.45, 0.1, 0.04]);
    }
    if (definition.archetype === 'cyan-dj') {
      this.addSphere(shoulderLeft, 0.25 * scale, [0.04, 0.12, 0.18], 1.15, 0.68);
      this.addSphere(shoulderRight, 0.25 * scale, [0.04, 0.12, 0.18], 1.15, 0.68);
      this.addSphere(shoulderLeft, 0.11 * scale, accentColor, 1.15, 0.45);
      this.addSphere(shoulderRight, 0.11 * scale, accentColor, 1.15, 0.45);
    }
    const antennaBase = localPoint(robot, 0, p.head.y + headRadius * 0.8, 0);
    const antennaTip = localPoint(robot, (robot.id % 2 === 0 ? -0.08 : 0.08) * scale, p.head.y + headRadius * 1.35, 0);
    this.addCapsule(antennaBase, antennaTip, 0.045 * scale, jointColor);
    this.addSphere(antennaTip, 0.105 * scale, accentColor);
    if (definition.rank === 'boss') {
      const crownY = p.head.y + headRadius * 0.92;
      for (const offset of [-0.48, 0, 0.48]) {
        const base = localPoint(robot, offset * headRadius, crownY, 0);
        const tip = localPoint(robot, offset * headRadius * 0.82, crownY + headRadius * (offset === 0 ? 0.72 : 0.55), 0);
        this.addCapsule(base, tip, headRadius * 0.07, [1, 0.68, 0.06]);
        this.addSphere(tip, headRadius * 0.11, robot.bossPhase === 3 ? [1, 0.08, 0.2] : [1, 0.9, 0.2]);
      }
      const phaseColor: Color = robot.bossPhase === 1 ? [1, 0.72, 0.08]
        : robot.bossPhase === 2 ? [1, 0.28, 0.08] : [1, 0.05, 0.42];
      this.addSphere(p.chest, 0.5 * scale, phaseColor, 1.15, 0.72);
    }
  }
}
