// Draws the app icons (home screen, install prompt, store tiles) into public/icons.
// Usage: CHROME_PATH=/path/to/chromium node scripts/icons.mjs
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const executable = [process.env.CHROME_PATH, '/usr/bin/chromium', '/usr/bin/google-chrome', '/opt/pw-browsers/chromium'].filter(Boolean).find((path) => existsSync(path));
const out = fileURLToPath(new URL('../public/icons/', import.meta.url));
const browser = await chromium.launch({ executablePath: executable });
const page = await browser.newPage();
/** A sniper scope reticle over a dusk valley. `safe` shrinks the art into the middle for maskable icons. */
const svg = (safe) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#253a2c"/><stop offset=".62" stop-color="#6f8c55"/><stop offset=".62" stop-color="#2f4426"/><stop offset="1" stop-color="#16210f"/></linearGradient>
  <radialGradient id="vignette" cx=".5" cy=".5" r=".5"><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient></defs>
  <rect width="512" height="512" rx="${safe ? 0 : 96}" fill="#0e1511"/>
  <g transform="translate(256 256) scale(${safe ? 0.78 : 1}) translate(-256 -256)">
    <circle cx="256" cy="256" r="200" fill="url(#sky)"/>
    <path d="M56 300 L150 236 L214 276 L300 200 L380 262 L456 226 L456 330 L56 330Z" fill="#1d2d17" opacity=".9"/>
    <circle cx="256" cy="256" r="200" fill="url(#vignette)"/>
    <circle cx="256" cy="256" r="200" fill="none" stroke="#cfe3a0" stroke-width="18"/>
    <path d="M56 256H206M306 256H456M256 56V206M256 306V456" stroke="#0b0f0c" stroke-width="10"/>
    <path d="M86 256H206M306 256H426M256 86V206M256 306V426" stroke="#cfe3a0" stroke-width="5"/>
    <circle cx="256" cy="256" r="7" fill="#ff5a4a"/>
  </g></svg>`;
for (const [name, size, safe] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['maskable-512.png', 512, true], ['apple-touch-icon.png', 180, true]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(safe).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  writeFileSync(`${out}${name}`, await page.screenshot({ omitBackground: !safe, clip: { x: 0, y: 0, width: size, height: size } }));
  console.log(name);
}
await browser.close();
