import { CELL_SIZE, PLAYER_EYE_HEIGHT } from '../sim/constants';
import { cellCenter, LEVEL_HEIGHT, LEVEL_WIDTH, wallCells } from '../sim/level';
import {
  DEFAULT_RENDER_PRESENTATION_SETTINGS,
  type RenderGameState,
  type RenderPresentationSettings,
} from './render-model';
import { createCube } from './geometry';
import { lookAt, multiplyMatrix4, perspective, writeTranslationScale } from './math';
import { DavelRenderer } from './davel-renderer';
import type { Chapter01LevelId } from '../content/level-ids';
import { chapter01Level } from '../content/levels/chapter-01';
import { paletteRuntimeProfile, type RuntimeRgb } from '../content/runtime-manifests';
import { freezeDanceWindow } from '../sim/level-mechanics';
import type { PulseEnergyCellEffect } from './presentation-particles';
import type { BombDetonationEffect } from './bomb-detonation';

const MAX_INSTANCES = 512;
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
out vec3 vWorld;
out float vDistance;
void main() {
  mat4 model = mat4(aMatrix0, aMatrix1, aMatrix2, aMatrix3);
  vec4 world = model * vec4(aPosition, 1.0);
  vNormal = normalize(mat3(model) * aNormal);
  vColor = aColor;
  vWorld = world.xyz;
  vec4 clip = uViewProjection * world;
  vDistance = clip.w;
  gl_Position = clip;
}`;
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
in vec3 vWorld;
in float vDistance;
uniform vec3 uFogColor;
out vec4 outColor;
void main() {
  vec3 normal = normalize(vNormal);
  vec3 light = normalize(vec3(0.45, 0.9, 0.25));
  float diffuse = max(dot(normal, light), 0.0);
  vec3 color = vColor * (0.48 + diffuse * 0.52);
  if (normal.y > 0.8 && vWorld.y < 0.2) {
    vec2 grid = abs(fract(vWorld.xz / 3.0) - 0.5);
    float line = 1.0 - smoothstep(0.455, 0.49, max(grid.x, grid.y));
    color = mix(color, color * 0.72, line * 0.32);
  }
  float fog = smoothstep(25.0, 48.0, vDistance);
  outColor = vec4(mix(color, uFogColor, fog), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error('Unable to allocate shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compilation failed');
  return shader;
}

function program(gl: WebGL2RenderingContext): WebGLProgram {
  const result = gl.createProgram();
  if (result === null) throw new Error('Unable to allocate shader program');
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(result, vertex);
  gl.attachShader(result, fragment);
  gl.linkProgram(result);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result) ?? 'Shader link failed');
  return result;
}

export class WorldRenderer {
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly matrixBuffer: WebGLBuffer;
  private readonly colorBuffer: WebGLBuffer;
  private readonly viewProjectionLocation: WebGLUniformLocation;
  private readonly fogColorLocation: WebGLUniformLocation;
  private readonly matrices = new Float32Array(MAX_INSTANCES * 16);
  private readonly colors = new Float32Array(MAX_INSTANCES * 3);
  private readonly projection = new Float32Array(16);
  private readonly view = new Float32Array(16);
  private readonly viewProjection = new Float32Array(16);
  private readonly indexCount: number;
  private readonly davels: DavelRenderer;
  private instanceCount = 0;
  private staticInstanceCount = 0;
  private worldLevelId: Chapter01LevelId = 'level-001';
  private skyColor: RuntimeRgb = [0.32, 0.83, 1];

  constructor(private readonly gl: WebGL2RenderingContext, private readonly canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.program = program(gl);
    this.davels = new DavelRenderer(gl);
    const vao = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    const matrixBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    if (vao === null || vertexBuffer === null || indexBuffer === null || matrixBuffer === null || colorBuffer === null) {
      throw new Error('Unable to allocate world renderer buffers');
    }
    this.vao = vao;
    this.matrixBuffer = matrixBuffer;
    this.colorBuffer = colorBuffer;
    const mesh = createCube();
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
    const viewProjectionUniform = gl.getUniformLocation(this.program, 'uViewProjection');
    const fogColorUniform = gl.getUniformLocation(this.program, 'uFogColor');
    if (viewProjectionUniform === null || fogColorUniform === null) throw new Error('World shader uniform is unavailable');
    this.viewProjectionLocation = viewProjectionUniform;
    this.fogColorLocation = fogColorUniform;
    this.buildWorldInstances(this.worldLevelId);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
  }

  resize(cssWidth?: number, cssHeight?: number, requestedPixelRatio?: number): void {
    const htmlCanvas = typeof HTMLCanvasElement !== 'undefined' && this.canvas instanceof HTMLCanvasElement
      ? this.canvas : null;
    const width = cssWidth ?? htmlCanvas?.clientWidth ?? this.canvas.width;
    const height = cssHeight ?? htmlCanvas?.clientHeight ?? this.canvas.height;
    const pixelRatio = Math.min(requestedPixelRatio ?? (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1), 2);
    this.canvas.width = Math.max(1, Math.floor(width * pixelRatio));
    this.canvas.height = Math.max(1, Math.floor(height * pixelRatio));
  }

  emitPulseEnergyCell(effect: PulseEnergyCellEffect): void { this.davels.emitPulseEnergyCell(effect); }

  emitBombDetonation(effect: BombDetonationEffect): void { this.davels.emitBombDetonation(effect); }

  clearPresentationEffects(): void { this.davels.clearPresentationEffects(); }

  render(state: RenderGameState, settings = DEFAULT_RENDER_PRESENTATION_SETTINGS): void {
    const { gl } = this;
    if (state.levelId !== this.worldLevelId) {
      this.worldLevelId = state.levelId;
      this.buildWorldInstances(state.levelId);
    }
    this.buildDynamicInstances(state, settings);
    const player = state.player;
    const eyeY = PLAYER_EYE_HEIGHT + Math.sin(player.bobPhase) * 0.025 * settings.motionScale;
    const cosPitch = Math.cos(player.pitch);
    const directionX = Math.sin(player.yaw) * cosPitch;
    const directionY = Math.sin(player.pitch);
    const directionZ = -Math.cos(player.yaw) * cosPitch;
    perspective(this.projection, Math.PI / 2.8, this.canvas.width / this.canvas.height, 0.06, 70);
    lookAt(this.view, player.x, eyeY, player.z, player.x + directionX, eyeY + directionY, player.z + directionZ);
    multiplyMatrix4(this.viewProjection, this.projection, this.view);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const freezeFlash = freezeDanceWindow(state.levelId, state.tick).frozen;
    const flashMix = freezeFlash ? 0.42 * settings.flashScale : 0;
    const fogColor: RuntimeRgb = flashMix > 0
      ? [this.skyColor[0] * (1 - flashMix) + flashMix, this.skyColor[1] * (1 - flashMix) + flashMix, this.skyColor[2] * (1 - flashMix) + flashMix]
      : this.skyColor;
    gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.viewProjectionLocation, false, this.viewProjection);
    gl.uniform3f(this.fogColorLocation, fogColor[0], fogColor[1], fogColor[2]);
    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0, this.instanceCount);
    this.davels.render(state, this.viewProjection, settings.motionScale, settings.flashScale, settings.qualityTier);
  }

  private buildWorldInstances(levelId: Chapter01LevelId): void {
    let instance = 0;
    const level = chapter01Level(levelId);
    const palette = paletteRuntimeProfile(level.palette.presetId);
    this.skyColor = palette.sky;
    instance = this.writeInstance(
      instance, 0, -0.14, 0, LEVEL_WIDTH * CELL_SIZE, 0.28, LEVEL_HEIGHT * CELL_SIZE,
      palette.floor,
    );
    for (const wall of wallCells(levelId)) {
      const center = cellCenter(wall.column, wall.row);
      instance = this.writeInstance(
        instance, center.x, 1.55, center.z, CELL_SIZE, 3.1, CELL_SIZE,
        palette.walls[(wall.column + wall.row * 3 + level.number - 1) % palette.walls.length]!,
      );
    }
    this.staticInstanceCount = instance;
    this.uploadInstances(instance);
  }

  private buildDynamicInstances(state: RenderGameState, settings: RenderPresentationSettings): void {
    let instance = this.staticInstanceCount;
    const bob = Math.sin(state.tick * 0.08) * 0.12 * settings.motionScale;
    for (const pickup of state.level.pickups) {
      if (!pickup.active) continue;
      if (pickup.kind === 'key') {
        instance = this.writeInstance(instance, pickup.x, 0.72 + bob, pickup.z, 0.18, 0.75, 0.18, [1, 0.92, 0.12]);
        instance = this.writeInstance(instance, pickup.x + 0.28, 0.48 + bob, pickup.z, 0.55, 0.18, 0.18, [1, 0.66, 0.08]);
      } else if (pickup.kind === 'health') {
        instance = this.writeInstance(instance, pickup.x, 0.55 + bob, pickup.z, 0.22, 0.9, 0.22, [0.3, 1, 0.36]);
        instance = this.writeInstance(instance, pickup.x, 0.55 + bob, pickup.z, 0.82, 0.22, 0.22, [0.3, 1, 0.36]);
      } else if (pickup.kind === 'coin') {
        instance = this.writeInstance(instance, pickup.x, 0.55 + bob, pickup.z, 0.68, 0.16, 0.68, [1, 0.78, 0.08]);
      } else {
        instance = this.writeInstance(instance, pickup.x, 0.55 + bob, pickup.z, 0.52, 0.9, 0.52, [0.12, 0.94, 1]);
      }
    }
    for (const hazard of state.level.hazards) {
      if (hazard.kind === 'timed-door') {
        const gateColor: readonly [number, number, number] = hazard.active ? [1, 0.12, 0.62] : [0.12, 1, 0.72];
        const dimColor: readonly [number, number, number] = hazard.active ? [0.56, 0.08, 0.42] : [0.08, 0.56, 0.48];
        instance = this.writeInstance(instance, hazard.x, 0.04, hazard.z, 2.72, 0.08, 2.72, dimColor);
        for (const [offsetX, offsetZ] of [[-1.14, -1.14], [1.14, -1.14], [-1.14, 1.14], [1.14, 1.14]] as const) {
          instance = this.writeInstance(instance, hazard.x + offsetX, 1.25, hazard.z + offsetZ, 0.18, 2.5, 0.18, gateColor);
        }
        if (hazard.active) {
          const pulseHeight = 0.68 + Math.sin(state.tick * 0.14) * 0.12 * settings.motionScale;
          instance = this.writeInstance(instance, hazard.x, pulseHeight, hazard.z, 2.55, 0.12, 0.12, [1, 0.72, 0.95]);
          instance = this.writeInstance(instance, hazard.x, 1.58, hazard.z, 0.12, 0.12, 2.55, [1, 0.72, 0.95]);
        }
        continue;
      }
      const color: readonly [number, number, number] = hazard.active ? [1, 0.22, 0.08] : [0.25, 0.32, 0.4];
      instance = this.writeInstance(
        instance, hazard.x, 0.035, hazard.z, hazard.halfWidth * 2, 0.07, hazard.halfDepth * 2, color,
      );
      const pulse = 0.5 + (state.tick % 36 / 36 - 0.5) * settings.motionScale;
      instance = this.writeInstance(
        instance,
        hazard.x + hazard.directionX * (pulse - 0.5) * hazard.halfWidth * 1.4,
        0.085,
        hazard.z + hazard.directionZ * (pulse - 0.5) * hazard.halfDepth * 1.4,
        0.3, 0.1, 0.3,
        hazard.active ? [1, 0.92, 0.16] : [0.46, 0.5, 0.55],
      );
    }
    const door = state.level.door;
    if (!door.open) {
      instance = this.writeInstance(instance, door.x, 1.25, door.z, 2.55, 2.5, 0.24, state.level.keyCollected ? [1, 0.78, 0.12] : [0.86, 0.12, 0.2]);
    } else {
      instance = this.writeInstance(instance, door.x - 1.16, 1.25, door.z, 0.22, 2.5, 0.28, [0.2, 1, 0.56]);
      instance = this.writeInstance(instance, door.x + 1.16, 1.25, door.z, 0.22, 2.5, 0.28, [0.2, 1, 0.56]);
    }
    const checkpoint = state.level.checkpoint;
    instance = this.writeInstance(
      instance, checkpoint.x, 0.06, checkpoint.z, 1.2, 0.12, 1.2,
      checkpoint.activated ? [0.2, 1, 0.72] : [0.18, 0.42, 0.72],
    );
    if (checkpoint.activated) {
      instance = this.writeInstance(instance, checkpoint.x, 0.85, checkpoint.z, 0.1, 1.55, 0.1, [0.36, 1, 0.88]);
    }
    const exit = state.level.exit;
    const exitColor: readonly [number, number, number] = state.level.objectiveComplete ? [0.22, 1, 0.48] : [0.28, 0.3, 0.42];
    instance = this.writeInstance(instance, exit.x - 0.72, 1.2, exit.z, 0.22, 2.4, 0.28, exitColor);
    instance = this.writeInstance(instance, exit.x + 0.72, 1.2, exit.z, 0.22, 2.4, 0.28, exitColor);
    instance = this.writeInstance(instance, exit.x, 2.3, exit.z, 1.65, 0.22, 0.28, exitColor);
    this.uploadInstances(instance);
  }

  private writeInstance(
    instance: number,
    x: number, y: number, z: number,
    sx: number, sy: number, sz: number,
    color: readonly [number, number, number],
  ): number {
    if (instance >= MAX_INSTANCES) throw new Error('World instance capacity exceeded');
    writeTranslationScale(this.matrices, instance * 16, x, y, z, sx, sy, sz);
    this.colors.set(color, instance * 3);
    return instance + 1;
  }

  private uploadInstances(instance: number): void {
    this.instanceCount = instance;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.matrixBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.matrices.subarray(0, instance * 16), this.gl.DYNAMIC_DRAW);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.colors.subarray(0, instance * 3), this.gl.DYNAMIC_DRAW);
  }
}
