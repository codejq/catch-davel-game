import { linkProgram } from './lighting-glsl';

const FULLSCREEN_VERTEX_SHADER = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = position;
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}`;

const BRIGHT_PASS_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform vec2 uTexel;
uniform float uThreshold;
out vec4 outColor;
void main() {
  vec3 color = vec3(0.0);
  for (int y = -1; y <= 1; y += 2) {
    for (int x = -1; x <= 1; x += 2) color += texture(uScene, vUv + vec2(float(x), float(y)) * uTexel).rgb;
  }
  color *= 0.25;
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float knee = smoothstep(uThreshold, uThreshold + 0.22, luminance);
  outColor = vec4(color * knee, 1.0);
}`;

const BLUR_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uDirection;
out vec4 outColor;
void main() {
  vec3 color = texture(uSource, vUv).rgb * 0.2270270270;
  color += texture(uSource, vUv + uDirection * 1.3846153846).rgb * 0.3162162162;
  color += texture(uSource, vUv - uDirection * 1.3846153846).rgb * 0.3162162162;
  color += texture(uSource, vUv + uDirection * 3.2307692308).rgb * 0.0702702703;
  color += texture(uSource, vUv - uDirection * 3.2307692308).rgb * 0.0702702703;
  outColor = vec4(color, 1.0);
}`;

const COMPOSITE_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uVignette;
uniform float uTime;
uniform float uAberration;
out vec4 outColor;
float grain(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 centered = vUv - 0.5;
  vec2 offset = centered * uAberration;
  vec3 scene = vec3(
    texture(uScene, vUv + offset).r,
    texture(uScene, vUv).g,
    texture(uScene, vUv - offset).b
  );
  vec3 bloom = texture(uBloom, vUv).rgb;
  vec3 color = scene + bloom * uBloomStrength;
  color = color / (1.0 + max(color - 1.0, 0.0));
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luminance), color, 1.06);
  color = mix(color, color * color * (3.0 - 2.0 * color), 0.22);
  float vignette = 1.0 - dot(centered, centered) * uVignette;
  color *= clamp(vignette, 0.0, 1.0);
  color += (grain(vUv * 913.0 + uTime) - 0.5) * 0.018;
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

interface ColorTarget {
  readonly framebuffer: WebGLFramebuffer;
  readonly texture: WebGLTexture;
  readonly width: number;
  readonly height: number;
}

function uniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation | null {
  return gl.getUniformLocation(program, name);
}

// Renders the scene into an anti-aliased offscreen target, extracts a soft bloom from bright emissive
// surfaces, and composites with a gentle cinematic grade, vignette, and film grain.
export class PostProcessor {
  private readonly brightProgram: WebGLProgram;
  private readonly blurProgram: WebGLProgram;
  private readonly compositeProgram: WebGLProgram;
  private readonly emptyVao: WebGLVertexArrayObject;
  private readonly samples: number;
  private width = 0;
  private height = 0;
  private msaaFramebuffer: WebGLFramebuffer | null = null;
  private msaaColor: WebGLRenderbuffer | null = null;
  private depthBuffer: WebGLRenderbuffer | null = null;
  private scene: ColorTarget | null = null;
  private bloomA: ColorTarget | null = null;
  private bloomB: ColorTarget | null = null;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.brightProgram = linkProgram(gl, FULLSCREEN_VERTEX_SHADER, BRIGHT_PASS_SHADER, 'bloom bright-pass');
    this.blurProgram = linkProgram(gl, FULLSCREEN_VERTEX_SHADER, BLUR_SHADER, 'bloom blur');
    this.compositeProgram = linkProgram(gl, FULLSCREEN_VERTEX_SHADER, COMPOSITE_SHADER, 'post composite');
    const vao = gl.createVertexArray();
    if (vao === null) throw new Error('Unable to allocate post-process vertex array');
    this.emptyVao = vao;
    this.samples = Math.max(0, Math.min(4, Number(gl.getParameter(gl.MAX_SAMPLES)) || 0));
  }

  begin(width: number, height: number): void {
    const { gl } = this;
    if (width !== this.width || height !== this.height) this.allocate(width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msaaFramebuffer ?? this.scene!.framebuffer);
    gl.viewport(0, 0, width, height);
  }

  finish(timeSeconds: number, bloomStrength: number, aberration: number): void {
    const { gl } = this;
    const scene = this.scene!;
    const bloomA = this.bloomA!;
    const bloomB = this.bloomB!;
    if (this.msaaFramebuffer !== null) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msaaFramebuffer);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, scene.framebuffer);
      gl.blitFramebuffer(0, 0, this.width, this.height, 0, 0, this.width, this.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(this.emptyVao);
    gl.activeTexture(gl.TEXTURE0);

    gl.useProgram(this.brightProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloomA.framebuffer);
    gl.viewport(0, 0, bloomA.width, bloomA.height);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    gl.uniform1i(uniform(gl, this.brightProgram, 'uScene'), 0);
    gl.uniform2f(uniform(gl, this.brightProgram, 'uTexel'), 1 / scene.width, 1 / scene.height);
    gl.uniform1f(uniform(gl, this.brightProgram, 'uThreshold'), 0.8);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(this.blurProgram);
    gl.uniform1i(uniform(gl, this.blurProgram, 'uSource'), 0);
    const directionLocation = uniform(gl, this.blurProgram, 'uDirection');
    for (const spread of [1, 2.2]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomB.framebuffer);
      gl.bindTexture(gl.TEXTURE_2D, bloomA.texture);
      gl.uniform2f(directionLocation, spread / bloomA.width, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomA.framebuffer);
      gl.bindTexture(gl.TEXTURE_2D, bloomB.texture);
      gl.uniform2f(directionLocation, 0, spread / bloomA.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.compositeProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bloomA.texture);
    gl.uniform1i(uniform(gl, this.compositeProgram, 'uScene'), 0);
    gl.uniform1i(uniform(gl, this.compositeProgram, 'uBloom'), 1);
    gl.uniform1f(uniform(gl, this.compositeProgram, 'uBloomStrength'), bloomStrength);
    gl.uniform1f(uniform(gl, this.compositeProgram, 'uVignette'), 0.72);
    gl.uniform1f(uniform(gl, this.compositeProgram, 'uTime'), timeSeconds % 61);
    gl.uniform1f(uniform(gl, this.compositeProgram, 'uAberration'), aberration);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
  }

  private allocate(width: number, height: number): void {
    const { gl } = this;
    this.release();
    this.width = width;
    this.height = height;
    this.scene = this.colorTarget(width, height);
    const depth = gl.createRenderbuffer();
    if (depth === null) throw new Error('Unable to allocate post-process depth buffer');
    this.depthBuffer = depth;
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    if (this.samples > 1) {
      const framebuffer = gl.createFramebuffer();
      const color = gl.createRenderbuffer();
      if (framebuffer === null || color === null) throw new Error('Unable to allocate multisample target');
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, width, height);
      gl.bindRenderbuffer(gl.RENDERBUFFER, color);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.RGBA8, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, color);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
      this.msaaFramebuffer = framebuffer;
      this.msaaColor = color;
    } else {
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.framebuffer);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    }
    const bloomWidth = Math.max(1, Math.floor(width / 2));
    const bloomHeight = Math.max(1, Math.floor(height / 2));
    this.bloomA = this.colorTarget(bloomWidth, bloomHeight);
    this.bloomB = this.colorTarget(bloomWidth, bloomHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  }

  private colorTarget(width: number, height: number): ColorTarget {
    const { gl } = this;
    const framebuffer = gl.createFramebuffer();
    const texture = gl.createTexture();
    if (framebuffer === null || texture === null) throw new Error('Unable to allocate post-process target');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return { framebuffer, texture, width, height };
  }

  private release(): void {
    const { gl } = this;
    for (const target of [this.scene, this.bloomA, this.bloomB]) {
      if (target === null) continue;
      gl.deleteFramebuffer(target.framebuffer);
      gl.deleteTexture(target.texture);
    }
    if (this.msaaFramebuffer !== null) gl.deleteFramebuffer(this.msaaFramebuffer);
    if (this.msaaColor !== null) gl.deleteRenderbuffer(this.msaaColor);
    if (this.depthBuffer !== null) gl.deleteRenderbuffer(this.depthBuffer);
    this.scene = null; this.bloomA = null; this.bloomB = null;
    this.msaaFramebuffer = null; this.msaaColor = null; this.depthBuffer = null;
  }
}
