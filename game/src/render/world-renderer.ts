import { CELL_SIZE, PLAYER_EYE_HEIGHT } from '../sim/constants';
import { cellCenter, LEVEL_HEIGHT, LEVEL_ORIGIN_X, LEVEL_ORIGIN_Z, LEVEL_WIDTH, wallCells } from '../sim/level';
import {
  DEFAULT_RENDER_PRESENTATION_SETTINGS,
  type RenderGameState,
  type RenderPresentationSettings,
} from './render-model';
import { createCube } from './geometry';
import { lookAt, multiplyMatrix4, perspective, writeTranslationScale } from './math';
import { DavelRenderer } from './davel-renderer';
import type { PlayableLevelId } from '../content/level-ids';
import { campaignLevel } from '../content/levels/catalog';
import { paletteRuntimeProfile, type RuntimeRgb } from '../content/runtime-manifests';
import { freezeDanceWindow, magentaDrainRiseProgress } from '../sim/level-mechanics';
import type { PulseEnergyCellEffect } from './presentation-particles';
import type { BombDetonationEffect } from './bomb-detonation';
import type { SwordArcEffect } from './sword-arc';
import type { PulseImpactEffect } from './pulse-impact';
import { campaignLandmarkLayout, exitBeaconBoxes, type EnvironmentBox } from './environment-landmarks';
import { visibilityPulseFog } from './visibility-pulse';
import { WallArtRenderer } from './wall-art-renderer';
import {
  applyLightingUniforms, DEPTH_FRAGMENT_SHADER, LIGHTING_FUNCTIONS_GLSL, LIGHTING_UNIFORMS_GLSL,
  lightingUniformLocations, linkProgram, shaderVariant, type LightingFrame, type LightingUniformLocations,
} from './lighting-glsl';
import { createFallbackShadowTexture, SHADOW_TEXTURE_UNIT, ShadowMap } from './shadow-map';
import { PostProcessor } from './post-process';
import { skyGradient } from './sky-palette';
import type { RenderQualityTier } from './quality';

const MAX_INSTANCES = 512;
const OCCUPANCY_TEXTURE_UNIT = 1;
const SHADOW_MAP_SIZES: Readonly<Record<RenderQualityTier, number>> = { low: 0, medium: 1024, high: 2048 };
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
layout(location=8) in float aMaterial;
uniform mat4 uViewProjection;
out vec3 vNormal;
out vec3 vColor;
out vec3 vWorld;
out float vDistance;
out float vEmission;
flat out float vMaterial;
void main() {
  mat4 model = mat4(aMatrix0, aMatrix1, aMatrix2, aMatrix3);
  vec4 world = model * vec4(aPosition, 1.0);
  vNormal = normalize(mat3(model) * aNormal);
  vColor = aColor;
  vWorld = world.xyz;
  vec4 clip = uViewProjection * world;
  vDistance = clip.w;
  vEmission = aEmission;
  vMaterial = aMaterial;
  gl_Position = clip;
}`;
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
in vec3 vWorld;
in float vDistance;
in float vEmission;
flat in float vMaterial;
${LIGHTING_UNIFORMS_GLSL}
uniform sampler2D uOccupancy;
uniform vec4 uOccupancyTransform;
out vec4 outColor;
${LIGHTING_FUNCTIONS_GLSL}
float wallProximity(vec2 xz) {
  return texture(uOccupancy, (xz - uOccupancyTransform.xy) * uOccupancyTransform.zw).r;
}
vec3 weathered(vec3 color, float amount) {
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(color, vec3(luminance), amount);
}
#ifndef DETAILED
// Lightweight path for the low quality tier: the original single-light shading with procedural tiles and bricks.
void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, uSunDirection), 0.0);
  vec3 color = vColor * (0.48 + diffuse * 0.52);
  if (vMaterial > 0.5 && vMaterial < 1.5) {
    vec2 tile = fract(vWorld.xz / 1.35);
    vec2 groutDistance = min(tile, 1.0 - tile);
    float grout = 1.0 - smoothstep(0.025, 0.055, min(groutDistance.x, groutDistance.y));
    color *= 0.84 + mod(floor(vWorld.x / 1.35) + floor(vWorld.z / 1.35), 2.0) * 0.045;
    color = mix(color, vec3(0.24, 0.25, 0.27), grout * 0.72);
  } else if (vMaterial > 1.5) {
    vec2 wallUv = normal.z != 0.0 ? vWorld.xy : vWorld.zy;
    float style = floor(vMaterial - 2.0 + 0.5);
    float brickWidth = 0.72 + mod(style, 3.0) * 0.24;
    float brickHeight = 0.34 + mod(floor(style / 2.0), 3.0) * 0.11;
    float row = floor(wallUv.y / brickHeight);
    vec2 panel = fract(vec2(wallUv.x / brickWidth + mod(row, 2.0) * 0.5, wallUv.y / brickHeight));
    vec2 seamDistance = min(panel, 1.0 - panel);
    float seam = 1.0 - smoothstep(0.035, 0.075, min(seamDistance.x, seamDistance.y));
    color = mix(color, color * 0.42, seam * 0.68);
    color *= mix(0.62, 1.0, smoothstep(0.0, 1.15, vWorld.y));
  }
  color = mix(color, vColor, clamp(vEmission, 0.0, 1.0));
  outColor = vec4(applyFog(color, vDistance, vEmission), 1.0);
}
#else
void main() {
  vec3 geometricNormal = normalize(vNormal);
  vec3 normal = geometricNormal;
  vec3 albedo = toLinear(vColor);
  float roughness = 0.45;
  float metallic = 0.1;
  float occlusion = 1.0;
  if (vMaterial > 0.5 && vMaterial < 1.5) {
    vec2 tileCoordinate = vWorld.xz / 1.35;
    vec2 tile = fract(tileCoordinate);
    vec2 tileId = floor(tileCoordinate);
    vec2 groutDistance = min(tile, 1.0 - tile);
    float grout = 1.0 - smoothstep(0.018, 0.045, min(groutDistance.x, groutDistance.y));
    float variation = hash12(tileId) - 0.5;
    float grime = fbm(vWorld.xz * 0.85);
    float scuffs = valueNoise(vWorld.xz * vec2(19.0, 2.1) + tileId * 3.7);
    albedo = weathered(albedo, 0.45);
    albedo *= 0.78 + variation * 0.18 + (grime - 0.5) * 0.34;
    albedo = mix(albedo, vec3(0.018, 0.019, 0.021), grout * 0.85);
    roughness = mix(0.36 + grime * 0.36 + scuffs * 0.1, 0.96, grout);
    vec2 bevel = smoothstep(0.07, 0.0, tile) - smoothstep(0.07, 0.0, 1.0 - tile);
    normal = normalize(normal + vec3(-bevel.x, 0.0, -bevel.y) * 0.45);
    float proximity = wallProximity(vWorld.xz);
    occlusion = 1.0 - smoothstep(0.1, 0.5, proximity) * 0.72;
  } else if (vMaterial > 1.5) {
    bool top = abs(geometricNormal.y) > 0.5;
    bool facesZ = abs(geometricNormal.z) > 0.5;
    vec3 tangent = facesZ ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
    vec2 wallUv = top ? vWorld.xz : vec2(dot(vWorld, tangent), vWorld.y);
    float style = floor(vMaterial - 2.0 + 0.5);
    float brickWidth = 0.72 + mod(style, 3.0) * 0.24;
    float brickHeight = 0.34 + mod(floor(style / 2.0), 3.0) * 0.11;
    float row = floor(wallUv.y / brickHeight);
    float stagger = mod(row, 2.0) * 0.5;
    if (mod(style, 2.0) > 0.5) stagger = mod(row, 3.0) / 3.0;
    vec2 brickCoordinate = vec2(wallUv.x / brickWidth + stagger, wallUv.y / brickHeight);
    vec2 brickId = floor(brickCoordinate);
    vec2 panel = fract(brickCoordinate);
    vec2 brickSize = vec2(brickWidth, brickHeight);
    vec2 seamDistance = min(panel, 1.0 - panel) * brickSize;
    float seam = 1.0 - smoothstep(0.012, 0.034, min(seamDistance.x, seamDistance.y));
    float brickTone = hash12(brickId + style * 7.0) - 0.5;
    float pores = valueNoise(wallUv * 38.0) * 0.5 + valueNoise(wallUv * 9.0) * 0.5;
    float streaks = valueNoise(vec2(wallUv.x * 5.0, wallUv.y * 0.35));
    float dirt = (1.0 - smoothstep(0.0, 1.35, vWorld.y)) * (0.55 + streaks * 0.45);
    albedo = weathered(albedo, 0.42);
    albedo *= 0.8 + brickTone * 0.24 + (pores - 0.5) * 0.18;
    albedo = mix(albedo, albedo * vec3(0.4, 0.38, 0.36), dirt * 0.6);
    albedo = mix(albedo, vec3(0.05, 0.048, 0.046), seam * 0.82);
    roughness = mix(0.6 + pores * 0.22, 0.97, seam);
    vec2 bevel = smoothstep(0.045, 0.0, panel * brickSize) - smoothstep(0.045, 0.0, (1.0 - panel) * brickSize);
    if (!top) normal = normalize(normal - tangent * bevel.x * 0.5 - vec3(0.0, 1.0, 0.0) * bevel.y * 0.5);
    float trim = 1.0 - smoothstep(0.025, 0.045, abs(fract(wallUv.y / 1.55) - 0.5));
    albedo = mix(albedo, vec3(0.2, 0.21, 0.23), trim * 0.8);
    metallic = trim * 0.85;
    roughness = mix(roughness, 0.34, trim);
    occlusion = mix(0.36, 1.0, smoothstep(0.0, 1.15, vWorld.y));
  }
  float shadow = sunShadow(vWorld, geometricNormal);
  vec3 radiance = shadeSurface(albedo, vWorld, normal, roughness, metallic, occlusion, shadow);
  vec3 color = toDisplay(filmicToneMap(radiance));
  color = mix(color, vColor * 1.18, clamp(vEmission, 0.0, 1.0));
  outColor = vec4(applyFog(color, vDistance, vEmission), 1.0);
}
#endif`;

const SKY_VERTEX_SHADER = `#version 300 es
precision highp float;
out vec2 vScreen;
void main() {
  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vScreen = position * 2.0 - 1.0;
  gl_Position = vec4(vScreen, 0.99999, 1.0);
}`;

const SKY_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vScreen;
${LIGHTING_UNIFORMS_GLSL}
uniform vec3 uForward;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec2 uTanHalfFov;
uniform float uTime;
out vec4 outColor;
${LIGHTING_FUNCTIONS_GLSL}
void main() {
  vec3 direction = normalize(uForward + uRight * vScreen.x * uTanHalfFov.x + uUp * vScreen.y * uTanHalfFov.y);
  vec3 radiance = skyRadiance(direction);
  if (direction.y > 0.0) {
    vec2 cloudPlane = direction.xz / (direction.y + 0.08) * 1.4 + vec2(uTime * 0.012, uTime * 0.004);
    float clouds = smoothstep(0.46, 0.8, fbm(cloudPlane));
    float lit = 0.72 + 0.28 * max(dot(direction, uSunDirection), 0.0);
    radiance = mix(radiance, vec3(1.0, 0.97, 0.93) * lit * 1.25, clouds * 0.8 * smoothstep(0.0, 0.22, direction.y));
  }
  vec3 color = toDisplay(filmicToneMap(radiance));
  float horizonHaze = 1.0 - smoothstep(0.0, 0.28, abs(direction.y));
  float denseFog = 1.0 - smoothstep(30.0, 46.0, uFogRange.y);
  outColor = vec4(mix(color, uFogColor, clamp(horizonHaze * 0.3 + denseFog * 0.75, 0.0, 1.0)), 1.0);
}`;

interface WorldProgram {
  readonly program: WebGLProgram;
  readonly viewProjection: WebGLUniformLocation | null;
  readonly occupancy: WebGLUniformLocation | null;
  readonly occupancyTransform: WebGLUniformLocation | null;
  readonly lighting: LightingUniformLocations;
}

function createWorldProgram(gl: WebGL2RenderingContext, detailed: boolean): WorldProgram {
  const program = linkProgram(gl, VERTEX_SHADER, shaderVariant(FRAGMENT_SHADER, detailed), 'world');
  return {
    program,
    viewProjection: gl.getUniformLocation(program, 'uViewProjection'),
    occupancy: gl.getUniformLocation(program, 'uOccupancy'),
    occupancyTransform: gl.getUniformLocation(program, 'uOccupancyTransform'),
    lighting: lightingUniformLocations(gl, program),
  };
}

export class WorldRenderer {
  private readonly detailedProgram: WorldProgram;
  private readonly fastProgram: WorldProgram;
  private readonly depthProgram: WebGLProgram;
  private readonly skyProgram: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly skyVao: WebGLVertexArrayObject;
  private readonly matrixBuffer: WebGLBuffer;
  private readonly colorBuffer: WebGLBuffer;
  private readonly emissionBuffer: WebGLBuffer;
  private readonly materialBuffer: WebGLBuffer;
  private readonly depthViewProjectionLocation: WebGLUniformLocation;
  private readonly skyLighting: LightingUniformLocations;
  private readonly skyForwardLocation: WebGLUniformLocation | null;
  private readonly skyRightLocation: WebGLUniformLocation | null;
  private readonly skyUpLocation: WebGLUniformLocation | null;
  private readonly skyTanHalfFovLocation: WebGLUniformLocation | null;
  private readonly skyTimeLocation: WebGLUniformLocation | null;
  private readonly occupancyTexture: WebGLTexture;
  private readonly fallbackShadowTexture: WebGLTexture;
  private readonly matrices = new Float32Array(MAX_INSTANCES * 16);
  private readonly colors = new Float32Array(MAX_INSTANCES * 3);
  private readonly emissions = new Float32Array(MAX_INSTANCES);
  private readonly materials = new Float32Array(MAX_INSTANCES);
  private readonly projection = new Float32Array(16);
  private readonly view = new Float32Array(16);
  private readonly viewProjection = new Float32Array(16);
  private readonly indexCount: number;
  private readonly davels: DavelRenderer;
  private readonly wallArt: WallArtRenderer;
  private shadowMap: ShadowMap | null = null;
  private postProcessor: PostProcessor | null = null;
  private postProcessorFailed = false;
  private instanceCount = 0;
  private staticInstanceCount = 0;
  private worldLevelId: PlayableLevelId = 'level-001';
  private skyColor: RuntimeRgb = [0.32, 0.83, 1];

  constructor(private readonly gl: WebGL2RenderingContext, private readonly canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.detailedProgram = createWorldProgram(gl, true);
    this.fastProgram = createWorldProgram(gl, false);
    this.depthProgram = linkProgram(gl, VERTEX_SHADER, DEPTH_FRAGMENT_SHADER, 'world depth');
    this.skyProgram = linkProgram(gl, SKY_VERTEX_SHADER, shaderVariant(SKY_FRAGMENT_SHADER, true), 'sky');
    this.davels = new DavelRenderer(gl);
    this.wallArt = new WallArtRenderer(gl);
    const vao = gl.createVertexArray();
    const skyVao = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    const matrixBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    const emissionBuffer = gl.createBuffer();
    const materialBuffer = gl.createBuffer();
    const occupancyTexture = gl.createTexture();
    if (vao === null || skyVao === null || vertexBuffer === null || indexBuffer === null || matrixBuffer === null
      || colorBuffer === null || emissionBuffer === null || materialBuffer === null || occupancyTexture === null) {
      throw new Error('Unable to allocate world renderer buffers');
    }
    this.vao = vao;
    this.skyVao = skyVao;
    this.matrixBuffer = matrixBuffer;
    this.colorBuffer = colorBuffer;
    this.emissionBuffer = emissionBuffer;
    this.materialBuffer = materialBuffer;
    this.occupancyTexture = occupancyTexture;
    this.fallbackShadowTexture = createFallbackShadowTexture(gl);
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
    gl.bindBuffer(gl.ARRAY_BUFFER, emissionBuffer);
    gl.enableVertexAttribArray(7);
    gl.vertexAttribPointer(7, 1, gl.FLOAT, false, 4, 0);
    gl.vertexAttribDivisor(7, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, materialBuffer);
    gl.enableVertexAttribArray(8);
    gl.vertexAttribPointer(8, 1, gl.FLOAT, false, 4, 0);
    gl.vertexAttribDivisor(8, 1);
    gl.bindVertexArray(null);
    const depthViewProjectionUniform = gl.getUniformLocation(this.depthProgram, 'uViewProjection');
    if (depthViewProjectionUniform === null || this.detailedProgram.viewProjection === null
      || this.fastProgram.viewProjection === null) {
      throw new Error('World shader uniform is unavailable');
    }
    this.depthViewProjectionLocation = depthViewProjectionUniform;
    this.skyLighting = lightingUniformLocations(gl, this.skyProgram);
    this.skyForwardLocation = gl.getUniformLocation(this.skyProgram, 'uForward');
    this.skyRightLocation = gl.getUniformLocation(this.skyProgram, 'uRight');
    this.skyUpLocation = gl.getUniformLocation(this.skyProgram, 'uUp');
    this.skyTanHalfFovLocation = gl.getUniformLocation(this.skyProgram, 'uTanHalfFov');
    this.skyTimeLocation = gl.getUniformLocation(this.skyProgram, 'uTime');
    gl.bindTexture(gl.TEXTURE_2D, occupancyTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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

  emitPulseImpact(effect: PulseImpactEffect): void { this.davels.emitPulseImpact(effect); }

  emitBombDetonation(effect: BombDetonationEffect): void { this.davels.emitBombDetonation(effect); }

  emitSwordArc(effect: SwordArcEffect): void { this.davels.emitSwordArc(effect); }

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
    const fieldOfViewScale = Math.max(0.65, Math.min(1.25, settings.fieldOfViewScale));
    const fieldOfView = Math.PI / 2.8 * fieldOfViewScale;
    const aspect = this.canvas.width / this.canvas.height;
    perspective(this.projection, fieldOfView, aspect, 0.06, 70);
    lookAt(this.view, player.x, eyeY, player.z, player.x + directionX, eyeY + directionY, player.z + directionZ);
    multiplyMatrix4(this.viewProjection, this.projection, this.view);
    const freezeFlash = freezeDanceWindow(state.levelId, state.tick).frozen;
    const flashMix = freezeFlash ? 0.42 * settings.flashScale : 0;
    const baseFogColor: RuntimeRgb = flashMix > 0
      ? [this.skyColor[0] * (1 - flashMix) + flashMix, this.skyColor[1] * (1 - flashMix) + flashMix, this.skyColor[2] * (1 - flashMix) + flashMix]
      : this.skyColor;
    const visibilityPulse = visibilityPulseFog(state.levelId, state.tick, settings.flashScale);
    const fogColor: RuntimeRgb = visibilityPulse.greenMix > 0 ? [
      baseFogColor[0] * (1 - visibilityPulse.greenMix) + 0.18 * visibilityPulse.greenMix,
      baseFogColor[1] * (1 - visibilityPulse.greenMix) + 0.96 * visibilityPulse.greenMix,
      baseFogColor[2] * (1 - visibilityPulse.greenMix) + 0.36 * visibilityPulse.greenMix,
    ] : baseFogColor;
    const tier = settings.qualityTier;
    const shadowSize = SHADOW_MAP_SIZES[tier];
    const shadowMap = this.ensureShadowMap(shadowSize);
    const gradient = skyGradient(this.skyColor);
    const hazeFog: RuntimeRgb = [
      fogColor[0] * 0.55 + gradient.horizon[0] * 0.45,
      fogColor[1] * 0.55 + gradient.horizon[1] * 0.45,
      fogColor[2] * 0.55 + gradient.horizon[2] * 0.45,
    ];
    const frame: LightingFrame = {
      camera: [player.x, eyeY, player.z],
      skyHorizon: gradient.horizon,
      skyZenith: gradient.zenith,
      fogColor: hazeFog,
      fogRange: [visibilityPulse.near, visibilityPulse.far],
      exposure: 0.98 + flashMix * 0.6,
      shadowEnabled: shadowMap !== null,
      lightViewProjection: shadowMap?.lightViewProjection ?? this.viewProjection,
      shadowTextureUnit: SHADOW_TEXTURE_UNIT,
    };
    const detailed = tier !== 'low';
    const world = detailed ? this.detailedProgram : this.fastProgram;
    this.davels.prepare(state, settings.motionScale, settings.flashScale, tier, shadowMap === null);
    if (shadowMap !== null) {
      shadowMap.begin();
      gl.useProgram(this.depthProgram);
      gl.uniformMatrix4fv(this.depthViewProjectionLocation, false, shadowMap.lightViewProjection);
      gl.bindVertexArray(this.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0, this.instanceCount);
      this.davels.drawDepth(shadowMap.lightViewProjection);
      shadowMap.end();
      shadowMap.bind();
    } else {
      gl.activeTexture(gl.TEXTURE0 + SHADOW_TEXTURE_UNIT);
      gl.bindTexture(gl.TEXTURE_2D, this.fallbackShadowTexture);
      gl.activeTexture(gl.TEXTURE0);
    }
    const postProcessor = tier === 'low' ? null : this.ensurePostProcessor();
    if (postProcessor !== null) {
      postProcessor.begin(this.canvas.width, this.canvas.height);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    gl.clearColor(hazeFog[0], hazeFog[1], hazeFog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (detailed) this.drawSky(frame, directionX, directionY, directionZ, fieldOfView, aspect, state.tick / 60);
    gl.useProgram(world.program);
    gl.uniformMatrix4fv(world.viewProjection, false, this.viewProjection);
    applyLightingUniforms(gl, world.lighting, frame);
    gl.activeTexture(gl.TEXTURE0 + OCCUPANCY_TEXTURE_UNIT);
    gl.bindTexture(gl.TEXTURE_2D, this.occupancyTexture);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(world.occupancy, OCCUPANCY_TEXTURE_UNIT);
    gl.uniform4f(
      world.occupancyTransform, LEVEL_ORIGIN_X, LEVEL_ORIGIN_Z,
      1 / (LEVEL_WIDTH * CELL_SIZE), 1 / (LEVEL_HEIGHT * CELL_SIZE),
    );
    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0, this.instanceCount);
    this.wallArt.render(this.viewProjection);
    this.davels.draw(this.viewProjection, frame, detailed);
    if (postProcessor !== null) {
      const hurtPulse = state.player.maxHealth > 0 ? 1 - state.player.health / state.player.maxHealth : 0;
      postProcessor.finish(
        state.tick / 60,
        (0.5 + 0.4 * Math.max(0, Math.min(1, settings.flashScale))) * (tier === 'high' ? 1 : 0.8),
        (0.0015 + Math.max(0, hurtPulse - 0.6) * 0.012) * settings.motionScale,
      );
    }
  }

  private drawSky(
    frame: LightingFrame, forwardX: number, forwardY: number, forwardZ: number,
    fieldOfView: number, aspect: number, timeSeconds: number,
  ): void {
    const { gl } = this;
    let rightX = -forwardZ; let rightZ = forwardX;
    const rightLength = Math.max(1e-6, Math.hypot(rightX, rightZ));
    rightX /= rightLength; rightZ /= rightLength;
    const upX = -rightZ * forwardY;
    const upY = rightZ * forwardX - rightX * forwardZ;
    const upZ = rightX * forwardY;
    const tanHalf = Math.tan(fieldOfView / 2);
    gl.useProgram(this.skyProgram);
    applyLightingUniforms(gl, this.skyLighting, frame);
    gl.uniform3f(this.skyForwardLocation, forwardX, forwardY, forwardZ);
    gl.uniform3f(this.skyRightLocation, rightX, 0, rightZ);
    gl.uniform3f(this.skyUpLocation, upX, upY, upZ);
    gl.uniform2f(this.skyTanHalfFovLocation, tanHalf * aspect, tanHalf);
    gl.uniform1f(this.skyTimeLocation, timeSeconds % 3600);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(this.skyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
  }

  private ensureShadowMap(size: number): ShadowMap | null {
    if (size === 0) return null;
    if (this.shadowMap !== null && this.shadowMap.size === size) return this.shadowMap;
    this.shadowMap?.dispose();
    try {
      this.shadowMap = new ShadowMap(this.gl, size);
      this.shadowMap.fitLevel(LEVEL_WIDTH * CELL_SIZE / 2, LEVEL_HEIGHT * CELL_SIZE / 2);
    } catch (error) {
      console.warn('Catch Davel shadows unavailable', error);
      this.shadowMap = null;
      return null;
    }
    return this.shadowMap;
  }

  private ensurePostProcessor(): PostProcessor | null {
    if (this.postProcessor !== null || this.postProcessorFailed) return this.postProcessor;
    try {
      this.postProcessor = new PostProcessor(this.gl);
    } catch (error) {
      console.warn('Catch Davel post-processing unavailable', error);
      this.postProcessorFailed = true;
    }
    return this.postProcessor;
  }

  private buildWorldInstances(levelId: PlayableLevelId): void {
    let instance = 0;
    const level = campaignLevel(levelId);
    const palette = paletteRuntimeProfile(level.palette.presetId);
    this.wallArt.setLevel(levelId);
    this.skyColor = palette.sky;
    instance = this.writeInstance(
      instance, 0, -0.14, 0, LEVEL_WIDTH * CELL_SIZE, 0.28, LEVEL_HEIGHT * CELL_SIZE,
      palette.floor, 0, 1,
    );
    const occupancy = new Uint8Array(LEVEL_WIDTH * LEVEL_HEIGHT);
    for (const wall of wallCells(levelId)) {
      const center = cellCenter(wall.column, wall.row);
      if (wall.column >= 0 && wall.column < LEVEL_WIDTH && wall.row >= 0 && wall.row < LEVEL_HEIGHT) {
        occupancy[wall.row * LEVEL_WIDTH + wall.column] = 255;
      }
      instance = this.writeInstance(
        instance, center.x, 1.55, center.z, CELL_SIZE, 3.1, CELL_SIZE,
        palette.walls[(wall.column + wall.row * 3 + level.number - 1) % palette.walls.length]!,
        0, 2 + (level.number - 1) % 6,
      );
    }
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.occupancyTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, LEVEL_WIDTH, LEVEL_HEIGHT, 0, gl.RED, gl.UNSIGNED_BYTE, occupancy);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    for (const landmark of campaignLandmarkLayout(levelId).boxes) {
      instance = this.writeEnvironmentBox(instance, landmark);
    }
    this.staticInstanceCount = instance;
    this.uploadInstances(instance);
  }

  private buildDynamicInstances(state: RenderGameState, settings: RenderPresentationSettings): void {
    let instance = this.staticInstanceCount;
    const bob = Math.sin(state.tick * 0.08) * 0.12 * settings.motionScale;
    let keyOrdinal = 0;
    for (const pickup of state.level.pickups) {
      const pickupKeyOrdinal = pickup.kind === 'key' ? keyOrdinal++ : -1;
      if (!pickup.active) continue;
      if (pickup.kind === 'key') {
        const level28Colors = [
          [[1, 0.78, 0.12], [0.82, 0.42, 0.06]],
          [[0.12, 0.94, 1], [0.04, 0.56, 0.86]],
          [[1, 0.18, 0.74], [0.66, 0.08, 0.62]],
        ] as const;
        const colors = state.levelId === 'level-028' ? level28Colors[pickupKeyOrdinal] : undefined;
        instance = this.writeInstance(
          instance, pickup.x, 0.72 + bob, pickup.z, 0.18, 0.75, 0.18, colors?.[0] ?? [1, 0.92, 0.12],
        );
        instance = this.writeInstance(
          instance, pickup.x + 0.28, 0.48 + bob, pickup.z, 0.55, 0.18, 0.18, colors?.[1] ?? [1, 0.66, 0.08],
        );
      } else if (pickup.kind === 'health') {
        instance = this.writeInstance(instance, pickup.x, 0.55 + bob, pickup.z, 0.22, 0.9, 0.22, [0.3, 1, 0.36]);
        instance = this.writeInstance(instance, pickup.x, 0.55 + bob, pickup.z, 0.82, 0.22, 0.22, [0.3, 1, 0.36]);
      } else if (pickup.kind === 'coin') {
        const cacheSpin = state.tick * 0.045 * settings.motionScale;
        for (let coin = 0; coin < 3; coin += 1) {
          const angle = cacheSpin + coin * Math.PI * 2 / 3;
          instance = this.writeInstance(
            instance,
            pickup.x + Math.cos(angle) * 0.38,
            0.5 + bob + coin * 0.13,
            pickup.z + Math.sin(angle) * 0.38,
            0.34, 0.11, 0.34,
            coin === 1 ? [1, 0.92, 0.2] : [1, 0.68, 0.04],
            0.34,
          );
        }
      } else {
        instance = this.writeInstance(instance, pickup.x, 0.55 + bob, pickup.z, 0.52, 0.9, 0.52, [0.12, 0.94, 1]);
      }
    }
    for (const [hazardIndex, hazard] of state.level.hazards.entries()) {
      if (hazard.kind === 'timed-door') {
        if (state.levelId === 'level-027') {
          const rise = magentaDrainRiseProgress(state.levelId, state.tick, hazardIndex);
          const gateHeight = 0.1 + rise * 2.9;
          const magenta: readonly [number, number, number] = hazard.active ? [1, 0.06, 0.62] : [0.62, 0.16, 0.72];
          instance = this.writeInstance(instance, hazard.x, 0.035, hazard.z, 2.72, 0.07, 2.72, [0.34, 0.06, 0.42]);
          instance = this.writeInstance(instance, hazard.x, gateHeight * 0.5, hazard.z, 2.5, gateHeight, 0.16, magenta);
          instance = this.writeInstance(instance, hazard.x, Math.max(0.12, gateHeight - 0.08), hazard.z, 2.76, 0.12, 0.26, [1, 0.52, 0.9]);
          continue;
        }
        if (state.levelId === 'level-028') {
          const lockColors = hazardIndex === 0
            ? [[1, 0.7, 0.08], [0.72, 0.3, 0.04]] as const
            : [[0.08, 0.9, 1], [0.02, 0.4, 0.7]] as const;
          const color = hazard.active ? lockColors[0] : [0.1, 0.52, 0.38] as const;
          instance = this.writeInstance(instance, hazard.x, 1.25, hazard.z, 2.55, 2.5, 0.2, color);
          instance = this.writeInstance(instance, hazard.x, 1.7, hazard.z, 0.72, 0.72, 0.3, lockColors[1]);
          continue;
        }
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
      if (hazard.kind === 'ice') {
        const iceColor: readonly [number, number, number] = hazard.active ? [0.2, 0.82, 1] : [0.42, 0.62, 0.72];
        instance = this.writeInstance(
          instance, hazard.x, 0.028, hazard.z,
          hazard.halfWidth * 2, 0.056, hazard.halfDepth * 2, iceColor,
        );
        const glint = (state.tick % 72) / 72;
        instance = this.writeInstance(
          instance,
          hazard.x + hazard.directionX * (glint - 0.5) * hazard.halfWidth * 1.55,
          0.073,
          hazard.z + hazard.directionZ * (glint - 0.5) * hazard.halfDepth * 1.55,
          hazard.directionX === 0 ? hazard.halfWidth * 1.3 : 0.18,
          0.045,
          hazard.directionZ === 0 ? hazard.halfDepth * 1.3 : 0.18,
          [0.9, 0.99, 1],
        );
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
    const defense = state.level.defense;
    if (defense !== null) {
      const healthRatio = Math.max(0, Math.min(1, defense.health / defense.maxHealth));
      const bankColor: readonly [number, number, number] = [1 - healthRatio * 0.72, 0.22 + healthRatio * 0.72, 0.16];
      instance = this.writeInstance(instance, defense.x, 0.46, defense.z, 1.7, 0.88, 1.25, [0.18, 0.26, 0.42]);
      instance = this.writeInstance(instance, defense.x, 0.94, defense.z, 1.55, 0.12, 1.1, bankColor, 0.62);
      instance = this.writeInstance(instance, defense.x, 1.18, defense.z, 0.26, 0.44, 0.22, [1, 0.78, 0.12], 0.76);
      instance = this.writeInstance(instance, defense.x - 0.58, 0.16, defense.z - 0.42, 0.22, 0.32, 0.22, bankColor);
      instance = this.writeInstance(instance, defense.x + 0.58, 0.16, defense.z - 0.42, 0.22, 0.32, 0.22, bankColor);
      instance = this.writeInstance(instance, defense.x - 0.58, 0.16, defense.z + 0.42, 0.22, 0.32, 0.22, bankColor);
      instance = this.writeInstance(instance, defense.x + 0.58, 0.16, defense.z + 0.42, 0.22, 0.32, 0.22, bankColor);
    }
    for (const beaconBox of exitBeaconBoxes(
      state.levelId, state.level.exit, state.level.objectiveComplete, state.tick, settings.motionScale,
    )) {
      instance = this.writeEnvironmentBox(instance, beaconBox);
    }
    this.uploadInstances(instance);
  }

  private writeEnvironmentBox(instance: number, environmentBox: EnvironmentBox): number {
    return this.writeInstance(
      instance,
      environmentBox.x, environmentBox.y, environmentBox.z,
      environmentBox.sizeX, environmentBox.sizeY, environmentBox.sizeZ,
      environmentBox.color,
      environmentBox.emission,
    );
  }

  private writeInstance(
    instance: number,
    x: number, y: number, z: number,
    sx: number, sy: number, sz: number,
    color: readonly [number, number, number],
    emission = 0,
    material = 0,
  ): number {
    if (instance >= MAX_INSTANCES) throw new Error('World instance capacity exceeded');
    writeTranslationScale(this.matrices, instance * 16, x, y, z, sx, sy, sz);
    this.colors.set(color, instance * 3);
    this.emissions[instance] = emission;
    this.materials[instance] = material;
    return instance + 1;
  }

  private uploadInstances(instance: number): void {
    this.instanceCount = instance;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.matrixBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.matrices.subarray(0, instance * 16), this.gl.DYNAMIC_DRAW);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.colors.subarray(0, instance * 3), this.gl.DYNAMIC_DRAW);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.emissionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.emissions.subarray(0, instance), this.gl.DYNAMIC_DRAW);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.materialBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.materials.subarray(0, instance), this.gl.DYNAMIC_DRAW);
  }
}
