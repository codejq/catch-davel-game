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
    campaignCards: document.querySelectorAll('#campaign-levels .level-card').length,
    campaignUnlockedCards: document.querySelectorAll('#campaign-levels .level-card:not(:disabled)').length,
    campaignButtonVisible: !document.querySelector('#campaign-button')?.hidden,
  }), startTick);
  if (result.agentApiExposed) throw new Error('Default production build exposed the mutation-capable agent API');
  if (result.endTick <= result.startTick) throw new Error('Production Simulation Worker clock did not advance');
  if (result.rendererMode !== 'offscreen-worker') throw new Error('Production runtime did not initialize the OffscreenCanvas render Worker');
  if (result.campaignCards !== 10 || result.campaignUnlockedCards !== 1 || !result.campaignButtonVisible) {
    throw new Error('Production campaign map did not expose the expected fresh-profile progression state');
  }
  await page.click('#campaign-button');
  await page.waitForFunction(() => document.querySelector('#campaign-map')?.classList.contains('open') === true);
  await page.waitForTimeout(80);
  const pausedStartTick = await page.evaluate(() => Number(document.body.dataset.snapshotTick));
  await page.waitForTimeout(250);
  const pausedEndTick = await page.evaluate(() => Number(document.body.dataset.snapshotTick));
  await page.click('#campaign-close');
  await page.waitForTimeout(250);
  const resumedAfterMapTick = await page.evaluate(() => Number(document.body.dataset.snapshotTick));
  const campaignFlow = { pausedStartTick, pausedEndTick, resumedAfterMapTick };
  if (pausedEndTick !== pausedStartTick || resumedAfterMapTick <= pausedEndTick) {
    throw new Error(`Campaign map did not pause and resume the authoritative Worker clock: ${JSON.stringify(campaignFlow)}`);
  }
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

  const toolingPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const toolingErrors = [];
  toolingPage.on('pageerror', (error) => toolingErrors.push(error.message));
  toolingPage.on('console', (message) => { if (message.type() === 'error') toolingErrors.push(message.text()); });
  await toolingPage.goto(new URL('tooling.html', url).href, { waitUntil: 'load' });
  await toolingPage.waitForFunction(() => document.querySelector('#validation-status')?.classList.contains('valid') === true);
  await toolingPage.selectOption('#level-select', 'level-008');
  await toolingPage.waitForFunction(() => document.querySelector('#level-select')?.value === 'level-008'
    && document.querySelector('#validation-status')?.classList.contains('valid') === true);
  await toolingPage.click('#sample-replay');
  await toolingPage.waitForFunction(() => document.querySelector('#replay-status')?.classList.contains('valid') === true);
  const toolingProof = await toolingPage.evaluate(() => ({
    authoredLevels: document.querySelectorAll('#level-select option').length,
    mazeCells: document.querySelectorAll('#maze .maze-cell').length,
    timedGates: [...document.querySelectorAll('#maze .maze-cell')].filter((cell) => cell.textContent === '⏱').length,
    graphNodes: document.querySelectorAll('#graph rect').length,
    danceBeats: document.querySelectorAll('#dance-timeline span').length,
    status: document.querySelector('#validation-status')?.textContent ?? '',
    replayStatus: document.querySelector('#replay-status')?.textContent ?? '',
    replayDependencies: document.querySelectorAll('#replay-dependencies .dependency-match').length,
    replayChecksums: document.querySelectorAll('#replay-checksums span').length,
    replayCommandRuns: document.querySelectorAll('#replay-commands div').length,
  }));
  await toolingPage.evaluate(() => {
    const source = document.querySelector('#level-source');
    const value = JSON.parse(source.value);
    value.surprise = true;
    source.value = JSON.stringify(value);
  });
  await toolingPage.click('#validate-level');
  const rejectsUnknownField = await toolingPage.locator('#validation-status').evaluate((node) => node.classList.contains('invalid'));
  if (toolingProof.authoredLevels !== 10 || toolingProof.mazeCells !== 225 || toolingProof.timedGates !== 3
    || toolingProof.graphNodes !== 6 || toolingProof.danceBeats !== 16 || !toolingProof.status.startsWith('VALID')
    || !toolingProof.replayStatus.startsWith('VERIFIED') || toolingProof.replayDependencies !== 4
    || toolingProof.replayChecksums !== 4 || toolingProof.replayCommandRuns < 1) {
    throw new Error(`Content Workbench did not render the canonical Level 8 projections: ${JSON.stringify(toolingProof)}`);
  }
  if (!rejectsUnknownField) throw new Error('Content Workbench accepted an unknown level field');
  if (toolingErrors.length > 0) throw new Error(`Content Workbench browser errors: ${toolingErrors.join('; ')}`);
  console.log(JSON.stringify({
    passed: true, ...result, campaignFlow, browserErrors: errors,
    fallback: { ...fallback, browserErrors: fallbackErrors },
    chapterLevel: { ...chapterLevel, browserErrors: chapterErrors },
    tooling: { ...toolingProof, rejectsUnknownField, browserErrors: toolingErrors },
  }, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
