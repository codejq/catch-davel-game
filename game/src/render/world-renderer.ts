import { CELL_SIZE, PLAYER_EYE_HEIGHT } from '../sim/constants';
import { cellCenter, findCell, LEVEL_HEIGHT, LEVEL_WIDTH, wallCells } from '../sim/level';
import type { GameState } from '../sim/game';
import { createCube } from './geometry';
import { lookAt, multiplyMatrix4, perspective, writeTranslationScale } from './math';
import { DavelRenderer } from './davel-renderer';

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
  outColor = vec4(mix(color, vec3(0.32, 0.83, 1.0), fog), 1.0);
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
  private readonly matrices = new Float32Array(MAX_INSTANCES * 16);
  private readonly colors = new Float32Array(MAX_INSTANCES * 3);
  private readonly projection = new Float32Array(16);
  private readonly view = new Float32Array(16);
  private readonly viewProjection = new Float32Array(16);
  private readonly indexCount: number;
  private readonly davels: DavelRenderer;
  private instanceCount = 0;

  constructor(private readonly gl: WebGL2RenderingContext, private readonly canvas: HTMLCanvasElement) {
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
    const uniform = gl.getUniformLocation(this.program, 'uViewProjection');
    if (uniform === null) throw new Error('World shader uniform is unavailable');
    this.viewProjectionLocation = uniform;
    this.buildWorldInstances();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
  }

  resize(): void {
    const pixelRatio = Math.min(devicePixelRatio, 2);
    this.canvas.width = Math.max(1, Math.floor(this.canvas.clientWidth * pixelRatio));
    this.canvas.height = Math.max(1, Math.floor(this.canvas.clientHeight * pixelRatio));
  }

  render(state: GameState): void {
    const { gl } = this;
    const player = state.player;
    const eyeY = PLAYER_EYE_HEIGHT + Math.sin(player.bobPhase) * 0.025;
    const cosPitch = Math.cos(player.pitch);
    const directionX = Math.sin(player.yaw) * cosPitch;
    const directionY = Math.sin(player.pitch);
    const directionZ = -Math.cos(player.yaw) * cosPitch;
    perspective(this.projection, Math.PI / 2.8, this.canvas.width / this.canvas.height, 0.06, 70);
    lookAt(this.view, player.x, eyeY, player.z, player.x + directionX, eyeY + directionY, player.z + directionZ);
    multiplyMatrix4(this.viewProjection, this.projection, this.view);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.32, 0.83, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.viewProjectionLocation, false, this.viewProjection);
    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0, this.instanceCount);
    this.davels.render(state.robots, this.viewProjection);
  }

  private buildWorldInstances(): void {
    let instance = 0;
    const write = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: readonly [number, number, number]): void => {
      if (instance >= MAX_INSTANCES) throw new Error('World instance capacity exceeded');
      writeTranslationScale(this.matrices, instance * 16, x, y, z, sx, sy, sz);
      this.colors.set(color, instance * 3);
      instance += 1;
    };
    write(0, -0.14, 0, LEVEL_WIDTH * CELL_SIZE, 0.28, LEVEL_HEIGHT * CELL_SIZE, [1, 0.74, 0.27]);
    const palette = [
      [1, 0.31, 0.48], [0.2, 0.84, 0.76], [0.57, 0.38, 0.96], [1, 0.49, 0.2],
    ] as const;
    for (const wall of wallCells()) {
      const center = cellCenter(wall.column, wall.row);
      write(center.x, 1.55, center.z, CELL_SIZE, 3.1, CELL_SIZE, palette[(wall.column + wall.row * 3) % palette.length]!);
    }
    const exit = findCell('E');
    const exitCenter = cellCenter(exit.column, exit.row);
    write(exitCenter.x, 1.35, exitCenter.z, 1.25, 2.7, 1.25, [0.22, 1, 0.48]);
    this.instanceCount = instance;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.matrixBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.matrices.subarray(0, instance * 16), this.gl.STATIC_DRAW);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.colors.subarray(0, instance * 3), this.gl.STATIC_DRAW);
  }
}
