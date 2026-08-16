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

async function readBrowserProfile(page) {
  return page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('quantum-catch-davel', 1);
      request.addEventListener('success', () => resolve(request.result), { once: true });
      request.addEventListener('error', () => reject(request.error), { once: true });
    });
    const read = (key) => new Promise((resolve, reject) => {
      const request = database.transaction('profile-records', 'readonly').objectStore('profile-records').get(key);
      request.addEventListener('success', () => resolve(request.result ?? null), { once: true });
      request.addEventListener('error', () => reject(request.error), { once: true });
    });
    try {
      const pointer = JSON.parse(await read('profile:default:active'));
      const envelope = JSON.parse(await read(`profile:default:${pointer.slot}`));
      return { revision: pointer.revision, profile: JSON.parse(envelope.serializedProfile) };
    } finally {
      database.close();
    }
  });
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
    profileStorage: document.body.dataset.profileStorage,
    campaignCards: document.querySelectorAll('#campaign-levels .level-card').length,
    campaignUnlockedCards: document.querySelectorAll('#campaign-levels .level-card:not(:disabled)').length,
    campaignButtonVisible: !document.querySelector('#campaign-button')?.hidden,
  }), startTick);
  if (result.agentApiExposed) throw new Error('Default production build exposed the mutation-capable agent API');
  if (result.profileStorage !== 'indexeddb') throw new Error('Ordinary web build did not select IndexedDB profile storage');
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
  await page.click('#campaign-button');
  await page.evaluate(() => {
    document.querySelector('#settings-panel').open = true;
    document.querySelector('#setting-language').value = 'ar';
    document.querySelector('#setting-sensitivity').value = '1.4';
    document.querySelector('#setting-master').value = '0.8';
    document.querySelector('#setting-music').value = '0.6';
    document.querySelector('#setting-effects').value = '0.7';
    document.querySelector('#setting-reduced-motion').checked = true;
    document.querySelector('#setting-high-contrast').checked = true;
    document.querySelector('#settings-panel').dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => document.documentElement.dir === 'rtl'
    && document.body.classList.contains('reduced-motion')
    && document.body.classList.contains('high-contrast'));
  await page.waitForTimeout(150);
  const settingsProfile = await readBrowserProfile(page);
  const accessibilitySettings = await page.evaluate(() => ({
    language: document.documentElement.lang,
    direction: document.documentElement.dir,
    levelName: document.querySelector('#level-name')?.textContent ?? '',
    objective: document.querySelector('#objective')?.textContent ?? '',
    status: document.querySelector('#settings-status')?.textContent ?? '',
    reducedMotion: document.body.classList.contains('reduced-motion'),
    highContrast: document.body.classList.contains('high-contrast'),
  }));
  if (settingsProfile.profile.settings.language !== 'ar'
    || settingsProfile.profile.settings.mouseSensitivity !== 1.4
    || settingsProfile.profile.settings.masterVolume !== 0.8
    || settingsProfile.profile.settings.musicVolume !== 0.6
    || settingsProfile.profile.settings.effectsVolume !== 0.7
    || !settingsProfile.profile.settings.reducedMotion || !settingsProfile.profile.settings.highContrast
    || accessibilitySettings.language !== 'ar' || accessibilitySettings.direction !== 'rtl'
    || !accessibilitySettings.levelName.includes('التمايل الأول')
    || !accessibilitySettings.objective.includes('عطّل جميع روبوتات دافل الراقصة')) {
    throw new Error(`Production accessibility settings did not apply and persist: ${JSON.stringify({ settingsProfile, accessibilitySettings })}`);
  }
  const downloadPromise = page.waitForEvent('download');
  await page.click('#profile-export');
  const download = await downloadPromise;
  const downloadStream = await download.createReadStream();
  const downloadChunks = [];
  for await (const chunk of downloadStream) downloadChunks.push(chunk);
  const exportedProfileText = Buffer.concat(downloadChunks).toString('utf8');
  const exportedProfile = JSON.parse(exportedProfileText);
  const exportStatus = await page.locator('#profile-transfer-status').textContent();
  if (download.suggestedFilename() !== 'catch-davel-profile-v1.json'
    || exportedProfile.profileSchemaVersion !== 1
    || !/^[0-9a-f]{16}$/.test(exportedProfile.integrityChecksum)
    || exportStatus !== 'Profile exported.') {
    throw new Error('Browser profile export did not produce the validated v1 JSON transfer');
  }
  const chooserPromise = page.waitForEvent('filechooser');
  await page.click('#profile-import');
  const chooser = await chooserPromise;
  const dialogPromise = page.waitForEvent('dialog');
  await chooser.setFiles({
    name: 'catch-davel-profile-v1.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportedProfileText),
  });
  const dialog = await dialogPromise;
  const navigationPromise = page.waitForNavigation({ waitUntil: 'load' });
  await dialog.accept();
  await navigationPromise;
  await page.waitForFunction(() => document.body.dataset.profileReady === 'true'
    && document.body.dataset.workerStatus === 'ready');
  const profileTransfer = {
    filename: download.suggestedFilename(),
    schemaVersion: exportedProfile.profileSchemaVersion,
    checksum: exportedProfile.integrityChecksum,
    exportStatus,
    importedAndReloaded: true,
  };
  const beforeLifecycle = await readBrowserProfile(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    window.__catchDavelTestVisibility = 'hidden';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => window.__catchDavelTestVisibility,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => document.body.dataset.suspended === 'true');
  await page.waitForTimeout(100);
  const suspendedStartTick = await page.evaluate(() => Number(document.body.dataset.snapshotTick));
  await page.waitForTimeout(250);
  const suspendedEndTick = await page.evaluate(() => Number(document.body.dataset.snapshotTick));
  const suspendedProfile = await readBrowserProfile(page);
  await page.evaluate(() => {
    window.__catchDavelTestVisibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction((tick) => document.body.dataset.suspended === 'false'
    && Number(document.body.dataset.snapshotTick) > tick, suspendedEndTick);
  await page.keyboard.up('KeyW');
  const resumedAfterVisibilityTick = await page.evaluate(() => Number(document.body.dataset.snapshotTick));
  await page.waitForTimeout(100);
  const resumedProfile = await readBrowserProfile(page);
  await page.evaluate(() => {
    window.__catchDavelTestVisibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => document.body.dataset.suspended === 'true');
  await page.waitForTimeout(100);
  const restartPointProfile = await readBrowserProfile(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.profileReady === 'true'
    && document.body.dataset.workerStatus === 'ready');
  const restartedProfile = await readBrowserProfile(page);
  const lifecycle = {
    beforeRevision: beforeLifecycle.revision,
    suspendedRevision: suspendedProfile.revision,
    resumedRevision: resumedProfile.revision,
    restartPointRevision: restartPointProfile.revision,
    restartedRevision: restartedProfile.revision,
    suspendedStartTick,
    suspendedEndTick,
    resumedAfterVisibilityTick,
    attemptsBefore: beforeLifecycle.profile.levelProgress[0].attempts,
    attemptsAfter: restartedProfile.profile.levelProgress[0].attempts,
    coinsBefore: beforeLifecycle.profile.totalCoins,
    coinsAfter: restartedProfile.profile.totalCoins,
    suspendedClean: suspendedProfile.profile.lastCleanShutdown,
    resumedActive: !resumedProfile.profile.lastCleanShutdown,
    restartPointClean: restartPointProfile.profile.lastCleanShutdown,
    lastCleanShutdown: restartedProfile.profile.lastCleanShutdown,
  };
  if (suspendedStartTick !== suspendedEndTick || resumedAfterVisibilityTick <= suspendedEndTick
    || lifecycle.attemptsAfter !== lifecycle.attemptsBefore + 1
    || lifecycle.coinsAfter !== lifecycle.coinsBefore || !lifecycle.lastCleanShutdown
    || !lifecycle.suspendedClean || !lifecycle.resumedActive || !lifecycle.restartPointClean
    || lifecycle.suspendedRevision <= lifecycle.beforeRevision
    || lifecycle.resumedRevision <= lifecycle.suspendedRevision
    || lifecycle.restartPointRevision <= lifecycle.resumedRevision
    || lifecycle.restartedRevision < lifecycle.restartPointRevision) {
    throw new Error(`Production lifecycle did not suspend, persist, resume, and restart cleanly: ${JSON.stringify(lifecycle)}`);
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

  const mobilePage = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const mobileErrors = [];
  mobilePage.on('pageerror', (error) => mobileErrors.push(error.message));
  mobilePage.on('console', (message) => { if (message.type() === 'error') mobileErrors.push(message.text()); });
  await mobilePage.goto(`${url}?renderer=main`, { waitUntil: 'load' });
  await mobilePage.waitForFunction(() => (
    document.body.dataset.workerStatus === 'ready'
    && Number(document.body.dataset.snapshotTick) > 0
  ));
  const mobileBeforeTap = await mobilePage.evaluate(() => {
    const controls = document.querySelector('#touch-controls');
    const pad = document.querySelector('#move-pad')?.getBoundingClientRect();
    return {
      controlsVisible: controls !== null && getComputedStyle(controls).display !== 'none',
      actionButtons: controls?.querySelectorAll('button').length ?? 0,
      padWidth: pad?.width ?? 0,
      touchPromptVisible: getComputedStyle(document.querySelector('.touch-prompt')).display !== 'none',
      desktopPromptVisible: getComputedStyle(document.querySelector('.desktop-prompt')).display !== 'none',
      profileStorage: document.body.dataset.profileStorage,
      agentApiExposed: window.CatchDavelAgent !== undefined,
    };
  });
  await mobilePage.touchscreen.tap(803, 334);
  await mobilePage.waitForFunction(() => document.body.classList.contains('touch-active'));
  const mobile = {
    ...mobileBeforeTap,
    touchSessionStarted: await mobilePage.evaluate(() => document.body.classList.contains('touch-active')),
  };
  if (!mobile.controlsVisible || mobile.actionButtons !== 3 || mobile.padWidth < 120
    || !mobile.touchPromptVisible || mobile.desktopPromptVisible || !mobile.touchSessionStarted) {
    throw new Error(`Production mobile controls did not expose the expected touch layout: ${JSON.stringify(mobile)}`);
  }
  if (mobile.profileStorage !== 'indexeddb') throw new Error('Mobile web build did not select IndexedDB profile storage');
  if (mobile.agentApiExposed) throw new Error('Mobile production page exposed the mutation-capable agent API');
  if (mobileErrors.length > 0) throw new Error(`Mobile browser errors: ${mobileErrors.join('; ')}`);

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
    balanceRows: document.querySelectorAll('#balance-table tbody tr').length,
    balanceSummary: document.querySelector('#balance-summary')?.textContent ?? '',
    submissionSummary: document.querySelector('.summary')?.textContent ?? '',
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
    || toolingProof.replayChecksums !== 4 || toolingProof.replayCommandRuns < 1 || toolingProof.balanceRows !== 10
    || !toolingProof.balanceSummary.includes('Guaranteed 283 coins')
    || !toolingProof.balanceSummary.includes('full upgrade catalog 156')
    || !toolingProof.submissionSummary.includes('3 keys complete in en / ar')
    || !toolingProof.submissionSummary.includes('10 referenced presentation assets resolved')) {
    throw new Error(`Content Workbench did not render the canonical Level 8 projections: ${JSON.stringify(toolingProof)}`);
  }
  if (!rejectsUnknownField) throw new Error('Content Workbench accepted an unknown level field');
  if (toolingErrors.length > 0) throw new Error(`Content Workbench browser errors: ${toolingErrors.join('; ')}`);
  console.log(JSON.stringify({
    passed: true, ...result, campaignFlow, accessibilitySettings, profileTransfer, lifecycle, browserErrors: errors,
    fallback: { ...fallback, browserErrors: fallbackErrors },
    chapterLevel: { ...chapterLevel, browserErrors: chapterErrors },
    mobile: { ...mobile, browserErrors: mobileErrors },
    tooling: { ...toolingProof, rejectsUnknownField, browserErrors: toolingErrors },
  }, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
