// Shared GLSL for the physically inspired lighting model used by the world, Davel, and sky passes.
// Albedo arrives in display (sRGB-like) space, is lit in linear space, tone mapped, and re-encoded.

export const SUN_DIRECTION: readonly [number, number, number] = (() => {
  const x = 0.42; const y = 0.86; const z = 0.29;
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length] as const;
})();

export const LIGHTING_UNIFORMS_GLSL = `
uniform vec3 uCamera;
uniform vec3 uSunDirection;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyZenith;
uniform vec3 uFogColor;
uniform vec2 uFogRange;
uniform float uExposure;
uniform float uShadowEnabled;
uniform mat4 uLightViewProjection;
uniform highp sampler2DShadow uShadowMap;
`;

export const LIGHTING_FUNCTIONS_GLSL = `
const float PI = 3.14159265;
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 4; octave++) {
    value += valueNoise(p) * amplitude;
    p = p * 2.03 + vec2(17.1, 9.2);
    amplitude *= 0.5;
  }
  return value;
}
vec3 toLinear(vec3 color) { return pow(max(color, vec3(0.0)), vec3(2.2)); }
vec3 toDisplay(vec3 color) { return pow(max(color, vec3(0.0)), vec3(1.0 / 2.2)); }
vec3 filmicToneMap(vec3 x) {
  x *= uExposure;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 skyRadiance(vec3 direction) {
  vec3 horizon = toLinear(uSkyHorizon);
  vec3 zenith = toLinear(uSkyZenith);
  float height = clamp(direction.y, -1.0, 1.0);
  vec3 sky = mix(horizon, zenith, pow(max(height, 0.0), 0.5));
  vec3 ground = horizon * vec3(0.32, 0.3, 0.28);
  sky = mix(ground, sky, smoothstep(-0.12, 0.03, height));
  float sun = max(dot(direction, uSunDirection), 0.0);
  sky += vec3(1.0, 0.9, 0.72) * (pow(sun, 1400.0) * 30.0 + pow(sun, 60.0) * 0.5 + pow(sun, 6.0) * 0.12);
  return sky;
}
vec3 hemisphereAmbient(vec3 normal) {
  vec3 sky = toLinear(mix(uSkyHorizon, uSkyZenith, 0.5));
  vec3 ground = toLinear(uSkyHorizon) * vec3(0.26, 0.24, 0.22);
  return mix(ground, sky, normal.y * 0.5 + 0.5);
}
float sunShadow(vec3 world, vec3 normal) {
  if (uShadowEnabled < 0.5) return 1.0;
  float slope = 1.0 - max(dot(normal, uSunDirection), 0.0);
  vec4 light = uLightViewProjection * vec4(world + normal * (0.06 + slope * 0.1), 1.0);
  vec3 coord = light.xyz / light.w * 0.5 + 0.5;
  if (coord.x <= 0.0 || coord.x >= 1.0 || coord.y <= 0.0 || coord.y >= 1.0 || coord.z >= 1.0) return 1.0;
  vec2 texel = 1.0 / vec2(textureSize(uShadowMap, 0));
  float bias = 0.0012;
  float visibility = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      visibility += texture(uShadowMap, vec3(coord.xy + vec2(float(x), float(y)) * texel * 1.25, coord.z - bias));
    }
  }
  return visibility / 9.0;
}
vec3 fresnelSchlick(float cosine, vec3 f0) {
  return f0 + (1.0 - f0) * pow(1.0 - clamp(cosine, 0.0, 1.0), 5.0);
}
// Returns lit linear radiance for a surface with GGX specular, hemisphere ambient, sun, and a camera headlamp.
vec3 shadeSurface(
  vec3 albedo, vec3 world, vec3 normal, float roughness, float metallic, float occlusion, float shadow
) {
  vec3 viewDirection = normalize(uCamera - world);
  vec3 halfVector = normalize(uSunDirection + viewDirection);
  float nDotL = max(dot(normal, uSunDirection), 0.0);
  float nDotV = max(dot(normal, viewDirection), 0.001);
  float nDotH = max(dot(normal, halfVector), 0.0);
  float alpha = max(0.02, roughness * roughness);
  float alpha2 = alpha * alpha;
  float denominator = nDotH * nDotH * (alpha2 - 1.0) + 1.0;
  float distribution = alpha2 / (PI * denominator * denominator);
  float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
  float geometry = (nDotV / (nDotV * (1.0 - k) + k)) * (nDotL / (nDotL * (1.0 - k) + k));
  vec3 f0 = mix(vec3(0.04), albedo, metallic);
  vec3 fresnel = fresnelSchlick(max(dot(halfVector, viewDirection), 0.0), f0);
  vec3 specular = distribution * geometry * fresnel / max(4.0 * nDotV * nDotL, 0.001);
  vec3 diffuse = (1.0 - fresnel) * (1.0 - metallic) * albedo / PI;
  vec3 sunColor = vec3(1.0, 0.95, 0.86) * 3.1;
  vec3 radiance = (diffuse + specular) * sunColor * nDotL * shadow;
  vec3 ambient = hemisphereAmbient(normal) * occlusion;
  vec3 ambientFresnel = fresnelSchlick(nDotV, f0);
  radiance += ambient * albedo * (1.0 - metallic) * 0.95;
  vec3 reflected = reflect(-viewDirection, normal);
  radiance += skyRadiance(reflected) * ambientFresnel * (1.0 - roughness) * (1.0 - roughness) * occlusion * 0.8;
  radiance += ambient * albedo * metallic * 0.35;
  vec3 toCamera = uCamera - world;
  float cameraDistance = length(toCamera);
  float headlamp = max(dot(normal, toCamera / max(cameraDistance, 0.001)), 0.0) / (1.0 + 0.055 * cameraDistance * cameraDistance);
  radiance += albedo * vec3(1.0, 0.93, 0.82) * headlamp * 0.32 * occlusion;
  return radiance;
}
vec3 applyFog(vec3 color, float viewDistance, float emission) {
  float fog = smoothstep(uFogRange.x, uFogRange.y, viewDistance) * (1.0 - clamp(emission, 0.0, 1.0) * 0.7);
  return mix(color, uFogColor, fog);
}
`;

export const DEPTH_FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(1.0); }`;

export interface LightingUniformLocations {
  readonly camera: WebGLUniformLocation | null;
  readonly sunDirection: WebGLUniformLocation | null;
  readonly skyHorizon: WebGLUniformLocation | null;
  readonly skyZenith: WebGLUniformLocation | null;
  readonly fogColor: WebGLUniformLocation | null;
  readonly fogRange: WebGLUniformLocation | null;
  readonly exposure: WebGLUniformLocation | null;
  readonly shadowEnabled: WebGLUniformLocation | null;
  readonly lightViewProjection: WebGLUniformLocation | null;
  readonly shadowMap: WebGLUniformLocation | null;
}

export interface LightingFrame {
  readonly camera: readonly [number, number, number];
  readonly skyHorizon: readonly [number, number, number];
  readonly skyZenith: readonly [number, number, number];
  readonly fogColor: readonly [number, number, number];
  readonly fogRange: readonly [number, number];
  readonly exposure: number;
  readonly shadowEnabled: boolean;
  readonly lightViewProjection: Float32Array;
  readonly shadowTextureUnit: number;
}

export function lightingUniformLocations(gl: WebGL2RenderingContext, program: WebGLProgram): LightingUniformLocations {
  return {
    camera: gl.getUniformLocation(program, 'uCamera'),
    sunDirection: gl.getUniformLocation(program, 'uSunDirection'),
    skyHorizon: gl.getUniformLocation(program, 'uSkyHorizon'),
    skyZenith: gl.getUniformLocation(program, 'uSkyZenith'),
    fogColor: gl.getUniformLocation(program, 'uFogColor'),
    fogRange: gl.getUniformLocation(program, 'uFogRange'),
    exposure: gl.getUniformLocation(program, 'uExposure'),
    shadowEnabled: gl.getUniformLocation(program, 'uShadowEnabled'),
    lightViewProjection: gl.getUniformLocation(program, 'uLightViewProjection'),
    shadowMap: gl.getUniformLocation(program, 'uShadowMap'),
  };
}

export function applyLightingUniforms(
  gl: WebGL2RenderingContext, locations: LightingUniformLocations, frame: LightingFrame,
): void {
  gl.uniform3f(locations.camera, frame.camera[0], frame.camera[1], frame.camera[2]);
  gl.uniform3f(locations.sunDirection, SUN_DIRECTION[0], SUN_DIRECTION[1], SUN_DIRECTION[2]);
  gl.uniform3f(locations.skyHorizon, frame.skyHorizon[0], frame.skyHorizon[1], frame.skyHorizon[2]);
  gl.uniform3f(locations.skyZenith, frame.skyZenith[0], frame.skyZenith[1], frame.skyZenith[2]);
  gl.uniform3f(locations.fogColor, frame.fogColor[0], frame.fogColor[1], frame.fogColor[2]);
  gl.uniform2f(locations.fogRange, frame.fogRange[0], frame.fogRange[1]);
  gl.uniform1f(locations.exposure, frame.exposure);
  gl.uniform1f(locations.shadowEnabled, frame.shadowEnabled ? 1 : 0);
  gl.uniformMatrix4fv(locations.lightViewProjection, false, frame.lightViewProjection);
  gl.uniform1i(locations.shadowMap, frame.shadowTextureUnit);
}

export function compileShader(gl: WebGL2RenderingContext, type: number, source: string, label: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error(`Unable to allocate ${label} shader`);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? `${label} shader compilation failed`);
  }
  return shader;
}

/** Inserts a DETAILED define after the #version line so each shader compiles a fast and a detailed variant. */
export function shaderVariant(source: string, detailed: boolean): string {
  if (!detailed) return source;
  const lineEnd = source.indexOf('\n');
  return `${source.slice(0, lineEnd)}\n#define DETAILED 1${source.slice(lineEnd)}`;
}

export function linkProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string, label: string): WebGLProgram {
  const program = gl.createProgram();
  if (program === null) throw new Error(`Unable to allocate ${label} program`);
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource, label);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, label);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? `${label} program link failed`);
  }
  return program;
}
