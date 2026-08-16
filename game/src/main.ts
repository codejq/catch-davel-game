import './style.css';
import { WorldRenderer } from './render/world-renderer';
import { FIXED_DT_SECONDS, LOOK_SCALE } from './sim/constants';
import { GameSimulation } from './sim/game';

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

const renderer = new WorldRenderer(gl, canvas);
const simulation = new GameSimulation();
const pressed = new Set<string>();
let yawDelta = 0;
let pitchDelta = 0;
let fireQueued = false;
let previousTime = performance.now();
let accumulator = 0;

new ResizeObserver(() => renderer.resize()).observe(canvas);
renderer.resize();

window.addEventListener('keydown', (event: KeyboardEvent) => pressed.add(event.code));
window.addEventListener('keyup', (event: KeyboardEvent) => pressed.delete(event.code));
window.addEventListener('blur', () => pressed.clear());
window.addEventListener('mousemove', (event: MouseEvent) => {
  if (document.pointerLockElement !== canvas) return;
  yawDelta += event.movementX * LOOK_SCALE;
  pitchDelta -= event.movementY * LOOK_SCALE;
});

canvas.addEventListener('click', () => {
  if (document.pointerLockElement !== canvas) void canvas.requestPointerLock();
  else {
    fireQueued = true;
    document.body.classList.add('firing');
    setTimeout(() => document.body.classList.remove('firing'), 80);
  }
});
document.addEventListener('pointerlockchange', () => {
  document.body.classList.toggle('locked', document.pointerLockElement === canvas);
});

function frame(now: number): void {
  accumulator += Math.min(0.1, (now - previousTime) / 1_000);
  previousTime = now;
  let catchupSteps = 0;
  while (accumulator >= FIXED_DT_SECONDS && catchupSteps < 5) {
    simulation.step({
      forward: Number(pressed.has('KeyW') || pressed.has('ArrowUp')) - Number(pressed.has('KeyS') || pressed.has('ArrowDown')),
      strafe: Number(pressed.has('KeyD') || pressed.has('ArrowRight')) - Number(pressed.has('KeyA') || pressed.has('ArrowLeft')),
      yawDelta,
      pitchDelta,
      fire: fireQueued,
    });
    yawDelta = 0;
    pitchDelta = 0;
    fireQueued = false;
    accumulator -= FIXED_DT_SECONDS;
    catchupSteps += 1;
  }
  renderer.render(simulation.state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
