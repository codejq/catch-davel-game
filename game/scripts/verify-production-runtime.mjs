import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

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
  if (!executable) throw new Error('Chrome/Chromium was not found; set CHROME_PATH for the production verifier');
  return executable;
}

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await preview({ root, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;

try {
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error('Vite preview did not provide a local verification URL');
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
  await page.waitForFunction(() => (
    document.body.dataset.profileReady === 'true'
    && document.body.dataset.workerStatus === 'ready'
    && Number(document.body.dataset.snapshotTick) > 0
  ));
  const startTick = await page.evaluate(() => Number(document.body.dataset.snapshotTick));
  await page.waitForTimeout(300);
  const result = await page.evaluate((before) => ({
    startTick: before,
    endTick: Number(document.body.dataset.snapshotTick),
    agentApiExposed: window.CatchDavelAgent !== undefined,
    rendererMode: document.body.dataset.rendererMode,
    workerStatus: document.body.dataset.workerStatus,
    profileReady: document.body.dataset.profileReady,
  }), startTick);
  if (result.agentApiExposed) throw new Error('Default production build exposed the mutation-capable agent API');
  if (result.endTick <= result.startTick) throw new Error('Production Simulation Worker clock did not advance');
  if (result.rendererMode !== 'offscreen-worker') throw new Error('Production runtime did not initialize the OffscreenCanvas render Worker');
  if (errors.length > 0) throw new Error(`Production browser errors: ${errors.join('; ')}`);

  const fallbackPage = await browser.newPage();
  const fallbackErrors = [];
  fallbackPage.on('pageerror', (error) => fallbackErrors.push(error.message));
  fallbackPage.on('console', (message) => { if (message.type() === 'error') fallbackErrors.push(message.text()); });
  await fallbackPage.goto(`${url}?renderer=main`, { waitUntil: 'load' });
  await fallbackPage.waitForFunction(() => (
    document.body.dataset.workerStatus === 'ready'
    && document.body.dataset.rendererMode === 'main-thread-fallback'
    && Number(document.body.dataset.snapshotTick) > 0
  ));
  const fallback = await fallbackPage.evaluate(() => ({
    mode: document.body.dataset.rendererMode,
    webgl2: document.querySelector('#game')?.getContext('webgl2') !== null,
    tick: Number(document.body.dataset.snapshotTick),
    agentApiExposed: window.CatchDavelAgent !== undefined,
  }));
  if (!fallback.webgl2 || fallback.mode !== 'main-thread-fallback') throw new Error('Main-thread WebGL2 fallback did not initialize');
  if (fallback.agentApiExposed) throw new Error('Fallback production build exposed the mutation-capable agent API');
  if (fallbackErrors.length > 0) throw new Error(`Fallback browser errors: ${fallbackErrors.join('; ')}`);

  const chapterPage = await browser.newPage();
  const chapterErrors = [];
  chapterPage.on('pageerror', (error) => chapterErrors.push(error.message));
  chapterPage.on('console', (message) => { if (message.type() === 'error') chapterErrors.push(message.text()); });
  await chapterPage.goto(`${url}?arsenal=training&level=level-008`, { waitUntil: 'load' });
  await chapterPage.waitForFunction(() => (
    document.body.dataset.workerStatus === 'ready'
    && document.body.dataset.levelId === 'level-008'
    && Number(document.body.dataset.snapshotTick) > 0
  ));
  const chapterLevel = await chapterPage.evaluate(() => ({
    levelId: document.body.dataset.levelId,
    remaining: document.querySelector('#remaining')?.textContent ?? '',
    agentApiExposed: window.CatchDavelAgent !== undefined,
  }));
  if (chapterLevel.remaining !== '8 Davels remain') throw new Error('Production Level 8 did not render its eight-Davel roster');
  if (chapterLevel.agentApiExposed) throw new Error('Chapter production page exposed the mutation-capable agent API');
  if (chapterErrors.length > 0) throw new Error(`Chapter browser errors: ${chapterErrors.join('; ')}`);
  console.log(JSON.stringify({
    passed: true, ...result, browserErrors: errors,
    fallback: { ...fallback, browserErrors: fallbackErrors },
    chapterLevel: { ...chapterLevel, browserErrors: chapterErrors },
  }, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
