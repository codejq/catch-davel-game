import { lookAt, multiplyMatrix4, orthographic } from './math';
import { SUN_DIRECTION } from './lighting-glsl';

export const SHADOW_TEXTURE_UNIT = 2;

// A single orthographic sun shadow map that covers the whole maze. Maze levels are static, so the light
// frustum only changes when the level footprint changes.
export class ShadowMap {
  readonly lightViewProjection = new Float32Array(16);
  private readonly framebuffer: WebGLFramebuffer;
  private readonly texture: WebGLTexture;
  private readonly projection = new Float32Array(16);
  private readonly view = new Float32Array(16);

  constructor(private readonly gl: WebGL2RenderingContext, readonly size: number) {
    const framebuffer = gl.createFramebuffer();
    const texture = gl.createTexture();
    if (framebuffer === null || texture === null) throw new Error('Unable to allocate shadow map');
    this.framebuffer = framebuffer;
    this.texture = texture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!complete) throw new Error('Shadow map framebuffer is incomplete');
  }

  fitLevel(halfWidth: number, halfDepth: number): void {
    const distance = 60;
    lookAt(
      this.view,
      SUN_DIRECTION[0] * distance, SUN_DIRECTION[1] * distance, SUN_DIRECTION[2] * distance,
      0, 0, 0,
    );
    const radius = Math.hypot(halfWidth, halfDepth) + 1.5;
    orthographic(this.projection, -radius, radius, -radius, radius, distance - radius - 8, distance + radius + 8);
    multiplyMatrix4(this.lightViewProjection, this.projection, this.view);
  }

  begin(): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.size, this.size);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.6, 2.5);
    gl.colorMask(false, false, false, false);
  }

  end(): void {
    const { gl } = this;
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.colorMask(true, true, true, true);
  }

  bind(unit = SHADOW_TEXTURE_UNIT): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.activeTexture(this.gl.TEXTURE0);
  }

  dispose(): void {
    this.gl.deleteFramebuffer(this.framebuffer);
    this.gl.deleteTexture(this.texture);
  }
}

// Placeholder bound when shadows are disabled so sampler2DShadow always has a valid depth texture.
export function createFallbackShadowTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  if (texture === null) throw new Error('Unable to allocate fallback shadow texture');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, 1, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  return texture;
}
