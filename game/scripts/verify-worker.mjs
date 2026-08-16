import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

function browserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const executable = candidates.find((candidate) => existsSync(candidate));
  if (!executable) throw new Error('Chrome/Chromium was not found; set CHROME_PATH for the Worker browser verifier');
  return executable;
}

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error('Vite did not provide a local verification URL');
  browser = await chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.CatchDavelAgent));
  const result = await page.evaluate(async () => {
    const seed = 'worker-determinism-proof';
    const action = { forward: 0.65, strafe: -0.2, turn: 0.001, look: 0, fire: false };
    const api = window.CatchDavelAgent;
    api.reset({ seed });
    await api.step({ action, ticks: 240 });
    const directChecksum = api.getMetrics().checksum;
    const worker = new Worker(new URL('/src/workers/simulation.worker.ts', location.href), { type: 'module' });
    const channel = new MessageChannel();
    const responses = [];
    const snapshots = [];
    worker.onmessage = (event) => responses.push(event.data);
    channel.port2.onmessage = (event) => snapshots.push(event.data);
    channel.port2.start();
    worker.postMessage({ type: 'initialize', seed, snapshotPort: channel.port1 }, [channel.port1]);
    const waitFor = async (predicate) => {
      const deadline = performance.now() + 10_000;
      while (!predicate()) {
        if (performance.now() > deadline) throw new Error('Simulation Worker verification timed out');
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    };
    await waitFor(() => responses.some((message) => message.type === 'ready'));
    worker.postMessage({
      type: 'step', requestId: 7,
      command: { forward: 0.65, strafe: -0.2, yawDelta: 0.001, pitchDelta: 0, fire: false },
      ticks: 240,
    });
    await waitFor(() => responses.some((message) => message.type === 'complete' && message.requestId === 7));
    const complete = responses.find((message) => message.type === 'complete' && message.requestId === 7);
    await waitFor(() => snapshots.length >= 2);
    const initialTicks = snapshots.map((message) => new DataView(message.buffer).getUint32(4, true));
    const returned = snapshots[0];
    channel.port2.postMessage({
      type: 'return-snapshot', generation: returned.generation, slotId: returned.slotId, buffer: returned.buffer,
    }, [returned.buffer]);
    await waitFor(() => snapshots.length >= 3);
    const newestTick = new DataView(snapshots[2].buffer).getUint32(4, true);
    for (const message of snapshots.slice(1)) {
      channel.port2.postMessage({
        type: 'return-snapshot', generation: message.generation, slotId: message.slotId, buffer: message.buffer,
      }, [message.buffer]);
    }
    worker.terminate();
    return { directChecksum, workerChecksum: complete.checksum, transport: complete.transport, initialTicks, newestTick };
  });
  const failures = [...errors];
  if (result.directChecksum !== result.workerChecksum) failures.push('Direct and Worker checksums differ');
  if (result.transport.inFlight !== 2 || result.transport.producerOwned !== 1) failures.push('Three-buffer ownership invariant was not observed');
  if (result.transport.coalesced !== 239) failures.push(`Expected 239 coalesced snapshots, got ${result.transport.coalesced}`);
  if (result.newestTick !== 240) failures.push(`Expected recovered newest tick 240, got ${result.newestTick}`);
  if (failures.length > 0) throw new Error(failures.join('; '));
  process.stdout.write(`${JSON.stringify({ passed: true, ...result }, null, 2)}\n`);
} finally {
  await browser?.close();
  await server.close();
}
