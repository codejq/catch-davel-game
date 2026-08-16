import type { MeshData } from './geometry';
import { createCapsule, createSphere } from './geometry';
import { ROBOT_DEFINITIONS, type RobotDefinition } from '../sim/robots';
import { BODY_POINT } from '../sim/xpbd';
import { PLAYER_EYE_HEIGHT } from '../sim/constants';
import { RENDER_QUALITY_PROFILES, type RenderQualityTier } from './quality';
import type { RenderGameState, RenderRobotState } from './render-model';
import { davelExpression, type DavelExpression } from './davel-expression';
import { davelAccessory } from './davel-accessory';
import { CoinBurstTracker, coinBurstPoint } from './coin-burst';
import {
  PulseEnergyCellTracker, fireballSmokePuff, mechanicalFragmentSegment, pulseEnergyCellSegment,
  type PulseEnergyCellEffect,
} from './presentation-particles';
import { isDanceWeakPointActive } from '../sim/dance-timing';
import { weakPointPosition, weakPointRadius } from '../sim/weak-point';
import {
  BombDetonationTracker, bombFlashRadius, bombPressureRingSegment, bombRadialSparkSegment,
  type BombDetonationEffect,
} from './bomb-detonation';
import { laserContactSparkSegment } from './laser-contact';
import { SwordArcTracker, swordArcSegment, type SwordArcEffect } from './sword-arc';
import { bombPreviewSegment } from './bomb-preview';
import {
  PulseImpactTracker, pulseImpactFlashRadius, pulseImpactSparkSegment, type PulseImpactEffect,
} from './pulse-impact';
import { PULSE_IMPACT_KIND } from '../sim/combat';
import {
  DefeatCollapseTracker, defeatCollapsePose, type DefeatCollapseEffect,
} from './defeat-collapse';
import { combatStateMarkers } from './combat-state-markers';

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
layout(location=7) in float aEmission;
uniform mat4 uViewProjection;
out vec3 vNormal;
out vec3 vColor;
out float vGlow;
out float vEmission;
void main() {
  mat4 model = mat4(aMatrix0, aMatrix1, aMatrix2, aMatrix3);
  vec4 world = model * vec4(aPosition, 1.0);
  vNormal = normalize(mat3(model) * aNormal);
  vColor = aColor;
  vGlow = max(max(aColor.r, aColor.g), aColor.b);
  vEmission = aEmission;
  gl_Position = uViewProjection * world;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
in float vGlow;
in float vEmission;
out vec4 outColor;
void main() {
  vec3 normal = normalize(vNormal);
  vec3 light = normalize(vec3(-0.35, 0.82, 0.45));
  float diffuse = max(dot(normal, light), 0.0);
  float rim = pow(1.0 - abs(normal.z), 2.0) * 0.12;
  vec3 color = vColor * (0.52 + diffuse * 0.55 + rim);
  color = mix(color, vColor, clamp(vEmission, 0.0, 1.0));
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
  private readonly emissionBuffer: WebGLBuffer;
  private readonly matrices: Float32Array;
  private readonly colors: Float32Array;
  private readonly emissions: Float32Array;
  private readonly indexCount: number;
  count = 0;

  constructor(private readonly gl: WebGL2RenderingContext, mesh: MeshData, capacity: number) {
    const vao = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    const matrixBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    const emissionBuffer = gl.createBuffer();
    if (vao === null || vertexBuffer === null || indexBuffer === null || matrixBuffer === null
      || colorBuffer === null || emissionBuffer === null) {
      throw new Error('Unable to allocate Davel mesh buffers');
    }
    this.vao = vao;
    this.matrixBuffer = matrixBuffer;
    this.colorBuffer = colorBuffer;
    this.emissionBuffer = emissionBuffer;
    this.matrices = new Float32Array(capacity * 16);
    this.colors = new Float32Array(capacity * 3);
    this.emissions = new Float32Array(capacity);
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
    gl.bindBuffer(gl.ARRAY_BUFFER, emissionBuffer);
    gl.enableVertexAttribArray(7);
    gl.vertexAttribPointer(7, 1, gl.FLOAT, false, 4, 0);
    gl.vertexAttribDivisor(7, 1);
  }

  reset(): void { this.count = 0; }

  addMatrix(matrix: readonly number[], color: Color, emission = 0): void {
    if ((this.count + 1) * 16 > this.matrices.length) throw new Error('Davel instance capacity exceeded');
    this.matrices.set(matrix, this.count * 16);
    this.colors.set(color, this.count * 3);
    this.emissions[this.count] = emission;
    this.count += 1;
  }

  draw(): void {
    if (this.count === 0) return;
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.matrices.subarray(0, this.count * 16), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors.subarray(0, this.count * 3), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.emissionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.emissions.subarray(0, this.count), gl.DYNAMIC_DRAW);
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

function shiftPoint(point: Point, robot: RenderRobotState, forward: number, vertical: number): Point {
  return {
    x: point.x + Math.sin(robot.heading) * forward,
    y: point.y + vertical,
    z: point.z + Math.cos(robot.heading) * forward,
  };
}

function expressionPose(
  base: Pose, robot: RenderRobotState, definition: RobotDefinition, expression: DavelExpression,
): Pose {
  const scale = definition.scale;
  return {
    ...base,
    head: shiftPoint(base.head, robot, expression.headLean * scale, -Math.max(0, -expression.headLean) * scale),
    leftHand: shiftPoint(base.leftHand, robot, expression.handReach * scale, expression.handLift * scale),
    rightHand: shiftPoint(base.rightHand, robot, expression.handReach * scale, expression.handLift * scale),
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
  private readonly coinBursts = new CoinBurstTracker();
  private readonly defeatCollapses = new DefeatCollapseTracker();
  private readonly pulseEnergyCells = new PulseEnergyCellTracker();
  private readonly pulseImpacts = new PulseImpactTracker();
  private readonly bombDetonations = new BombDetonationTracker();
  private readonly swordArcs = new SwordArcTracker();

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.program = createProgram(gl);
    const uniform = gl.getUniformLocation(this.program, 'uViewProjection');
    if (uniform === null) throw new Error('Davel view projection uniform is unavailable');
    this.viewProjectionLocation = uniform;
    this.spheres = new InstanceBatch(gl, createSphere(), 1024);
    this.capsules = new InstanceBatch(gl, createCapsule(), 1024);
  }

  emitPulseEnergyCell(effect: PulseEnergyCellEffect): void { this.pulseEnergyCells.emit(effect); }

  emitPulseImpact(effect: PulseImpactEffect): void { this.pulseImpacts.emit(effect); }

  emitBombDetonation(effect: BombDetonationEffect): void { this.bombDetonations.emit(effect); }

  emitSwordArc(effect: SwordArcEffect): void { this.swordArcs.emit(effect); }

  clearPresentationEffects(): void {
    this.coinBursts.reset();
    this.defeatCollapses.reset();
    this.pulseEnergyCells.clear();
    this.pulseImpacts.clear();
    this.bombDetonations.clear();
    this.swordArcs.clear();
  }

  render(
    state: RenderGameState, viewProjection: Float32Array, motionScale = 1, flashScale = 1,
    qualityTier: RenderQualityTier = 'high',
  ): void {
    this.spheres.reset();
    this.capsules.reset();
    const quality = RENDER_QUALITY_PROFILES[qualityTier];
    const weakPointsActive = isDanceWeakPointActive(state.levelId, state.tick);
    const coinBursts = this.coinBursts.update(state);
    const defeatCollapses = this.defeatCollapses.update(state);
    for (const effect of coinBursts) {
      for (let coinIndex = 0; coinIndex < quality.coinBurstCount; coinIndex += 1) {
        const current = coinBurstPoint(effect, state.tick, coinIndex, state.player, motionScale);
        const previous = coinBurstPoint(effect, Math.max(effect.startTick, state.tick - 1), coinIndex, state.player, motionScale);
        if (state.tick > effect.startTick) this.addCapsule(previous, current, current.scale * 0.28, [1, 0.54, 0.04]);
        this.addSphere(current, current.scale, coinIndex % 2 === 0 ? [1, 0.9, 0.2] : [1, 0.58, 0.05], 1.3, 0.28);
      }
      for (let fragmentIndex = 0; fragmentIndex < quality.defeatFragmentCount; fragmentIndex += 1) {
        const fragment = mechanicalFragmentSegment(effect, state.tick, fragmentIndex, motionScale);
        if (fragment !== null) this.addCapsule(
          fragment.start, fragment.end, fragment.radius,
          fragmentIndex % 2 === 0 ? [0.24, 0.3, 0.4] : [0.52, 0.24, 0.12],
        );
      }
    }
    for (const effect of this.pulseEnergyCells.update(state.tick)) {
      const cell = pulseEnergyCellSegment(effect, state.tick, motionScale);
      if (cell === null) continue;
      this.addCapsule(cell.start, cell.end, cell.radius, [0.08, 0.28, 0.42]);
      this.addSphere(cell.center, cell.glowRadius, [0.24, 1, 0.96], 0.72, 0.72);
      this.addSphere(cell.start, cell.radius * 1.08, [1, 0.68, 0.12], 0.82, 0.82);
      this.addSphere(cell.end, cell.radius * 1.08, [1, 0.68, 0.12], 0.82, 0.82);
    }
    for (const effect of this.pulseImpacts.update(state.tick)) {
      const sparkCount = motionScale === 0 ? Math.min(2, quality.pulseImpactSparkCount) : quality.pulseImpactSparkCount;
      const primary: Color = effect.kind === PULSE_IMPACT_KIND.robot ? [0.22, 1, 0.96]
        : effect.kind === PULSE_IMPACT_KIND.wall ? [1, 0.68, 0.12] : [0.32, 0.8, 1];
      for (let sparkIndex = 0; sparkIndex < sparkCount; sparkIndex += 1) {
        const spark = pulseImpactSparkSegment(effect, state.tick, sparkIndex, motionScale);
        if (spark === null) continue;
        const color: Color = sparkIndex % 2 === 0 ? primary : [1, 0.94, 0.5];
        this.addCapsule(spark.start, spark.end, spark.radius, color);
        this.addSphere(spark.end, spark.radius * 1.35, color);
      }
      const flashRadius = pulseImpactFlashRadius(effect, state.tick, flashScale);
      if (flashRadius !== null) this.addSphere(effect, flashRadius, primary);
    }
    for (const effect of this.bombDetonations.update(state.tick)) {
      for (let segmentIndex = 0; segmentIndex < quality.bombPressureRingSegments; segmentIndex += 1) {
        const segment = bombPressureRingSegment(
          effect, state.tick, segmentIndex, quality.bombPressureRingSegments, motionScale,
        );
        if (segment !== null) this.addCapsule(
          segment.start, segment.end, segment.radius,
          segmentIndex % 2 === 0 ? [1, 0.26, 0.035] : [1, 0.78, 0.08],
        );
      }
      const sparkCount = motionScale === 0 ? Math.min(2, quality.bombSparkCount) : quality.bombSparkCount;
      for (let sparkIndex = 0; sparkIndex < sparkCount; sparkIndex += 1) {
        const spark = bombRadialSparkSegment(effect, state.tick, sparkIndex, motionScale);
        if (spark === null) continue;
        this.addCapsule(spark.start, spark.end, spark.radius, sparkIndex % 2 === 0 ? [1, 0.9, 0.2] : [1, 0.22, 0.05]);
        this.addSphere(spark.end, spark.radius * 1.4, [1, 0.62, 0.08]);
      }
      const flashRadius = bombFlashRadius(effect, state.tick, flashScale);
      if (flashRadius !== null) {
        this.addSphere({ x: effect.x, y: Math.max(0.2, effect.y), z: effect.z }, flashRadius, [1, 0.92, 0.42]);
      }
    }
    for (const effect of this.swordArcs.update(state.tick)) {
      for (let segmentIndex = 0; segmentIndex < quality.swordArcSegmentCount; segmentIndex += 1) {
        const segment = swordArcSegment(
          effect, state.tick, segmentIndex, quality.swordArcSegmentCount, motionScale,
        );
        if (segment === null) continue;
        const colorProgress = segmentIndex / Math.max(1, quality.swordArcSegmentCount - 1);
        const color: Color = effect.charged
          ? [1, 0.22 + colorProgress * 0.64, 0.7 - colorProgress * 0.42]
          : [0.3 + colorProgress * 0.62, 1, 1];
        this.addCapsule(segment.start, segment.end, segment.radius, color);
        if (segmentIndex === quality.swordArcSegmentCount - 1) {
          this.addSphere(segment.end, segment.radius, color);
        }
      }
    }
    for (const robot of state.robots) {
      if (robot.active) this.addRobot(
        robot, ROBOT_DEFINITIONS[robot.id]!, motionScale, flashScale,
        quality.hitSparkCount, weakPointsActive,
      );
    }
    for (const effect of defeatCollapses) this.addDefeatCollapse(effect, state.tick, motionScale);
    for (const projectile of state.projectiles) {
      const center = { x: projectile.x, y: projectile.y, z: projectile.z };
      const trail = {
        x: projectile.x - projectile.velocityX * 0.055,
        y: projectile.y - projectile.velocityY * 0.055,
        z: projectile.z - projectile.velocityZ * 0.055,
      };
      if (projectile.kind === 'fireball') {
        for (let puffIndex = quality.fireSmokeCount - 1; puffIndex >= 0; puffIndex -= 1) {
          const puff = fireballSmokePuff(projectile, puffIndex, motionScale);
          this.addSphere(puff, puff.radius, puff.color, 1.1, 0.7);
        }
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
      for (let segmentIndex = 0; segmentIndex < quality.bombPreviewSegmentCount; segmentIndex += 1) {
        const segment = bombPreviewSegment(
          bomb, segmentIndex, quality.bombPreviewSegmentCount, motionScale, state.levelId,
        );
        if (segment === null) continue;
        const urgent = bomb.fuseTicks <= 30;
        this.addCapsule(
          segment.start, segment.end, segment.radius,
          urgent ? segmentIndex % 2 === 0 ? [1, 0.12, 0.04] : [1, 0.78, 0.08] : [0.2, 0.9, 1],
        );
      }
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
      const eye = { x: player.x, y: PLAYER_EYE_HEIGHT, z: player.z };
      const muzzleForward = Math.min(0.28, state.laserBeamDistance * 0.35);
      const start = {
        x: eye.x + directionX * muzzleForward,
        y: eye.y + directionY * muzzleForward - 0.12,
        z: eye.z + directionZ * muzzleForward,
      };
      const end = {
        x: eye.x + directionX * state.laserBeamDistance,
        y: eye.y + directionY * state.laserBeamDistance,
        z: eye.z + directionZ * state.laserBeamDistance,
      };
      const focused = state.laserFocusTicks > 45;
      this.addCapsule(start, end, focused ? 0.045 : 0.035, focused ? [1, 0.22, 0.52] : [0.18, 1, 0.9]);
      const contact = {
        x: end.x - directionX * 0.14,
        y: end.y - directionY * 0.14,
        z: end.z - directionZ * 0.14,
      };
      this.addSphere(contact, focused ? 0.14 : 0.1, focused ? [1, 0.72, 0.9] : [0.8, 1, 1]);
      const sparkCount = motionScale === 0
        ? Math.min(2, quality.laserContactSparkCount) : quality.laserContactSparkCount;
      for (let sparkIndex = 0; sparkIndex < sparkCount; sparkIndex += 1) {
        const spark = laserContactSparkSegment(
          contact, { x: directionX, y: directionY, z: directionZ },
          state.tick, sparkIndex, motionScale, state.laserFocusTicks,
        );
        this.addCapsule(
          spark.start, spark.end, spark.radius,
          sparkIndex % 2 === 0 ? [0.72, 1, 1] : focused ? [1, 0.2, 0.56] : [1, 0.94, 0.42],
        );
        this.addSphere(spark.end, spark.radius * 1.45, sparkIndex % 2 === 0 ? [0.72, 1, 1] : [1, 0.72, 0.24]);
      }
    }
    this.gl.useProgram(this.program);
    this.gl.uniformMatrix4fv(this.viewProjectionLocation, false, viewProjection);
    this.capsules.draw();
    this.spheres.draw();
  }

  private addSphere(point: Point, radius: number, color: Color, yScale = 1, zScale = 1, emission = 0): void {
    this.spheres.addMatrix(ellipsoidMatrix(point, radius, radius * yScale, radius * zScale), color, emission);
  }

  private addCapsule(start: Point, end: Point, radius: number, color: Color): void {
    this.capsules.addMatrix(capsuleMatrix(start, end, radius), color);
  }

  private addDefeatCollapse(effect: DefeatCollapseEffect, tick: number, motionScale: number): void {
    const collapse = defeatCollapsePose(effect, tick, motionScale);
    const definition = ROBOT_DEFINITIONS[effect.robotId];
    if (collapse === null || definition === undefined) return;
    const point = (index: number): Point => ({
      x: collapse.positions[index * 3]!,
      y: collapse.positions[index * 3 + 1]!,
      z: collapse.positions[index * 3 + 2]!,
    });
    const scale = definition.scale;
    const hip = point(BODY_POINT.hip);
    const chest = point(BODY_POINT.chest);
    const head = point(BODY_POINT.head);
    const jointColor: Color = [0.045, 0.055, 0.08];
    const bodyColor = blendColor(definition.bodyColor, [0.055, 0.065, 0.09], 0.34 + collapse.progress * 0.42);
    const accentColor = blendColor(definition.accentColor, [0.12, 0.08, 0.12], 0.28 + collapse.progress * 0.48);
    const shadowX = (hip.x + chest.x + head.x) / 3;
    const shadowZ = (hip.z + chest.z + head.z) / 3;
    this.addSphere({ x: shadowX, y: 0.04, z: shadowZ }, 0.72 * scale, [0.025, 0.035, 0.055], 0.045, 0.82);
    this.addSphere(hip, 0.31 * definition.torsoWidth * scale, accentColor, 0.82, 0.78);
    this.addSphere(chest, 0.37 * definition.torsoWidth * scale, bodyColor, 1.24, 0.82);
    this.addSphere(head, 0.35 * definition.headScale * scale, bodyColor, 0.88, 0.83);
    const links = [
      [BODY_POINT.hip, BODY_POINT.chest], [BODY_POINT.chest, BODY_POINT.head],
      [BODY_POINT.chest, BODY_POINT.leftElbow], [BODY_POINT.leftElbow, BODY_POINT.leftHand],
      [BODY_POINT.chest, BODY_POINT.rightElbow], [BODY_POINT.rightElbow, BODY_POINT.rightHand],
      [BODY_POINT.hip, BODY_POINT.leftKnee], [BODY_POINT.leftKnee, BODY_POINT.leftFoot],
      [BODY_POINT.hip, BODY_POINT.rightKnee], [BODY_POINT.rightKnee, BODY_POINT.rightFoot],
    ] as const;
    for (let index = 0; index < links.length; index += 1) {
      const [start, end] = links[index]!;
      this.addCapsule(point(start), point(end), (index < 2 ? 0.12 : 0.09) * scale,
        index % 2 === 0 ? bodyColor : accentColor);
    }
    for (const index of [
      BODY_POINT.leftElbow, BODY_POINT.leftHand, BODY_POINT.rightElbow, BODY_POINT.rightHand,
      BODY_POINT.leftKnee, BODY_POINT.leftFoot, BODY_POINT.rightKnee, BODY_POINT.rightFoot,
    ]) this.addSphere(point(index), 0.115 * scale, jointColor, 0.8, 0.8);
    this.addSphere(head, 0.1 * definition.headScale * scale, [1, 0.22, 0.08], 0.48, 0.42);
  }

  private addRobot(
    robot: RenderRobotState, definition: RobotDefinition, motionScale: number, flashScale: number,
    hitSparkCount: number, weakPointActive: boolean,
  ): void {
    const basePose = motionScale < 1 ? motionScaledPose(robot, definition, motionScale) : pose(robot);
    const expression = davelExpression(robot, motionScale);
    const p = expressionPose(basePose, robot, definition, expression);
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
    for (const marker of combatStateMarkers(robot, scale, motionScale)) {
      this.addSphere(marker, marker.radius, marker.color, marker.yScale, marker.zScale, marker.emission);
    }
    this.addSphere({ x: robot.x, y: 0.045, z: robot.z }, 0.62 * scale, [0.035, 0.055, 0.09], 0.055, 0.76);
    this.addSphere(p.chest, 0.39 * definition.torsoWidth * scale, bodyColor, 1.32, 0.82);
    if (weakPointActive) {
      const core = weakPointPosition(robot, definition);
      const radius = weakPointRadius(definition);
      this.addSphere(core, radius * 1.28, [0.06, 0.08, 0.15], 1.06, 0.45);
      this.addSphere(core, radius, [0.24, 1, 0.92], 1.08, 0.5);
      this.addSphere(core, radius * 0.42, [1, 1, 0.72], 1.12, 0.55);
    }
    if (robot.hitFlashTicks > 0 && flashScale > 0) {
      const travel = (7 - robot.hitFlashTicks) * 0.075;
      for (let index = 0; index < hitSparkCount; index += 1) {
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
    this.addSphere(eyeLeft, headRadius * 0.15, definition.eyeColor, 1.25 * expression.eyeOpen, 0.55);
    this.addSphere(eyeRight, headRadius * 0.15, definition.eyeColor, 1.25 * expression.eyeOpen, 0.55);
    const pupilY = eyeY + expression.pupilOffset * headRadius;
    const pupilLeft = localPoint(robot, headRadius * (-0.36 + expression.pupilCross), pupilY, eyeForward * 1.12);
    const pupilRight = localPoint(robot, headRadius * (0.36 - expression.pupilCross), pupilY, eyeForward * 1.12);
    this.addSphere(pupilLeft, headRadius * 0.065, [0.025, 0.035, 0.07], expression.eyeOpen, 0.42);
    this.addSphere(pupilRight, headRadius * 0.065, [0.025, 0.035, 0.07], expression.eyeOpen, 0.42);
    const browLeftStart = localPoint(robot, -headRadius * 0.53, eyeY + headRadius * 0.22, eyeForward * 1.01);
    const browLeftEnd = localPoint(robot, -headRadius * 0.16, eyeY + headRadius * (0.13 - expression.browPressure), eyeForward * 1.03);
    const browRightStart = localPoint(robot, headRadius * 0.53, eyeY + headRadius * 0.22, eyeForward * 1.01);
    const browRightEnd = localPoint(robot, headRadius * 0.16, eyeY + headRadius * (0.13 - expression.browPressure), eyeForward * 1.03);
    this.addCapsule(browLeftStart, browLeftEnd, headRadius * 0.045, jointColor);
    this.addCapsule(browRightStart, browRightEnd, headRadius * 0.045, jointColor);
    const smileLeft = localPoint(robot, -headRadius * 0.42, eyeY - headRadius * 0.36, eyeForward * 1.02);
    const smileMiddle = localPoint(robot, 0, eyeY - headRadius * (0.4 + expression.grinDepth), eyeForward * 1.06);
    const smileRight = localPoint(robot, headRadius * 0.42, eyeY - headRadius * 0.36, eyeForward * 1.02);
    this.addCapsule(smileLeft, smileMiddle, headRadius * 0.045, jointColor);
    this.addCapsule(smileMiddle, smileRight, headRadius * 0.045, jointColor);
    const mouthCenter = localPoint(robot, 0, eyeY - headRadius * 0.4, eyeForward * 1.025);
    this.addSphere(mouthCenter, headRadius * 0.24, [0.07, 0.025, 0.07], 0.45 + expression.mouthOpen, 0.22);
    if (robot.combatState === 'telegraph') {
      const toothLeft = localPoint(robot, -headRadius * 0.12, eyeY - headRadius * 0.33, eyeForward * 1.15);
      const toothRight = localPoint(robot, headRadius * 0.12, eyeY - headRadius * 0.33, eyeForward * 1.15);
      this.addSphere(toothLeft, headRadius * 0.055, [1, 0.95, 0.72], 1.35, 0.42);
      this.addSphere(toothRight, headRadius * 0.055, [1, 0.95, 0.72], 1.35, 0.42);
    }
    this.addAccessory(robot, p, definition, expression, headRadius, eyeLeft, eyeRight, shoulderLeft, shoulderRight,
      accentColor, jointColor);
  }

  private addAccessory(
    robot: RenderRobotState, p: Pose, definition: RobotDefinition, expression: DavelExpression,
    headRadius: number, eyeLeft: Point, eyeRight: Point, shoulderLeft: Point, shoulderRight: Point,
    accentColor: Color, jointColor: Color,
  ): void {
    const scale = definition.scale;
    const accessory = davelAccessory(robot.id);
    if (accessory === null) return;
    const point = (x: number, y: number, z = 0): Point => localPoint(robot, x, p.head.y + y, z);
    if (accessory === 'chicken-plume') {
      const root = point(0, headRadius * 0.78);
      for (const [x, y] of [[-0.3, 1.28], [0, 1.48], [0.3, 1.28]] as const) {
        const tip = point(x * headRadius, y * headRadius, -0.03 * scale);
        this.addCapsule(root, tip, headRadius * 0.075, [1, 0.28, 0.16]);
        this.addSphere(tip, headRadius * 0.12, [1, 0.78, 0.12]);
      }
    } else if (accessory === 'slider-fins') {
      this.addCapsule(eyeLeft, eyeRight, headRadius * 0.14, [0.08, 0.16, 0.34]);
      for (const side of [-1, 1] as const) {
        const base = point(side * headRadius * 0.72, headRadius * 0.08);
        const tip = point(side * headRadius * 1.16, headRadius * 0.28, -headRadius * 0.08);
        this.addCapsule(base, tip, headRadius * 0.09, accentColor);
      }
    } else if (accessory === 'tyrant-horns') {
      for (const side of [-1, 1] as const) {
        const base = point(side * headRadius * 0.48, headRadius * 0.65);
        const tip = point(side * headRadius * 1.02, headRadius * 1.24, -headRadius * 0.08);
        this.addCapsule(base, tip, headRadius * 0.09, [0.2, 0.04, 0.08]);
        this.addSphere(tip, headRadius * 0.1, [1, 0.82, 0.16]);
      }
    } else if (accessory === 'firemouth-nozzle') {
      const base = point(0, -headRadius * 0.25, headRadius * 0.82);
      const tip = point(0, -headRadius * 0.25, headRadius * 1.55);
      this.addCapsule(base, tip, headRadius * 0.2, [0.18, 0.07, 0.05]);
      this.addSphere(tip, headRadius * 0.22,
        robot.combatState === 'telegraph' ? [1, 0.78, 0.08] : [0.45, 0.1, 0.04]);
    } else if (accessory === 'spinner-flywheels') {
      for (const side of [-1, 1] as const) {
        const center = point(side * headRadius * 0.82, 0);
        this.addSphere(center, headRadius * 0.26, [0.08, 0.18, 0.42], 1, 0.42);
        this.addSphere(center, headRadius * 0.1, accentColor, 1.15, 0.5);
        for (let tooth = 0; tooth < 4; tooth += 1) {
          const angle = robot.danceTime * 2 + tooth * Math.PI * 0.5;
          const toothPoint = point(
            side * headRadius * 0.82 + Math.cos(angle) * headRadius * 0.32,
            Math.sin(angle) * headRadius * 0.32,
          );
          this.addSphere(toothPoint, headRadius * 0.07, [1, 0.78, 0.12]);
        }
      }
    } else if (accessory === 'dj-headphones') {
      const leftCup = point(-headRadius * 0.82, 0);
      const rightCup = point(headRadius * 0.82, 0);
      this.addSphere(leftCup, headRadius * 0.25, [0.04, 0.12, 0.18], 1.08, 0.65);
      this.addSphere(rightCup, headRadius * 0.25, [0.04, 0.12, 0.18], 1.08, 0.65);
      this.addSphere(leftCup, headRadius * 0.11, accentColor, 1.08, 0.5);
      this.addSphere(rightCup, headRadius * 0.11, accentColor, 1.08, 0.5);
      this.addCapsule(point(-headRadius * 0.72, headRadius * 0.22), point(0, headRadius * 0.92), headRadius * 0.08, jointColor);
      this.addCapsule(point(0, headRadius * 0.92), point(headRadius * 0.72, headRadius * 0.22), headRadius * 0.08, jointColor);
      this.addSphere(shoulderLeft, 0.25 * scale, [0.04, 0.12, 0.18], 1.15, 0.68);
      this.addSphere(shoulderRight, 0.25 * scale, [0.04, 0.12, 0.18], 1.15, 0.68);
    } else if (accessory === 'invoice-crown') {
      const crownY = headRadius * 0.92;
      for (const offset of [-0.48, 0, 0.48]) {
        const base = point(offset * headRadius, crownY);
        const tip = point(offset * headRadius * 0.82, crownY + headRadius * (offset === 0 ? 0.72 : 0.55));
        this.addCapsule(base, tip, headRadius * 0.07, [1, 0.68, 0.06]);
        this.addSphere(tip, headRadius * 0.11,
          robot.bossPhase === 3 ? [1, 0.08, 0.2] : [1, 0.9, 0.2]);
      }
      const phaseColor: Color = robot.bossPhase === 1 ? [1, 0.72, 0.08]
        : robot.bossPhase === 2 ? [1, 0.28, 0.08] : [1, 0.05, 0.42];
      this.addSphere(p.chest, 0.5 * scale, phaseColor, 1.15, 0.72);
    } else if (accessory === 'foreman-hardhat') {
      this.addSphere(point(0, headRadius * 0.79), headRadius * 0.72, [1, 0.58, 0.04], 0.38, 0.92);
      this.addCapsule(point(-headRadius * 0.84, headRadius * 0.72),
        point(headRadius * 0.84, headRadius * 0.72), headRadius * 0.09, [0.24, 0.08, 0.03]);
      this.addSphere(shoulderLeft, 0.27 * scale, [0.32, 0.07, 0.03], 0.65, 1.2);
      this.addSphere(shoulderRight, 0.27 * scale, [0.32, 0.07, 0.03], 0.65, 1.2);
    } else if (accessory === 'gear-ears') {
      for (const side of [-1, 1] as const) {
        const center = point(side * headRadius * 0.82, 0);
        this.addSphere(center, headRadius * 0.24, [0.08, 0.22, 0.3], 1, 0.5);
        for (let tooth = 0; tooth < 4; tooth += 1) {
          const angle = tooth * Math.PI * 0.5 + Math.PI * 0.25;
          this.addSphere(point(
            side * headRadius * 0.82 + Math.cos(angle) * headRadius * 0.28,
            Math.sin(angle) * headRadius * 0.28,
          ), headRadius * 0.065, accentColor);
        }
      }
    } else if (accessory === 'jester-bells') {
      const root = point(0, headRadius * 0.75);
      for (const side of [-1, 1] as const) {
        const middle = point(side * headRadius * 0.5, headRadius * 1.18, -headRadius * 0.08);
        const tip = point(side * headRadius * 0.86, headRadius * 0.9, -headRadius * 0.04);
        this.addCapsule(root, middle, headRadius * 0.075, side < 0 ? [0.2, 0.9, 1] : [0.96, 0.18, 1]);
        this.addCapsule(middle, tip, headRadius * 0.075, side < 0 ? [0.2, 0.9, 1] : [0.96, 0.18, 1]);
        this.addSphere(tip, headRadius * 0.14, [1, 0.88, 0.18]);
      }
    } else if (accessory === 'crook-top-hat') {
      this.addSphere(point(0, headRadius * 0.8), headRadius * 0.86, [0.06, 0.08, 0.18], 0.22, 0.92);
      this.addSphere(point(0, headRadius * 1.22), headRadius * 0.52, [0.08, 0.1, 0.24], 0.92, 0.82);
      this.addSphere(point(0, headRadius * 1.03), headRadius * 0.55, accentColor, 0.13, 0.84);
    }
    if (accessory !== 'invoice-crown' && accessory !== 'foreman-hardhat'
      && accessory !== 'crook-top-hat' && accessory !== 'jester-bells') {
      const antennaBase = point(0, headRadius * 0.8);
      const antennaDirection = robot.id % 2 === 0 ? -1 : 1;
      const antennaTip = point(
        (antennaDirection * 0.08 + expression.antennaSway) * scale, headRadius * 1.35,
      );
      this.addCapsule(antennaBase, antennaTip, 0.045 * scale, jointColor);
      this.addSphere(antennaTip, 0.105 * scale, accentColor);
    }
  }
}
