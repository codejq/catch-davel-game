import './style.css';

const status = document.querySelector<HTMLParagraphElement>('#runtime-status');
const metrics = document.querySelector<HTMLPreElement>('#metrics');
const canvas = document.querySelector<HTMLCanvasElement>('#game');

if (status === null || metrics === null || canvas === null) {
  throw new Error('Phase -1 page is missing required elements');
}

status.textContent = 'Scaffold ready; deterministic workload initialization follows.';
metrics.textContent = [
  'Decisions 16–20: approved',
  'Renderer: raw WebGL2 (pending)',
  'Simulation: 60 Hz / 2 substeps / 8 iterations (pending)',
  'Active robots: 24 (pending)',
  'Host certification: development-only VMware environment',
].join('\n');

const context = canvas.getContext('webgl2');
if (context === null) {
  status.textContent = 'WebGL2 is unavailable on this host.';
} else {
  context.clearColor(0.027, 0.035, 0.071, 1);
  context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
}

