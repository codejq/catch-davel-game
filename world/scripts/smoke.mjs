// Browser smoke test for the open world. Drives the real game through its development hooks:
// snipes a robot, gets shot at in the open, takes a robot's carbine, shoots an innocent (and pays for it), destroys a tank,
// sprints with Shift + arrow, opens a door with Enter, plays with the arrow keys and Ctrl,
// finds the keycard, opens boxes and picks up what is inside,
// travels through every portal, plays with touch controls on an emulated phone, and fails on any browser error.
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
  // A fixed run seed keeps the randomized enemies, families, and loot the same from run to run.
  await page.goto(`${server.resolvedUrls.local[0]}?seed=${process.env.SMOKE_SEED ?? 'smoke'}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.zamaSniperWorld !== undefined);

  const combat = await page.evaluate(() => {
    const w = window.zamaSniperWorld;
    w.play();
    const robots = w.sentries().filter((sentry) => sentry.kind === 'robot');
    const shooter = robots[1];
    const targets = robots.slice(2, 6);
    // Just these robots take part; the rest of the force is parked out of the way.
    for (const sentry of w.sentries()) if (sentry !== shooter && !targets.includes(sentry)) { sentry.mode = 'dead'; sentry.deathTime = 9; sentry.position.x += 5000; }
    shooter.mode = 'dead';
    for (const tank of w.population().tanks) tank.position.x += 5000;
    const soldiers = w.sentries().filter((sentry) => sentry.kind === 'soldier').length;
    let spot = null;
    let target = targets[0];
    // Snipe from 50 m. A robot that dodges into cover after a miss is swapped for the next one.
    for (const candidate of targets) {
      if (targets.some((other) => other.mode === 'dead')) break;
      target = candidate;
      spot = null;
      for (let angle = 0; angle < Math.PI * 2 && spot === null; angle += 0.3) {
        const x = target.position.x + Math.cos(angle) * 50; const z = target.position.z + Math.sin(angle) * 50;
        w.teleport(x, z, 0, 0);
        const body = w.body();
        if (w.los({ x, y: body.position.y + 1.1, z }, { x: target.position.x, y: target.position.y + 1.9, z: target.position.z })) spot = { x, z };
      }
      if (spot === null) continue;
      w.refill();
      w.stance('crouch');
      w.setAim(1);
      w.step(0.6);
      for (let attempt = 0; attempt < 5 && target.mode !== 'dead'; attempt += 1) {
        const body = w.body();
        const dx = target.position.x - body.position.x; const dz = target.position.z - body.position.z;
        body.yaw = Math.atan2(dx, -dz);
        body.pitch = Math.atan2(target.position.y + 1.9 - (body.position.y + body.eyeHeight), Math.hypot(dx, dz));
        w.fire(); w.step(1.35);
      }
    }
    for (const other of targets) if (other !== target) { other.mode = 'dead'; other.deathTime = 9; other.position.x += 5000; }
    w.refill();
    const sniped = target.mode === 'dead';
    // Stand in the open 7 m from a live robot that has seen us: it must open fire.
    w.setAim(0); w.stance('stand');
    // Try spots round the robot until it sees all of us (foliage counts, not just walls), then let it shoot.
    const before = w.stats().health;
    let best = null;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.4) {
      const x = shooter.position.x + Math.cos(angle) * 7; const z = shooter.position.z + Math.sin(angle) * 7;
      w.teleport(x, z, 0, 0);
      shooter.mode = 'alert'; shooter.awareness = 1.1; shooter.lastKnown = { x: w.body().position.x, z: w.body().position.z }; shooter.sightCheckTimer = 0;
      shooter.heading = Math.atan2(x - shooter.position.x, z - shooter.position.z);
      w.step(0.05);
      if (best === null || shooter.exposure > best.exposure) best = { x, z, exposure: shooter.exposure };
      if (shooter.exposure > 0.8) break;
    }
    w.teleport(best.x, best.z, 0, 0);
    shooter.mode = 'alert'; shooter.awareness = 1.1; shooter.lastKnown = { x: w.body().position.x, z: w.body().position.z };
    // Health heals back after a few quiet seconds, so track the lowest it gets.
    let lowest = before;
    for (let tick = 0; tick < 40; tick += 1) { w.step(0.25); lowest = Math.min(lowest, w.stats().health); }
    return { spot: spot !== null, sniped, exposure: best.exposure, damageTaken: before - lowest, enemies: w.sentries().length, soldiers };
  });
  if (!combat.spot || !combat.sniped) throw new Error(`Sniping a robot failed: ${JSON.stringify(combat)}`);
  if (combat.enemies < 30 || combat.soldiers < 10) throw new Error(`Not enough enemies deployed: ${JSON.stringify(combat)}`);
  if (combat.damageTaken <= 0) throw new Error(`Robots never fired at an exposed player: ${JSON.stringify(combat)}`);

  await page.evaluate(() => {
    const w = window.zamaSniperWorld;
    w.load(0); w.play();
    const door = w.doors()[0].plan;
    const cx = door.hingeX + Math.cos(door.closedYaw) * door.width / 2; const cz = door.hingeZ - Math.sin(door.closedYaw) * door.width / 2;
    const x = cx + Math.sin(door.closedYaw) * 1.4; const z = cz + Math.cos(door.closedYaw) * 1.4;
    w.teleport(x, z, Math.atan2(cx - x, -(cz - z)), -0.1, door.hingeY + 0.3);
    w.step(0.1);
  });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const door = await page.evaluate(() => { window.zamaSniperWorld.step(1); return window.zamaSniperWorld.doors()[0]; });
  if (!door.open || door.blocking) throw new Error(`Door did not open with Enter: ${JSON.stringify(door)}`);

  // Robot carbine, civilians, dogs, and tanks.
  const extras = await page.evaluate(() => {
    const w = window.zamaSniperWorld;
    w.load(0); w.play(); w.step(0.3);
    const aimAt = (point) => { const b = w.body(); b.yaw = Math.atan2(point.x - b.position.x, -(point.z - b.position.z)); b.pitch = Math.atan2(point.y - (b.position.y + b.eyeHeight), Math.hypot(point.x - b.position.x, point.z - b.position.z)); };
    const standNear = (target, distance, height) => {
      for (let angle = 0; angle < 6.28; angle += 0.25) {
        const x = target.x + Math.cos(angle) * distance; const z = target.z + Math.sin(angle) * distance;
        w.teleport(x, z, 0, 0);
        const body = w.body();
        if (w.los({ x, y: body.position.y + 1.6, z }, { x: target.x, y: target.y + height, z: target.z })) return true;
      }
      return false;
    };
    const population = w.population();
    const counts = { people: population.civilians.filter((c) => c.kind !== 'dog').length, dogs: population.civilians.filter((c) => c.kind === 'dog').length, tanks: population.tanks.length };
    // Destroy a robot and walk up to it: its carbine and armor are taken. The rest of the (large) force, and the
    // tanks until their turn comes, are parked out of the way so these checks are not cut short by the player dying.
    const tanksHome = population.tanks.map((tank) => ({ tank, x: tank.position.x, y: tank.position.y, z: tank.position.z, heading: tank.heading, waypoint: tank.waypoint }));
    for (const tank of population.tanks) tank.position.x += 5000;
    const candidates = w.sentries().filter((sentry) => sentry.kind === 'robot').slice(2, 8);
    for (const sentry of w.sentries()) if (!candidates.includes(sentry)) { sentry.mode = 'dead'; sentry.deathTime = 9; sentry.position.x += 5000; }
    for (const robot of candidates) {
      if (candidates.some((candidate) => candidate.mode === 'dead' && candidate.position.x < 4000)) { robot.mode = 'dead'; robot.deathTime = 9; robot.position.x += 5000; continue; }
      if (!standNear(robot.position, 30, 2.4)) continue;
      w.refill();
      w.setAim(1); w.step(0.5);
      for (let attempt = 0; attempt < 3 && robot.mode !== 'dead'; attempt += 1) {
        const eye = { ...w.body().position, y: w.body().position.y + 1.6 };
        if (!w.los(eye, { x: robot.position.x, y: robot.position.y + 2.4, z: robot.position.z })) standNear(robot.position, 30, 2.4);
        aimAt({ x: robot.position.x, y: robot.position.y + 2.4, z: robot.position.z }); w.fire(); w.step(1.5);
      }
      w.setAim(0);
    }
    w.setAim(0);
    const drop = w.pickups().find((pickup) => pickup.kind === 'carbine');
    if (drop) { w.teleport(drop.position.x + 1.2, drop.position.z, 0, 0); w.step(0.5); }
    if (drop && !w.loadout().carbine.owned) { w.teleport(drop.position.x, drop.position.z, 0, 0); w.step(0.5); }
    const robotsDown = candidates.filter((robot) => robot.mode === 'dead' && robot.position.x < 4000).length;
    const took = w.loadout();
    // Shooting an innocent costs 5% health.
    for (const sentry of w.sentries()) { sentry.mode = 'dead'; sentry.deathTime = 9; }
    w.step(20);
    // Find a civilian with a clear line of fire: the view line must meet an innocent before any wall.
    const onInnocent = () => {
      const body = w.body();
      const eye = { x: body.position.x, y: body.position.y + body.eyeHeight, z: body.position.z };
      const direction = { x: Math.sin(body.yaw) * Math.cos(body.pitch), y: Math.sin(body.pitch), z: -Math.cos(body.yaw) * Math.cos(body.pitch) };
      let best = null;
      for (const target of population.targets()) {
        const distance = target.hit(eye, direction);
        if (distance !== null && (best === null || distance < best.distance)) best = { target, distance };
      }
      if (best === null || best.target.kind === 'tank') return false;
      const point = { x: eye.x + direction.x * best.distance, y: eye.y + direction.y * best.distance, z: eye.z + direction.z * best.distance };
      return w.los(eye, point);
    };
    const before = w.stats().health;
    let lined = false;
    for (const person of population.civilians.filter((c) => c.kind !== 'dog' && c.mode !== 'dead')) {
      const height = person.activity === 'eat' ? 0.9 : person.kind === 'child' ? 0.8 : 1.2;
      if (!standNear(person.position, 10, height)) continue;
      w.setAim(1);
      w.step(0.4);
      aimAt({ x: person.position.x, y: person.position.y + height, z: person.position.z });
      if (onInnocent()) {
        lined = true; w.fire(); w.step(1); w.setAim(0);
        if (population.civilians.some((c) => c.mode === 'dead')) break;
        w.step(1.5);
        continue;
      }
      w.setAim(0);
    }
    const person = population.civilians.find((c) => c.mode === 'dead') ?? population.civilians[0];
    // The round may strike another family member standing in the line of fire; any innocent counts.
    const innocent = { lined, dead: population.civilians.some((c) => c.mode === 'dead'), healthDrop: before - w.stats().health, shot: w.innocents().shot,
      // Everyone alive within 30 m panics (a lone civilian may have no one nearby).
      ...(() => {
        const near = population.civilians.filter((c) => c !== person && c.mode !== 'dead' && Math.hypot(c.position.x - person.position.x, c.position.z - person.position.z) < 30);
        return { bystanders: near.length, panicked: near.filter((c) => c.mode !== 'calm').length };
      })() };
    // A tank shells the player at close range and four rifle hits destroy it.
    // Bring back a tank the crew of which can see the sniper from 22 m (foliage counts); one boxed in by trees
    // and houses is parked again and the next one tried.
    let tank = population.tanks[0];
    for (const home of tanksHome) {
      tank = home.tank;
      tank.position.x = home.x; tank.position.y = home.y; tank.position.z = home.z; tank.heading = home.heading; tank.turret = home.heading; tank.waypoint = home.waypoint;
      let seen = false;
      for (let angle = 0; angle < Math.PI * 2 && !seen; angle += 0.3) {
        const x = tank.position.x + Math.cos(angle) * 22; const z = tank.position.z + Math.sin(angle) * 22;
        w.teleport(x, z, 0, 0);
        tank.sightTimer = 0;
        w.step(0.05);
        seen = tank.canSeePlayer;
      }
      if (seen) break;
      tank.position.x += 5000;
    }
    w.refill();
    tank.awareness = 1.1; tank.lastKnown = { x: w.body().position.x, z: w.body().position.z };
    for (let wait = 0; wait < 30 && tank.sinceShot > 50; wait += 1) w.step(0.5);
    const shelled = tank.sinceShot < 50;
    for (let shot = 0; shot < 8 && tank.mode !== 'dead'; shot += 1) {
      if (w.loadout().reserve === 0 && w.loadout().capacity === 0) break;
      // Keep a clear line to the turret (the tank may have crept behind a crest or a wall).
      const eye = { ...w.body().position, y: w.body().position.y + 1.6 };
      if (!w.los(eye, { x: tank.position.x, y: tank.position.y + 1.9, z: tank.position.z })) standNear(tank.position, 22, 1.9);
      aimAt({ x: tank.position.x, y: tank.position.y + 1.9, z: tank.position.z }); w.fire(); w.step(1.3);
      if (w.stats().health <= 20) w.body();
      w.step(0.1);
      // Reload when the magazine runs dry.
      w.fire(); w.step(3.2);
    }
    return { counts, robotsDown, dropped: drop !== undefined, took: { armor: took.armor, carbine: took.carbine }, innocent, shelled, tank: tank.mode };
  });
  if (extras.counts.people < 6 || extras.counts.dogs < 1 || extras.counts.tanks < 4) throw new Error(`World population missing: ${JSON.stringify(extras)}`);
  if (!extras.took.carbine.owned || extras.took.armor < 25) throw new Error(`Robot carbine was not taken: ${JSON.stringify(extras)}`);
  if (!extras.innocent.dead || extras.innocent.healthDrop < 5 || extras.innocent.shot !== 1 || (extras.innocent.bystanders > 0 && extras.innocent.panicked < 1)) throw new Error(`Innocent penalty failed: ${JSON.stringify(extras)}`);
  if (!extras.shelled || extras.tank !== 'dead') throw new Error(`Tank fight failed: ${JSON.stringify(extras)}`);
  // Switch to the carbine with 2 and hold Ctrl for automatic fire; Right Shift + up arrow sprints.
  // (Health takes a minute to come back on its own, so patch up after the tank fight first.)
  await page.evaluate(() => { window.zamaSniperWorld.refill(); window.zamaSniperWorld.step(1); });
  await page.keyboard.down('Digit2');
  await page.evaluate(() => window.zamaSniperWorld.step(0.05));
  await page.keyboard.up('Digit2');
  await page.evaluate(() => window.zamaSniperWorld.step(0.6));
  const carbineBefore = await page.evaluate(() => window.zamaSniperWorld.loadout().carbine.magazine);
  await page.keyboard.down('ControlRight');
  await page.evaluate(() => window.zamaSniperWorld.step(0.6));
  await page.keyboard.up('ControlRight');
  const carbineFire = await page.evaluate(() => window.zamaSniperWorld.loadout());
  await page.keyboard.down('Digit1');
  await page.evaluate(() => window.zamaSniperWorld.step(0.05));
  await page.keyboard.up('Digit1');
  if (carbineFire.weapon !== 'carbine' || carbineBefore - carbineFire.carbine.magazine < 3) throw new Error(`Carbine did not fire automatically: ${carbineBefore} -> ${JSON.stringify(carbineFire)}`);
  const sprintStart = await page.evaluate(() => { const w = window.zamaSniperWorld; const s = w.layout().spawn; w.teleport(s.x, s.z, s.yaw, 0); w.step(0.6); return { ...w.body().position }; });
  await page.keyboard.down('ShiftRight');
  await page.keyboard.down('ArrowUp');
  await page.evaluate(() => window.zamaSniperWorld.step(1));
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('ShiftRight');
  const sprintEnd = await page.evaluate(() => ({ ...window.zamaSniperWorld.body().position, scope: document.querySelector('#scope').style.opacity }));
  const sprinted = Math.hypot(sprintEnd.x - sprintStart.x, sprintEnd.z - sprintStart.z);
  if (sprinted < 6 || sprintEnd.scope === '1') throw new Error(`Shift + arrow sprint failed: ${sprinted.toFixed(1)} m, scope ${sprintEnd.scope}`);
  await page.evaluate(() => window.zamaSniperWorld.step(1));

  // Right-hand keyboard layout: arrows move and turn, Ctrl fires, Right Shift scopes.
  await page.evaluate(() => { const w = window.zamaSniperWorld; w.load(0); w.play(); const s = w.layout().spawn; w.teleport(s.x, s.z, s.yaw, 0); });
  const start = await page.evaluate(() => ({ ...window.zamaSniperWorld.body().position, yaw: window.zamaSniperWorld.body().yaw }));
  await page.keyboard.down('ArrowUp');
  await page.evaluate(() => window.zamaSniperWorld.step(1));
  const clearWhileMoving = await page.evaluate(() => document.querySelector('#hud').classList.contains('clear-view'));
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowLeft');
  await page.evaluate(() => window.zamaSniperWorld.step(0.5));
  await page.keyboard.up('ArrowLeft');
  const moved = await page.evaluate(() => ({ ...window.zamaSniperWorld.body().position, yaw: window.zamaSniperWorld.body().yaw }));
  await page.evaluate(() => window.zamaSniperWorld.step(1));
  const infoWhenStill = !(await page.evaluate(() => document.querySelector('#hud').classList.contains('clear-view')));
  await page.keyboard.press('ShiftRight');
  await page.evaluate(() => window.zamaSniperWorld.step(0.6));
  const scoped = await page.evaluate(() => document.querySelector('#scope').style.opacity === '1');
  const shotsBefore = await page.evaluate(() => window.zamaSniperWorld.stats().shots);
  await page.keyboard.down('ControlRight');
  await page.evaluate(() => window.zamaSniperWorld.step(0.1));
  await page.keyboard.up('ControlRight');
  const shotsAfter = await page.evaluate(() => window.zamaSniperWorld.stats().shots);
  const keyboard = {
    walked: Math.hypot(moved.x - start.x, moved.z - start.z), turned: start.yaw - moved.yaw, scoped, fired: shotsAfter - shotsBefore, clearWhileMoving, infoWhenStill,
  };
  if (keyboard.walked < 2 || keyboard.turned < 0.5 || !keyboard.scoped || keyboard.fired !== 1 || !keyboard.clearWhileMoving || !keyboard.infoWhenStill) {
    throw new Error(`Keyboard controls failed: ${JSON.stringify(keyboard)}`);
  }

  const journey = await page.evaluate(() => {
    const w = window.zamaSniperWorld;
    const worlds = [];
    for (let index = 0; index < 3; index += 1) {
      w.searchAll();
      w.step(0.8);
      const pickups = w.pickups().length;
      const before = w.stats().loot;
      w.collectAll();
      worlds.push({ world: w.stats().world, keycard: w.stats().keycard, pickups, collected: w.stats().loot - before });
      w.travel();
    }
    return { worlds, phase: w.stats().phase };
  });
  if (!journey.worlds.every((entry, index) => entry.world === index && entry.keycard && entry.pickups > 0 && entry.collected === entry.pickups) || journey.phase !== 'victory') {
    throw new Error(`World-to-world journey failed: ${JSON.stringify(journey)}`);
  }
  // Phones: touch controls appear, the stick walks, drag looks, FIRE shoots, and the pause button opens the menu.
  const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' });
  const mobile = await phone.newPage();
  mobile.on('pageerror', (error) => errors.push(`mobile: ${error.message}`));
  await mobile.goto(`${server.resolvedUrls.local[0]}?seed=${process.env.SMOKE_SEED ?? 'smoke'}`, { waitUntil: 'load' });
  await mobile.waitForFunction(() => window.zamaSniperWorld !== undefined);
  const touch = await mobile.evaluate(async () => {
    const w = window.zamaSniperWorld;
    const label = document.querySelector('#play').textContent;
    document.querySelector('#play').click();
    w.step(0.3);
    const fire = (element, type, x, y) => element.dispatchEvent(new PointerEvent(type, { pointerId: 3, bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch' }));
    const centre = (element) => { const r = element.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    // The controls appear with the next drawn frame.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const shown = getComputedStyle(document.querySelector('#touch')).display !== 'none';
    const stick = document.querySelector('#touch-stick'); const c = centre(stick);
    const start = { ...w.body().position }; const yaw = w.body().yaw;
    fire(stick, 'pointerdown', c.x, c.y); fire(stick, 'pointermove', c.x, c.y - 45);
    w.step(1);
    fire(stick, 'pointerup', c.x, c.y - 45);
    const walked = Math.hypot(w.body().position.x - start.x, w.body().position.z - start.z);
    const look = document.querySelector('#touch-look');
    fire(look, 'pointerdown', 600, 150); fire(look, 'pointermove', 660, 150); fire(look, 'pointerup', 660, 150);
    w.step(0.1);
    const shots = w.stats().shots;
    const trigger = document.querySelector('.tb.fire'); const t = centre(trigger);
    fire(trigger, 'pointerdown', t.x, t.y); w.step(0.1); fire(trigger, 'pointerup', t.x, t.y);
    w.step(0.2);
    const pause = document.querySelector('.tb.pause'); const p = centre(pause);
    fire(pause, 'pointerdown', p.x, p.y); fire(pause, 'pointerup', p.x, p.y);
    return { label, shown, walked, turned: w.body().yaw - yaw, fired: w.stats().shots - shots, paused: !document.querySelector('#menu').hidden, resume: document.querySelector('#play').textContent };
  });
  await phone.close();
  if (touch.label !== 'TAP TO PLAY' || !touch.shown || touch.walked < 1 || Math.abs(touch.turned) < 0.01 || touch.fired !== 1 || !touch.paused || touch.resume !== 'TAP TO RESUME') {
    throw new Error(`Touch controls failed: ${JSON.stringify(touch)}`);
  }
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({ combat, door: { open: door.open }, keyboard, journey, touch }, null, 2));
  console.log('Open-world smoke test passed');
} finally {
  await browser.close();
  await server.close();
}
