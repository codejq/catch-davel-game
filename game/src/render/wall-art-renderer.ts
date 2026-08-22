import type { PlayableLevelId } from '../content/level-ids';
import { wallArtPlacements, WALL_ART_IMAGE_COUNT } from './environment-landmarks';

const IMAGE_SIZE = 512;
const ARTWORKS_PER_LEVEL = 5;
const ART_WIDTH = 1.3;
const ART_HEIGHT = 2.12;

export const WALL_ART_FILES = [
  '0313f22a953e33f05e5477ddd63e2aa5.jpg', '06b0c288f00d4b502b8f624f9d954fb6.jpg',
  '1cfce81629c2c80dedf2c4e02ebed54f.jpg', '1f95a4880c1537b179be9169ff196f87.jpg',
  '2838df313707fb08853bdd06798d2476.jpg', '2f4f1b77b828cf21ce08697aa43e0510.jpg',
  '30149bdcef11249090581f3414515185.jpg', '307cdc00fcc036379b512e8509e9cf39.jpg',
  '30e965981859fdf6779f30cb9aaacf23.jpg', '316f607a3847b4c10be813aeebf8da60.jpg',
  '38b50f891a7e3f6cefe344a0377cb5b5.jpg', '3dde9263a698bb677ee872e81cadebca.jpg',
  '40a581d0b6117f22b8cd9e7668122a78.jpg', '42f9d090128d96e5c38a7f3b74907651.jpg',
  '453199863653576208a38a547843addf.jpg', '45c04329ff263afad435f4270fd3b3f6.jpg',
  '4bbe96d5e5b9b6c0ad2bc196434ead22.jpg', '4be69e45d9dd455ae89705835f78748e.jpg',
  '4e004025767319b4f2c68cf52e3be825.jpg', '53c0b0d32be6d98f1531d213d7d3a54f.jpg',
  '5e05e1dbf98048e9f981f54d4e9d84ee.jpg', '5e768869bed8a2da4431b53a7773076c.jpg',
  '5ff523517378f1a28b4c7091637e4b9c.jpg', '62073a633e05db1b6ba56a294a7314fd.jpg',
  '699ed39d3e274828a8be300c60b638c5.jpg', '72b5c281e37555c714163c8107a98e4d.jpg',
  '79c77565607829d4d233ff74e5881f9a.jpg', '8373e92ea3ec02e2f47458e70a1c5bce.jpg',
  '841f17780e55347bfc1f80dd94730402.jpg', '857898812f7f37b4ce9e60ee96032c4b.jpg',
  '85bd65920ad9fc2b6bfca4f470282d82.jpg', '88ff423242a47ac569a35314f5bc7443.jpg',
  '89a55a6c68a452991cb93fa4c6c71c5c.jpg', '8e5f9033af3aef1da0d7134c25e53aee.jpg',
  '926335e4ce82e1c4a5c66380a3b8eabd.jpg', '9922f7a7454b3172815eed4b1c0e31fc.jpg',
  '9b1341d589ec48c0aa879727c418cfb7.jpg', 'a9eba5a6cf53369f9f56200342d75c47.jpg',
  'b8874f542ea122d41a72cdf63613d016.jpg', 'b9812ad57a6a2115ebfd25638ecc2ce5.jpg',
  'c22c1f8afaa0f3e98633691b687a523b.jpg', 'c9cf35ee3be574b389cbfcea92aa3713.jpg',
  'cbaf591980c4c024036b7fe5c3378016.jpg', 'd25b9676413166477c0d9b60eba56c8b.jpg',
  'd9c3d5b9b23fef7e04b0738a3ea5abbe.jpg', 'de2b915068c159d4d103d28df71370ca.jpg',
  'download (1).png', 'download (2).png', 'download (3).png', 'download (4).png',
  'download (5).png', 'download.png', 'e47f440e0fa8f540387b02fc7ad363cc.jpg',
  'e9febe02a8c8a1aafe642cbe3850745a.jpg', 'ef23ec9cfa70749b2989de4bdad31658.jpg',
  'f2d8f32cca50fde84d74d05b948b02b5.jpg', 'f4c1a327b25a2c635fc4c86b6ec28fe9.jpg',
] as const;

const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec2 aUv;
layout(location=2) in float aLayer;
uniform mat4 uViewProjection;
out vec2 vUv;
flat out float vLayer;
void main() { vUv = aUv; vLayer = aLayer; gl_Position = uViewProjection * vec4(aPosition, 1.0); }`;
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
flat in float vLayer;
uniform highp sampler2DArray uArtwork;
out vec4 outColor;
void main() { outColor = texture(uArtwork, vec3(vUv, vLayer)); }`;

function shader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const result = gl.createShader(type);
  if (result === null) throw new Error('Unable to allocate wall-art shader');
  gl.shaderSource(result, source); gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result) ?? 'Wall-art shader failed');
  return result;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const result = gl.createProgram();
  if (result === null) throw new Error('Unable to allocate wall-art program');
  const vertex = shader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(result, vertex); gl.attachShader(result, fragment); gl.linkProgram(result);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result) ?? 'Wall-art program failed');
  return result;
}

export class WallArtRenderer {
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vertexBuffer: WebGLBuffer;
  private readonly texture: WebGLTexture;
  private readonly viewProjectionLocation: WebGLUniformLocation;
  private ready = false;
  private vertexCount = 0;
  private loadGeneration = 0;

  constructor(private readonly gl: WebGL2RenderingContext) {
    if (WALL_ART_FILES.length !== WALL_ART_IMAGE_COUNT) throw new Error('Wall-art file catalog is incomplete');
    const vao = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const texture = gl.createTexture();
    this.program = createProgram(gl);
    const location = gl.getUniformLocation(this.program, 'uViewProjection');
    if (vao === null || vertexBuffer === null || texture === null || location === null) throw new Error('Unable to allocate wall-art renderer');
    this.vao = vao; this.vertexBuffer = vertexBuffer; this.texture = texture; this.viewProjectionLocation = location;
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 24, 20);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, IMAGE_SIZE, IMAGE_SIZE, ARTWORKS_PER_LEVEL);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  setLevel(levelId: PlayableLevelId): void {
    const vertices: number[] = [];
    const placements = wallArtPlacements(levelId);
    for (const [localLayer, art] of placements.entries()) {
      const acrossX = art.facesX ? 0 : ART_WIDTH / 2;
      const acrossZ = art.facesX ? ART_WIDTH / 2 : 0;
      const leftX = art.x - acrossX; const rightX = art.x + acrossX;
      const leftZ = art.z - acrossZ; const rightZ = art.z + acrossZ;
      const bottom = art.y - ART_HEIGHT / 2; const top = art.y + ART_HEIGHT / 2;
      const frontFacing = art.facesX ? art.outwardSign < 0 : art.outwardSign > 0;
      const quad = frontFacing
        ? [[leftX, bottom, leftZ, 0, 1], [rightX, bottom, rightZ, 1, 1], [rightX, top, rightZ, 1, 0], [leftX, top, leftZ, 0, 0]]
        : [[rightX, bottom, rightZ, 0, 1], [leftX, bottom, leftZ, 1, 1], [leftX, top, leftZ, 1, 0], [rightX, top, rightZ, 0, 0]];
      for (const index of [0, 1, 2, 0, 2, 3]) vertices.push(...quad[index]!, localLayer);
    }
    this.vertexCount = vertices.length / 6;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    this.ready = false;
    this.loadGeneration += 1;
    void this.loadImages(placements.map((placement, layer) => ({ layer, fileIndex: placement.imageIndex })), this.loadGeneration);
  }

  render(viewProjection: Float32Array): void {
    if (!this.ready || this.vertexCount === 0) return;
    const { gl } = this;
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.viewProjectionLocation, false, viewProjection);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
    gl.bindVertexArray(this.vao); gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
  }

  private async loadImages(
    images: readonly { readonly layer: number; readonly fileIndex: number }[], generation: number,
  ): Promise<void> {
    const canvas = typeof OffscreenCanvas === 'undefined'
      ? Object.assign(document.createElement('canvas'), { width: IMAGE_SIZE, height: IMAGE_SIZE })
      : new OffscreenCanvas(IMAGE_SIZE, IMAGE_SIZE);
    const context = canvas.getContext('2d');
    if (context === null) return;
    for (const { layer, fileIndex } of images) {
      const file = WALL_ART_FILES[fileIndex]!;
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}wall-art/${encodeURIComponent(file)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bitmap = await createImageBitmap(await response.blob());
        context.fillStyle = '#080808'; context.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
        const scale = Math.min(IMAGE_SIZE / bitmap.width, IMAGE_SIZE / bitmap.height);
        const width = bitmap.width * scale; const height = bitmap.height * scale;
        context.drawImage(bitmap, (IMAGE_SIZE - width) / 2, (IMAGE_SIZE - height) / 2, width, height);
        bitmap.close();
        this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, this.texture);
        this.gl.texSubImage3D(
          this.gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, IMAGE_SIZE, IMAGE_SIZE, 1,
          this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas,
        );
      } catch (error) {
        console.warn(`Unable to load wall art ${file}`, error);
      }
    }
    if (generation === this.loadGeneration) this.ready = true;
  }
}
