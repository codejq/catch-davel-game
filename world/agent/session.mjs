// Launches Zama Sniper in a (headless) Chromium page and drives it through the in-game agent API,
// `window.zamaSniper`. Shared by the MCP server and the example Claude agent.
import { existsSync, createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const LIVE_URL = 'https://codejq.github.io/zama-sniper/';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.json': 'application/json', '.map': 'application/json', '.wasm': 'application/wasm',
};

/** Serves the built game (world/dist) on a free local port. */
function serveDist() {
  const root = resolve(DIST);
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname));
    let file = resolve(join(root, path));
    if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}

function findChrome() {
  return [process.env.CHROME_PATH, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']
    .filter(Boolean).find((candidate) => existsSync(candidate));
}

/**
 * Opens the game. `url` defaults to a local build in world/dist when there is one, else the published game.
 * Returns helpers that call the agent API inside the page.
 */
export async function openGame({ url, headed = false, width = 960, height = 540 } = {}) {
  let local = null;
  if (url === undefined) {
    if (existsSync(join(DIST, 'index.html'))) { local = await serveDist(); url = local.url; } else url = LIVE_URL;
  }
  const executablePath = findChrome();
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}), headless: !headed,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.zamaSniper !== undefined, undefined, { timeout: 60_000 });
  return {
    url,
    errors,
    help: () => page.evaluate(() => window.zamaSniper.help),
    observe: () => page.evaluate(() => window.zamaSniper.observe()),
    describe: () => page.evaluate(() => window.zamaSniper.describe()),
    act: (commands) => page.evaluate((list) => window.zamaSniper.act(list), commands),
    /** PNG of what the sniper sees, base64-encoded. */
    screenshot: async () => (await page.screenshot({ type: 'png', timeout: 120_000 })).toString('base64'),
    close: async () => { await browser.close(); local?.server.close(); },
  };
}
