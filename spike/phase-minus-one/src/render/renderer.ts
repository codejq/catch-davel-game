import { ARENA_HALF_EXTENT, PARTICLE_COUNT, PARTICLES_PER_ROBOT, ROBOT_COUNT } from '../sim/constants';
import { LINK_PAIRS } from '../sim/scenario';
import { SNAPSHOT_BYTES } from '../sim/snapshot';
import { createCapsuleGeometry, createFloorGeometry, createSphereGeometry, type MeshData } from './geometry';
import { lookAt, multiplyMatrix4, perspective, writeCapsuleMatrix, writeTranslationScaleMatrix } from './math';

const HEADER_BYTES = 16 * Uint32Array.BYTES_PER_ELEMENT;
const PARTICLE_FLOATS = 4;
const MAX_INSTANCES = PARTICLE_COUNT;
const PALETTE = new Float32Array([
  0.2, 0.86, 1,
  1, 0.28, 0.46,
  0.74, 0.36, 1,
  1, 0.76, 0.18,
  0.3, 1, 0.48,
  1, 0.42, 0.12,
]);

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
out float vDistance;
void main() {
  mat4 model = mat4(aMatrix0, aMatrix1, aMatrix2, aMatrix3);
  vec4 world = model * vec4(aPosition, 1.0);
  vNormal = normalize(mat3(model) * aNormal);
  vColor = aColor;
  vec4 clip = uViewProjection * world;
  vDistance = clip.w;
  gl_Position = clip;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
in float vDistance;
out vec4 outColor;
void main() {
  vec3 lightDirection = normalize(vec3(0.4, 0.8, 0.35));
  float diffuse = max(dot(normalize(vNormal), lightDirection), 0.0);
  float rim = pow(1.0 - abs(normalize(vNormal).z), 2.0) * 0.2;
  vec3 lit = vColor * (0.28 + diffuse * 0.72) + rim;
  float fog = smoothstep(18.0, 34.0, vDistance);
  outColor = vec4(mix(lit, vec3(0.027, 0.035, 0.071), fog), 1.0);
}`;

interface GpuMesh {
  readonly vao: WebGLVertexArrayObject;
  readonly indexCount: number;
}

export interface RenderStats {
  readonly cpuMs: number;
  readonly gpuMs: number | null;
  readonly drawCalls: number;
  readonly instances: number;
  readonly tick: number;
}

export interface RendererInfo {
  readonly vendor: string;
  readonly renderer: string;
  readonly version: string;
  readonly shadingLanguageVersion: string;
  readonly gpuTimerQueryAvailable: boolean;
}

export interface ContextRecoveryResult {
  readonly supported: boolean;
  readonly lost: boolean;
  readonly restored: boolean;
}

type RenderCanvas = HTMLCanvasElement | OffscreenCanvas;

interface TimerQueryExtension {
  readonly TIME_ELAPSED_EXT: number;
  readonly GPU_DISJOINT_EXT: number;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error('Unable to allocate WebGL shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader error';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const program = gl.createProgram();
  if (program === null) throw new Error('Unable to allocate WebGL program');
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Unknown program link error';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

export class RawWebGL2Renderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly matrixBuffer: WebGLBuffer;
  private readonly colorBuffer: WebGLBuffer;
  private readonly sphere: GpuMesh;
  private readonly capsule: GpuMesh;
  private readonly floor: GpuMesh;
  private readonly matrices = new Float32Array(MAX_INSTANCES * 16);
  private readonly colors = new Float32Array(MAX_INSTANCES * 3);
  private readonly projection = new Float32Array(16);
  private readonly view = new Float32Array(16);
  private readonly viewProjection = new Float32Array(16);
  private readonly viewProjectionLocation: WebGLUniformLocation;
  private readonly timerQuery: TimerQueryExtension | null;
  private readonly pendingTimerQueries: WebGLQuery[] = [];

  constructor(private readonly canvas: RenderCanvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (gl === null) throw new Error('WebGL2 is required for the Phase -1 renderer');
    this.gl = gl;
    this.program = createProgram(gl);
    const matrixBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    if (matrixBuffer === null || colorBuffer === null) throw new Error('Unable to allocate instance buffers');
    this.matrixBuffer = matrixBuffer;
    this.colorBuffer = colorBuffer;
    this.sphere = this.createMesh(createSphereGeometry());
    this.capsule = this.createMesh(createCapsuleGeometry());
    this.floor = this.createMesh(createFloorGeometry());
    const location = gl.getUniformLocation(this.program, 'uViewProjection');
    if (location === null) throw new Error('Renderer uniform uViewProjection is unavailable');
    this.viewProjectionLocation = location;
    this.timerQuery = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerQueryExtension | null;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }

  resize(width: number, height: number, pixelRatio = 1): void {
    const targetWidth = Math.max(1, Math.floor(width * pixelRatio));
    const targetHeight = Math.max(1, Math.floor(height * pixelRatio));
    if (this.canvas.width !== targetWidth) this.canvas.width = targetWidth;
    if (this.canvas.height !== targetHeight) this.canvas.height = targetHeight;
  }

  describe(): RendererInfo {
    const debug = this.gl.getExtension('WEBGL_debug_renderer_info') as {
      readonly UNMASKED_VENDOR_WEBGL: number;
      readonly UNMASKED_RENDERER_WEBGL: number;
    } | null;
    return {
      vendor: String(this.gl.getParameter(debug?.UNMASKED_VENDOR_WEBGL ?? this.gl.VENDOR)),
      renderer: String(this.gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? this.gl.RENDERER)),
      version: String(this.gl.getParameter(this.gl.VERSION)),
      shadingLanguageVersion: String(this.gl.getParameter(this.gl.SHADING_LANGUAGE_VERSION)),
      gpuTimerQueryAvailable: this.gl.getExtension('EXT_disjoint_timer_query_webgl2') !== null,
    };
  }

  probeContextLoss(timeoutMilliseconds = 3_000): Promise<ContextRecoveryResult> {
    const extension = this.gl.getExtension('WEBGL_lose_context');
    if (extension === null) return Promise.resolve({ supported: false, lost: false, restored: false });
    return new Promise((resolve) => {
      let lost = false;
      let finished = false;
      const finish = (restored: boolean): void => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        this.canvas.removeEventListener('webglcontextlost', onLost);
        this.canvas.removeEventListener('webglcontextrestored', onRestored);
        resolve({ supported: true, lost, restored });
      };
      const onLost = (event: Event): void => {
        event.preventDefault();
        lost = true;
        setTimeout(() => extension.restoreContext(), 50);
      };
      const onRestored = (): void => finish(true);
      const timeout = setTimeout(() => finish(false), timeoutMilliseconds);
      this.canvas.addEventListener('webglcontextlost', onLost);
      this.canvas.addEventListener('webglcontextrestored', onRestored);
      extension.loseContext();
    });
  }

  render(snapshotBytes: Uint8Array, now: () => number = () => performance.now()): RenderStats {
    if (snapshotBytes.byteLength !== SNAPSHOT_BYTES) throw new Error('Renderer received malformed snapshot');
    const start = now();
    const gpuMs = this.takeCompletedGpuTime();
    const timerQuery = this.timerQuery === null ? null : this.gl.createQuery();
    if (timerQuery !== null) this.gl.beginQuery(this.timerQuery!.TIME_ELAPSED_EXT, timerQuery);
    const header = new Uint32Array(snapshotBytes.buffer, snapshotBytes.byteOffset, 16);
    const particles = new Float32Array(
      snapshotBytes.buffer,
      snapshotBytes.byteOffset + HEADER_BYTES,
      PARTICLE_COUNT * PARTICLE_FLOATS,
    );
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.027, 0.035, 0.071, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    perspective(this.projection, Math.PI / 3.2, this.canvas.width / this.canvas.height, 0.1, 60);
    lookAt(this.view, 15, 11, 18, 0, 1.4, 0);
    multiplyMatrix4(this.viewProjection, this.projection, this.view);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.viewProjectionLocation, false, this.viewProjection);

    writeTranslationScaleMatrix(this.matrices, 0, 0, -0.02, 0, ARENA_HALF_EXTENT, 1, ARENA_HALF_EXTENT);
    this.colors.set([0.08, 0.12, 0.2], 0);
    this.draw(this.floor, 1);

    for (let particle = 0; particle < PARTICLE_COUNT; particle += 1) {
      const dataOffset = particle * PARTICLE_FLOATS;
      writeTranslationScaleMatrix(
        this.matrices,
        particle * 16,
        particles[dataOffset]!,
        particles[dataOffset + 1]!,
        particles[dataOffset + 2]!,
        0.115,
        0.115,
        0.115,
      );
      this.writeRobotColor(particle, particle * 3, 1);
    }
    this.draw(this.sphere, PARTICLE_COUNT);

    let linkInstance = 0;
    for (let robot = 0; robot < ROBOT_COUNT; robot += 1) {
      const particleBase = robot * PARTICLES_PER_ROBOT;
      for (const pair of LINK_PAIRS) {
        const particleA = (particleBase + pair[0]) * PARTICLE_FLOATS;
        const particleB = (particleBase + pair[1]) * PARTICLE_FLOATS;
        writeCapsuleMatrix(
          this.matrices,
          linkInstance * 16,
          particles[particleA]!,
          particles[particleA + 1]!,
          particles[particleA + 2]!,
          particles[particleB]!,
          particles[particleB + 1]!,
          particles[particleB + 2]!,
          0.08,
        );
        this.writeRobotColor(robot * PARTICLES_PER_ROBOT, linkInstance * 3, 0.78);
        linkInstance += 1;
      }
    }
    this.draw(this.capsule, linkInstance);
    if (timerQuery !== null) {
      this.gl.endQuery(this.timerQuery!.TIME_ELAPSED_EXT);
      this.pendingTimerQueries.push(timerQuery);
      if (this.pendingTimerQueries.length > 8) {
        this.gl.deleteQuery(this.pendingTimerQueries.shift()!);
      }
    }
    return { cpuMs: now() - start, gpuMs, drawCalls: 3, instances: 1 + PARTICLE_COUNT + linkInstance, tick: header[2]! };
  }

  private takeCompletedGpuTime(): number | null {
    if (this.timerQuery === null || this.pendingTimerQueries.length === 0) return null;
    const query = this.pendingTimerQueries[0]!;
    const available = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE) as boolean;
    if (!available) return null;
    this.pendingTimerQueries.shift();
    const disjoint = this.gl.getParameter(this.timerQuery.GPU_DISJOINT_EXT) as boolean;
    const nanoseconds = Number(this.gl.getQueryParameter(query, this.gl.QUERY_RESULT));
    this.gl.deleteQuery(query);
    return disjoint ? null : nanoseconds / 1_000_000;
  }

  private createMesh(mesh: MeshData): GpuMesh {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    if (vao === null || vertexBuffer === null || indexBuffer === null) throw new Error('Unable to allocate mesh buffers');
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
    for (let column = 0; column < 4; column += 1) {
      const location = 2 + column;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 64, column * 16);
      gl.vertexAttribDivisor(location, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 3, gl.FLOAT, false, 12, 0);
    gl.vertexAttribDivisor(6, 1);
    gl.bindVertexArray(null);
    return { vao, indexCount: mesh.indices.length };
  }

  private draw(mesh: GpuMesh, instances: number): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.matrices.subarray(0, instances * 16), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.colors.subarray(0, instances * 3), gl.DYNAMIC_DRAW);
    gl.bindVertexArray(mesh.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0, instances);
  }

  private writeRobotColor(particle: number, targetOffset: number, brightness: number): void {
    const robot = Math.floor(particle / PARTICLES_PER_ROBOT);
    const colorOffset = (robot % 6) * 3;
    this.colors[targetOffset] = PALETTE[colorOffset]! * brightness;
    this.colors[targetOffset + 1] = PALETTE[colorOffset + 1]! * brightness;
    this.colors[targetOffset + 2] = PALETTE[colorOffset + 2]! * brightness;
  }
}
