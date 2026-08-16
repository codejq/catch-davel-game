import './style.css';

function requireCanvas(): HTMLCanvasElement {
  const element = document.querySelector<HTMLCanvasElement>('#game');
  if (element === null) throw new Error('Game canvas is missing');
  return element;
}

function requireWebGL2(element: HTMLCanvasElement): WebGL2RenderingContext {
  const context = element.getContext('webgl2', { alpha: false, antialias: true });
  if (context === null) throw new Error('Catch Davel requires WebGL2');
  return context;
}

const canvas = requireCanvas();
const gl = requireWebGL2(canvas);

function resize(): void {
  const pixelRatio = Math.min(devicePixelRatio, 2);
  canvas.width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
  canvas.height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
  gl.viewport(0, 0, canvas.width, canvas.height);
}

new ResizeObserver(resize).observe(canvas);
resize();
gl.clearColor(0.31, 0.82, 1, 1);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

canvas.addEventListener('click', () => {
  if (document.pointerLockElement !== canvas) void canvas.requestPointerLock();
  else {
    document.body.classList.add('firing');
    setTimeout(() => document.body.classList.remove('firing'), 80);
  }
});
document.addEventListener('pointerlockchange', () => {
  document.body.classList.toggle('locked', document.pointerLockElement === canvas);
});
