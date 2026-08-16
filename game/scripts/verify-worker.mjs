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
    const [{ GameSimulation }, { stateChecksum }] = await Promise.all([
      import('/src/sim/game.ts'),
      import('/src/sim/serialization.ts'),
    ]);
    const direct = new GameSimulation(seed);
    for (let tick = 0; tick < 240; tick += 1) {
      direct.step({ forward: action.forward, strafe: action.strafe, yawDelta: action.turn, pitchDelta: action.look, fire: action.fire });
    }
    const directChecksum = stateChecksum(direct.state);
    const worker = new Worker(new URL('/src/workers/simulation.worker.ts', location.href), { type: 'module' });
    const channel = new MessageChannel();
    const eventChannel = new MessageChannel();
    const responses = [];
    const snapshots = [];
    worker.onmessage = (event) => responses.push(event.data);
    channel.port2.onmessage = (event) => snapshots.push(event.data);
    channel.port2.start();
    eventChannel.port2.onmessage = (event) => {
      const message = event.data;
      eventChannel.port2.postMessage({
        type: 'event-ack', generation: message.generation,
        highestContiguousBatchSequence: message.batchSequence,
      });
    };
    eventChannel.port2.start();
    worker.postMessage({ type: 'initialize', seed, mode: 'manual', snapshotPort: channel.port1, eventPort: eventChannel.port1 }, [channel.port1, eventChannel.port1]);
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
    await new Promise((resolve) => setTimeout(resolve, 25));
    snapshots.length = 0;
    worker.postMessage({ type: 'set-mode', requestId: 8, mode: 'realtime' });
    await waitFor(() => responses.some((message) => message.type === 'complete' && message.requestId === 8));
    const realtimeStart = responses.find((message) => message.type === 'complete' && message.requestId === 8);
    const blockedUntil = performance.now() + 300;
    while (performance.now() < blockedUntil) { /* deliberate main-thread consumer stall */ }
    worker.postMessage({ type: 'set-mode', requestId: 9, mode: 'manual' });
    await waitFor(() => responses.some((message) => message.type === 'complete' && message.requestId === 9));
    const realtimeEnd = responses.find((message) => message.type === 'complete' && message.requestId === 9);
    await waitFor(() => snapshots.length >= 2);
    const beforeRecoveryCount = snapshots.length;
    const realtimeReturned = snapshots[0];
    channel.port2.postMessage({
      type: 'return-snapshot', generation: realtimeReturned.generation,
      slotId: realtimeReturned.slotId, buffer: realtimeReturned.buffer,
    }, [realtimeReturned.buffer]);
    await waitFor(() => snapshots.length > beforeRecoveryCount);
    const realtimeNewestTick = new DataView(snapshots.at(-1).buffer).getUint32(4, true);
    worker.postMessage({
      type: 'reset', requestId: 10, seed: 'worker-upgrade-proof', initialCoins: 12,
      weaponUpgrades: { pulseDamage: 1, pulseEfficiency: 1, swordCooling: 1, bombCapacity: 2, laserCooling: 1 },
      playerUpgrades: { maxHealth: 3, maxEnergy: 2 },
    });
    await waitFor(() => responses.some((message) => message.type === 'complete' && message.requestId === 10));
    const upgraded = responses.find((message) => message.type === 'complete' && message.requestId === 10).observation;
    worker.postMessage({
      type: 'reset', requestId: 11, seed: 'campaign-level-011-v1',
      levelId: 'level-011', encounter: 'campaign',
    });
    await waitFor(() => responses.some((message) => message.type === 'complete' && message.requestId === 11));
    const levelEleven = responses.find((message) => message.type === 'complete' && message.requestId === 11).observation;
    worker.postMessage({
      type: 'step', requestId: 12,
      command: { forward: 1, strafe: 0, yawDelta: 0, pitchDelta: 0, fire: false, dash: true },
      ticks: 1,
    });
    await waitFor(() => responses.some((message) => message.type === 'complete' && message.requestId === 12));
    const dashed = responses.find((message) => message.type === 'complete' && message.requestId === 12).observation;
    worker.terminate();
    return {
      directChecksum, workerChecksum: complete.checksum, transport: complete.transport, initialTicks, newestTick,
      realtime: {
        startTick: realtimeStart.tick,
        endTick: realtimeEnd.tick,
        ticksDuringMainStall: realtimeEnd.tick - realtimeStart.tick,
        coalescedDuringStall: realtimeEnd.transport.coalesced - realtimeStart.transport.coalesced,
        newestTick: realtimeNewestTick,
      },
      upgradeProof: {
        coins: upgraded.player.coins,
        bombs: upgraded.player.bombs,
        weaponLevels: upgraded.player.weaponUpgrades,
        playerLevels: upgraded.player.playerUpgrades,
        maxHealth: upgraded.player.maxHealth,
        maxEnergy: upgraded.player.maxEnergy,
      },
      levelElevenProof: {
        levelId: levelEleven.levelId,
        seed: levelEleven.seed,
        remainingRobots: levelEleven.remainingRobots,
        unlockedWeapons: levelEleven.player.unlockedWeapons,
        hazardIds: levelEleven.hazards.map((hazard) => hazard.id),
        doorId: levelEleven.door.id,
        dancePresetId: levelEleven.dancePerformance.presetId,
        dashDistance: Math.hypot(dashed.player.x - levelEleven.player.x, dashed.player.z - levelEleven.player.z),
        dashCooldownTicks: dashed.player.dash.cooldownTicks,
        dashEnergyCost: dashed.player.dash.energyCost,
      },
    };
  });
  const failures = [...errors];
  if (result.directChecksum !== result.workerChecksum) failures.push('Direct and Worker checksums differ');
  if (result.transport.inFlight !== 2 || result.transport.producerOwned !== 1) failures.push('Three-buffer ownership invariant was not observed');
  if (result.transport.coalesced !== 239) failures.push(`Expected 239 coalesced snapshots, got ${result.transport.coalesced}`);
  if (result.newestTick !== 240) failures.push(`Expected recovered newest tick 240, got ${result.newestTick}`);
  if (result.realtime.ticksDuringMainStall < 10) failures.push('Simulation Worker did not continue through the main-thread stall');
  if (result.realtime.coalescedDuringStall < 1) failures.push('Realtime stall did not exercise snapshot coalescing');
  if (result.realtime.newestTick !== result.realtime.endTick) failures.push('Realtime recovery did not deliver the newest completed tick');
  if (result.upgradeProof.coins !== 12 || result.upgradeProof.bombs !== 5
    || result.upgradeProof.weaponLevels.bombCapacity !== 2
    || result.upgradeProof.playerLevels.maxHealth !== 3 || result.upgradeProof.playerLevels.maxEnergy !== 2
    || result.upgradeProof.maxHealth !== 145 || result.upgradeProof.maxEnergy !== 124) {
    failures.push('Worker reset did not install authoritative profile upgrades');
  }
  if (result.levelElevenProof.levelId !== 'level-011'
    || result.levelElevenProof.seed !== 'campaign-level-011-v1'
    || result.levelElevenProof.remainingRobots !== 8
    || result.levelElevenProof.unlockedWeapons.join(',') !== 'pulse,sword'
    || result.levelElevenProof.hazardIds.join(',') !== 'ticket-gate-west,ticket-gate-east'
    || result.levelElevenProof.doorId !== 'ticket-gate'
    || result.levelElevenProof.dancePresetId !== 'ticket-taker-swing'
    || result.levelElevenProof.dashDistance < 2.5
    || result.levelElevenProof.dashCooldownTicks !== 48
    || result.levelElevenProof.dashEnergyCost !== 24) {
    failures.push('Worker/LLM observation did not preserve the authored Level 11 campaign identity');
  }
  if (failures.length > 0) throw new Error(failures.join('; '));
  process.stdout.write(`${JSON.stringify({ passed: true, ...result }, null, 2)}\n`);
} finally {
  await browser?.close();
  await server.close();
}
