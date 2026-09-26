// Browser smoke test for the open world. Drives the real game through its development hooks:
// snipes a robot, gets shot at in the open, opens a door with Enter, plays with the arrow keys and Ctrl,
// finds the keycard,
// travels through every portal, and fails on any browser error.
// Usage: CHROME_PATH=/path/to/chromium node scripts/smoke.mjs
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const executable = [process.env.CHROME_PATH, '/usr/bin/chromium', '/usr/bin/google-chrome', '/opt/pw-browsers/chromium']
  .filter(Boolean).find((candidate) => existsSync(candidate));
if (!executable) throw new Error('Chrome/Chromium was not found; set CHROME_PATH');

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: executable, headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(server.resolvedUrls.local[0], { waitUntil: 'load' });
  await page.waitForFunction(() => window.catchDavelWorld !== undefined);

  const combat = await page.evaluate(() => {
    const w = window.catchDavelWorld;
    w.play();
    const target = w.sentries()[2];
    let spot = null;
    for (let angle = 0; angle < Math.PI * 2 && spot === null; angle += 0.3) {
      const x = target.position.x + Math.cos(angle) * 50; const z = target.position.z + Math.sin(angle) * 50;
      w.teleport(x, z, 0, 0);
      const body = w.body();
      if (w.los({ x, y: body.position.y + 1.1, z }, { x: target.position.x, y: target.position.y + 1.3, z: target.position.z })) spot = { x, z };
    }
    w.stance('crouch');
    w.setAim(1);
    w.step(0.6);
    for (let attempt = 0; attempt < 5 && target.mode !== 'dead'; attempt += 1) {
      const body = w.body();
      const dx = target.position.x - body.position.x; const dz = target.position.z - body.position.z;
      body.yaw = Math.atan2(dx, -dz);
      body.pitch = Math.atan2(target.position.y + 1.3 - (body.position.y + body.eyeHeight), Math.hypot(dx, dz));
      w.fire(); w.step(1.35);
    }
    const sniped = target.mode === 'dead';
    const other = w.sentries().find((sentry) => sentry.mode !== 'dead');
    w.setAim(0); w.stance('stand');
    w.teleport(other.position.x + 12, other.position.z, 0, 0);
    const before = w.stats().health;
    w.step(10);
    return { spot: spot !== null, sniped, damageTaken: before - w.stats().health };
  });
  if (!combat.spot || !combat.sniped) throw new Error(`Sniping a robot failed: ${JSON.stringify(combat)}`);
  if (combat.damageTaken <= 0) throw new Error(`Robots never fired at an exposed player: ${JSON.stringify(combat)}`);

  await page.evaluate(() => {
    const w = window.catchDavelWorld;
    w.load(0); w.play();
    const door = w.doors()[0].plan;
    const cx = door.hingeX + Math.cos(door.closedYaw) * door.width / 2; const cz = door.hingeZ - Math.sin(door.closedYaw) * door.width / 2;
    const x = cx + Math.sin(door.closedYaw) * 1.4; const z = cz + Math.cos(door.closedYaw) * 1.4;
    w.teleport(x, z, Math.atan2(cx - x, -(cz - z)), -0.1, door.hingeY + 0.3);
    w.step(0.1);
  });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const door = await page.evaluate(() => { window.catchDavelWorld.step(1); return window.catchDavelWorld.doors()[0]; });
  if (!door.open || door.blocking) throw new Error(`Door did not open with Enter: ${JSON.stringify(door)}`);

  // Right-hand keyboard layout: arrows move and turn, Ctrl fires, Right Shift scopes.
  await page.evaluate(() => { const w = window.catchDavelWorld; w.load(0); w.play(); const s = w.layout().spawn; w.teleport(s.x, s.z, s.yaw, 0); });
  const start = await page.evaluate(() => ({ ...window.catchDavelWorld.body().position, yaw: window.catchDavelWorld.body().yaw }));
  await page.keyboard.down('ArrowUp');
  await page.evaluate(() => window.catchDavelWorld.step(1));
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowLeft');
  await page.evaluate(() => window.catchDavelWorld.step(0.5));
  await page.keyboard.up('ArrowLeft');
  const moved = await page.evaluate(() => ({ ...window.catchDavelWorld.body().position, yaw: window.catchDavelWorld.body().yaw }));
  await page.keyboard.press('ShiftRight');
  await page.evaluate(() => window.catchDavelWorld.step(0.6));
  const scoped = await page.evaluate(() => document.querySelector('#scope').style.opacity === '1');
  const shotsBefore = await page.evaluate(() => window.catchDavelWorld.stats().shots);
  await page.keyboard.down('ControlRight');
  await page.evaluate(() => window.catchDavelWorld.step(0.1));
  await page.keyboard.up('ControlRight');
  const shotsAfter = await page.evaluate(() => window.catchDavelWorld.stats().shots);
  const keyboard = {
    walked: Math.hypot(moved.x - start.x, moved.z - start.z), turned: start.yaw - moved.yaw, scoped, fired: shotsAfter - shotsBefore,
  };
  if (keyboard.walked < 2 || keyboard.turned < 0.5 || !keyboard.scoped || keyboard.fired !== 1) {
    throw new Error(`Keyboard controls failed: ${JSON.stringify(keyboard)}`);
  }

  const journey = await page.evaluate(() => {
    const w = window.catchDavelWorld;
    const worlds = [];
    for (let index = 0; index < 3; index += 1) {
      w.searchAll();
      worlds.push({ world: w.stats().world, keycard: w.stats().keycard });
      w.travel();
    }
    return { worlds, phase: w.stats().phase };
  });
  if (!journey.worlds.every((entry, index) => entry.world === index && entry.keycard) || journey.phase !== 'victory') {
    throw new Error(`World-to-world journey failed: ${JSON.stringify(journey)}`);
  }
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({ combat, door: { open: door.open }, keyboard, journey }, null, 2));
  console.log('Open-world smoke test passed');
} finally {
  await browser.close();
  await server.close();
}
