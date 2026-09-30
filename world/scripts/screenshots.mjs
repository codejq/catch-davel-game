// Regenerates the README screenshots in docs/screenshots from the real game (dev server + debug hooks).
// Usage: CHROME_PATH=/path/to/chromium node scripts/screenshots.mjs
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const executable = [process.env.CHROME_PATH, '/usr/bin/chromium', '/usr/bin/google-chrome', '/opt/pw-browsers/chromium'].filter(Boolean).find((path) => existsSync(path));
const root = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
mkdirSync(out, { recursive: true });
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: executable, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (error) => console.error(error.message));
await page.goto(server.resolvedUrls.local[0]);
await page.waitForFunction(() => window.zamaSniperWorld !== undefined);
// The animated people load in the background; shoot once they are in.
await page.waitForFunction(() => window.zamaSniperWorld.humans(), null, { timeout: 120000 });

async function shot(name, setup, carbine = false) {
  await page.evaluate(setup);
  if (carbine) {
    await page.evaluate(() => window.zamaSniperWorld.giveCarbine());
    await page.keyboard.press('Digit2');
    await page.evaluate(() => window.zamaSniperWorld.step(0.8));
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}${name}.jpg`, type: 'jpeg', quality: 82, timeout: 180000 });
  console.log(`${name}.jpg`);
}

// Helpers installed in the page.
await page.evaluate(() => {
  const w = window.zamaSniperWorld;
  window.shots = {
    world: (index) => { w.load(index); w.play(); w.setAim(0); w.stance('stand'); w.step(0.2); },
    /** Parks robots out of the way for scenery shots. */
    clear: () => { for (const s of w.sentries()) { s.mode = 'dead'; s.deathTime = 9; s.position.x += 5000; } },
    /** Stands `distance` m from a point on a clear sight line and looks at it. */
    viewOf: (target, distance, height = 1.6, lift = 0, startAngle = 0) => {
      for (let step = 0; step < 40; step += 1) {
        const angle = startAngle + step * 0.31;
        const x = target.x + Math.cos(angle) * distance; const z = target.z + Math.sin(angle) * distance;
        w.teleport(x, z, 0, 0);
        const body = w.body();
        if (w.los({ x, y: body.position.y + 1.6, z }, { x: target.x, y: target.y + height, z: target.z })) break;
      }
      const body = w.body();
      body.yaw = Math.atan2(target.x - body.position.x, -(target.z - body.position.z));
      body.pitch = Math.atan2(target.y + height - (body.position.y + body.eyeHeight), Math.hypot(target.x - body.position.x, target.z - body.position.z)) + lift;
    },
  };
});

await shot('village', () => {
  const w = window.zamaSniperWorld; window.shots.world(0); window.shots.clear();
  const layout = w.layout(); const b = layout.buildings[5].plan;
  window.shots.viewOf({ x: b.x, y: b.baseY, z: b.z }, 30, 3, 0.02, 0.8);
  w.step(1.2);
});

await shot('robots-flanking', () => {
  const w = window.zamaSniperWorld; window.shots.world(0);
  const [a, b] = w.sentries().filter((s) => s.kind === 'robot').slice(3, 5);
  window.shots.viewOf(a.position, 22, 2.2, 0.02, 1.2);
  const body = w.body();
  b.position.x = a.position.x + 5; b.position.z = a.position.z + 3;
  for (const robot of [a, b]) { robot.mode = 'alert'; robot.awareness = 1.1; robot.lastKnown = { x: body.position.x, z: body.position.z }; }
  w.step(2.5);
  body.yaw = Math.atan2(a.position.x - body.position.x, -(a.position.z - body.position.z));
  body.pitch = Math.atan2(a.position.y + 2 - (body.position.y + body.eyeHeight), Math.hypot(a.position.x - body.position.x, a.position.z - body.position.z));
  w.step(1 / 60);
});

await shot('soldiers', () => {
  const w = window.zamaSniperWorld; window.shots.world(0);
  // A squad of human soldiers on patrol: life-size and quicker than the robots.
  const squad = w.sentries().filter((s) => s.kind === 'soldier');
  const lead = squad[0];
  for (const s of w.sentries()) if (!squad.slice(0, 3).includes(s)) { s.mode = 'dead'; s.deathTime = 9; s.position.x += 5000; }
  // Walk them across the village square, in the open.
  const b = w.layout().buildings[5].plan;
  const square = { x: b.x + Math.cos(0.8) * 16, z: b.z + Math.sin(0.8) * 16 };
  squad.slice(0, 3).forEach((mate, index) => {
    mate.position.x = square.x + (index === 1 ? 1.8 : index === 2 ? -1.8 : 0); mate.position.z = square.z + index * 1.3;
    mate.waypoints.splice(0, mate.waypoints.length, { x: mate.position.x + 30, z: mate.position.z }, { x: mate.position.x - 30, z: mate.position.z });
    mate.waypoint = 0; mate.heading = Math.PI / 2;
  });
  w.step(0.5);
  window.shots.viewOf(lead.position, 8, 1.1, 0, 5.3);
  w.stance('crouch');
  w.step(0.6);
  const body = w.body();
  body.yaw = Math.atan2(lead.position.x - body.position.x, -(lead.position.z - body.position.z));
  body.pitch = Math.atan2(lead.position.y + 1.1 - (body.position.y + body.eyeHeight), Math.hypot(lead.position.x - body.position.x, lead.position.z - body.position.z));
  w.step(1 / 60);
});

await shot('scope', () => {
  const w = window.zamaSniperWorld; window.shots.world(1);
  const robot = w.sentries().filter((s) => s.kind === 'robot')[2];
  window.shots.viewOf(robot.position, 85, 2.3, 0.004);
  w.setAim(1); w.step(0.8);
});

await shot('loot', () => {
  const w = window.zamaSniperWorld; window.shots.world(0); window.shots.clear();
  const crate = w.containers().find((c) => c.kind === 'crate' && !c.keycard);
  const fx = Math.sin(crate.yaw); const fz = Math.cos(crate.yaw);
  w.teleport(crate.x + fx * 2.4, crate.z + fz * 2.4, 0, 0, crate.y + 0.2);
  const body = w.body();
  body.yaw = Math.atan2(crate.x - body.position.x, -(crate.z - body.position.z));
  body.pitch = -0.22;
  w.searchAll(); w.step(1.2);
});

await shot('frost-pass', () => {
  const w = window.zamaSniperWorld; window.shots.world(2); window.shots.clear();
  const layout = w.layout(); const b = layout.buildings[1].plan;
  window.shots.viewOf({ x: b.x, y: b.baseY, z: b.z }, 34, 3, 0.05, 4);
  w.step(1.2);
});

await shot('family-picnic', () => {
  const w = window.zamaSniperWorld; window.shots.world(0); window.shots.clear();
  const population = w.population();
  const diner = population.civilians.filter((c) => c.activity === 'eat' && c.seat !== null).sort((a, b) => b.family - a.family)[0];
  const seat = diner.seat;
  // Stand a few metres off the table, looking across it at the family.
  for (let step = 0; step < 40; step += 1) {
    const angle = step * 0.31;
    const x = seat.x + Math.cos(angle) * 5.5; const z = seat.z + Math.sin(angle) * 5.5;
    w.teleport(x, z, 0, 0);
    const body = w.body();
    if (w.los({ x, y: body.position.y + 1.6, z }, { x: seat.x, y: seat.y + 1, z: seat.z })) break;
  }
  const body = w.body();
  body.yaw = Math.atan2(seat.x - body.position.x, -(seat.z - body.position.z));
  body.pitch = -0.2;
  w.stance('crouch');
  w.step(2);
});

await shot('tank', () => {
  const w = window.zamaSniperWorld; window.shots.world(1); window.shots.clear();
  const tank = w.population().tanks[0];
  w.step(4);
  window.shots.viewOf(tank.position, 28, 1.5, 0.03, 1);
  w.step(0.1);
});

await shot('carbine', () => {
  const w = window.zamaSniperWorld; window.shots.world(0);
  // Take a carbine off a destroyed robot, then face the squad with it.
  const [fallen, target] = w.sentries().filter((s) => s.kind === 'robot').slice(3, 5);
  fallen.mode = 'dead'; fallen.deathTime = 9;
  w.population().civilians.forEach((c) => { c.position.x += 5000; });
  window.shots.viewOf(target.position, 16, 2, 0, 1);
  const me = { x: w.body().position.x, z: w.body().position.z };
  w.step(0.2);
  target.mode = 'alert'; target.awareness = 1.1; target.lastKnown = me;
  w.step(1);
  const body = w.body();
  body.yaw = Math.atan2(target.position.x - body.position.x, -(target.position.z - body.position.z));
  body.pitch = Math.atan2(target.position.y + 2 - (body.position.y + body.eyeHeight), Math.hypot(target.position.x - body.position.x, target.position.z - body.position.z));
  w.step(1 / 60);
}, true);

// A phone in landscape: touch controls over the game.
const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' });
const mobile = await phone.newPage();
await mobile.addInitScript(() => localStorage.setItem('zama-sniper-install', JSON.stringify({ state: 'never' })));
await mobile.goto(`${server.resolvedUrls.local[0]}?seed=phone`);
await mobile.waitForFunction(() => window.zamaSniperWorld !== undefined);
await mobile.evaluate(() => {
  const w = window.zamaSniperWorld;
  document.querySelector('#play').click();
  w.step(0.3);
  const robot = w.sentries().filter((s) => s.kind === 'robot')[3];
  for (let step = 0; step < 40; step += 1) {
    const angle = step * 0.31;
    const x = robot.position.x + Math.cos(angle) * 30; const z = robot.position.z + Math.sin(angle) * 30;
    w.teleport(x, z, 0, 0);
    const body = w.body();
    if (w.los({ x, y: body.position.y + 1.6, z }, { x: robot.position.x, y: robot.position.y + 2.5, z: robot.position.z })) break;
  }
  const body = w.body();
  body.yaw = Math.atan2(robot.position.x - body.position.x, -(robot.position.z - body.position.z));
  body.pitch = -0.02;
  w.step(0.5);
});
await mobile.waitForTimeout(2500);
await mobile.screenshot({ path: `${out}mobile.jpg`, type: 'jpeg', quality: 82, timeout: 180000 });
console.log('mobile.jpg');
await phone.close();

await browser.close();
await server.close();
