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
  if (!executable) throw new Error('Chrome/Chromium was not found; set CHROME_PATH for the live-runtime verifier');
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
  await page.waitForFunction(() => (
    document.body.dataset.profileReady === 'true'
    && document.body.dataset.workerStatus === 'ready'
    && window.CatchDavelAgent !== undefined
    && Number(document.body.dataset.snapshotTick) > 0
  ));

  const result = await page.evaluate(async () => {
    const readProfileRecords = async () => {
      const request = indexedDB.open('quantum-catch-davel', 1);
      const database = await new Promise((resolve, reject) => {
        request.addEventListener('success', () => resolve(request.result), { once: true });
        request.addEventListener('error', () => reject(request.error), { once: true });
      });
      const transaction = database.transaction('profile-records', 'readonly');
      const entriesRequest = transaction.objectStore('profile-records').getAll();
      const values = await new Promise((resolve, reject) => {
        entriesRequest.addEventListener('success', () => resolve(entriesRequest.result), { once: true });
        entriesRequest.addEventListener('error', () => reject(entriesRequest.error), { once: true });
      });
      database.close();
      return values;
    };

    const api = window.CatchDavelAgent;
    if (!api) throw new Error('Development agent API was not installed');
    const realtimeStartTick = Number(document.body.dataset.snapshotTick);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const realtimeEndTick = Number(document.body.dataset.snapshotTick);
    const profilesBeforeAgent = await readProfileRecords();

    const resetObservation = await api.reset({ seed: 'live-worker-agent-proof', mode: 'agent' });
    const steppedObservation = await api.step({
      action: { forward: 0.7, strafe: -0.15, turn: -0.008, look: 0.002, fire: true },
      ticks: 30,
    });
    const objectiveCompass = {
      hidden: document.querySelector('#objective-compass')?.hidden,
      target: document.querySelector('#objective-compass')?.dataset.target,
      label: document.querySelector('#objective-compass-target')?.textContent,
      distance: document.querySelector('#objective-compass-distance')?.textContent,
      aria: document.querySelector('#objective-compass')?.getAttribute('aria-label'),
    };
    const savedMetrics = api.getMetrics();
    const replay = await api.saveReplay();
    await api.reset({ seed: 'different-agent-seed', mode: 'agent' });
    const loadedObservation = await api.loadReplay(replay);
    const loadedMetrics = api.getMetrics();
    const pausedTick = Number(document.body.dataset.snapshotTick);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const pausedTickAfterWait = Number(document.body.dataset.snapshotTick);

    const levelEightObservation = await api.reset({ levelId: 'level-008', mode: 'agent' });
    const levelEightReplay = await api.saveReplay();
    const levelEightProof = {
      levelId: levelEightObservation.levelId,
      seed: levelEightObservation.seed,
      count: levelEightObservation.robots.length,
      replayLevelId: levelEightReplay.levelId,
      observedLevelId: api.level().levelId,
      dancePerformance: levelEightObservation.dancePerformance,
      gates: levelEightObservation.hazards.map((hazard) => ({
        kind: hazard.kind, active: hazard.active, ticksUntilToggle: hazard.ticksUntilToggle,
      })),
    };

    const bossObservation = await api.reset({ seed: 'live-boss-proof', mode: 'agent', encounter: 'boss-training' });
    const bossProof = {
      count: bossObservation.robots.length,
      id: bossObservation.robots[0]?.id,
      name: bossObservation.robots[0]?.name,
      rank: bossObservation.robots[0]?.rank,
      phase: bossObservation.robots[0]?.bossPhase,
      health: bossObservation.robots[0]?.health,
    };

    let arsenalObservation = await api.reset({ seed: 'live-arsenal-proof', mode: 'agent', loadout: 'training' });
    arsenalObservation = await api.act({ weapon: 'sword', fire: true }, 1);
    const swordHeat = arsenalObservation.player.swordHeat;
    arsenalObservation = await api.act({ weapon: 'bomb', fire: true }, 1);
    const bombCount = arsenalObservation.player.bombs;
    const liveBombs = arsenalObservation.playerBombs.length;
    arsenalObservation = await api.act({ weapon: 'laser', fire: true }, 1);
    const arsenalProof = {
      selectedWeapon: arsenalObservation.player.selectedWeapon,
      unlockedWeapons: arsenalObservation.player.unlockedWeapons,
      swordHeat,
      bombCount,
      liveBombs,
      laserHeat: arsenalObservation.player.laserHeat,
      laserActive: arsenalObservation.laser.active,
    };

    const [{ BaselineCampaignAgent }, { LEVEL_001 }] = await Promise.all([
      import('/src/agent/baseline-policy.ts'),
      import('/src/content/levels/level-001.ts'),
    ]);
    const policy = new BaselineCampaignAgent();
    let baselineObservation = await api.reset({ mode: 'agent' });
    const baselineRun = LEVEL_001.agentValidation.runs[0];
    while (!baselineObservation.victory && !baselineObservation.defeat && baselineObservation.tick < baselineRun.maxTicks) {
      baselineObservation = await api.act(policy.next(baselineObservation), 1);
    }
    const baselineMetrics = api.getMetrics();
    const profilesAfterAgent = await readProfileRecords();
    const presentationDeadline = performance.now() + 2_000;
    while (Number(document.body.dataset.snapshotTick) < baselineObservation.tick && performance.now() < presentationDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const baselineScoreHud = document.querySelector('#run-score')?.textContent;
    const baselineComboHud = document.querySelector('#run-combo')?.textContent;
    const baselineBarkSpeaker = document.querySelector('#davel-bark-speaker')?.textContent;
    const baselineBarkLine = document.querySelector('#davel-bark-line')?.textContent;

    await api.releaseControl();
    const releasedTick = Number(document.body.dataset.snapshotTick);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const resumedTick = Number(document.body.dataset.snapshotTick);

    return {
      workerStatus: document.body.dataset.workerStatus,
      profileReady: document.body.dataset.profileReady,
      realtimeStartTick,
      realtimeEndTick,
      resetTick: resetObservation.tick,
      steppedTick: steppedObservation.tick,
      objectiveCompass,
      loadedTick: loadedObservation.tick,
      savedChecksum: savedMetrics.checksum,
      loadedChecksum: loadedMetrics.checksum,
      pausedTick,
      pausedTickAfterWait,
      releasedTick,
      resumedTick,
      replayFinalTick: replay.checksums.at(-1)?.tick,
      baselineTick: baselineObservation.tick,
      baselineVictory: baselineObservation.victory,
      baselineDefeat: baselineObservation.defeat,
      baselineChecksum: baselineMetrics.checksum,
      baselineRunMetrics: baselineMetrics.runMetrics,
      baselineObservationSchemaVersion: baselineObservation.schemaVersion,
      baselineRunObservation: baselineObservation.run,
      baselineScoreHud,
      baselineComboHud,
      baselineBarkSpeaker,
      baselineBarkLine,
      baselineExpectedChecksum: baselineRun.expectedChecksum,
      baselineMaxTicks: baselineRun.maxTicks,
      profileStableDuringAgentRun: JSON.stringify(profilesBeforeAgent) === JSON.stringify(profilesAfterAgent),
      rendererMode: document.body.dataset.rendererMode,
      levelEightProof,
      arsenalProof,
      bossProof,
    };
  });

  const assertions = [
    [result.workerStatus === 'ready', 'live Worker status is not ready'],
    [result.profileReady === 'true', 'profile repository was not ready'],
    [result.realtimeEndTick > result.realtimeStartTick, 'realtime Worker clock did not advance'],
    [result.resetTick === 0, 'agent reset did not begin at tick zero'],
    [result.steppedTick === 30 && result.replayFinalTick === 30, 'agent step/replay tick mismatch'],
    [result.objectiveCompass.hidden === false && result.objectiveCompass.target === 'key'
      && result.objectiveCompass.label === 'WORKSHOP KEY'
      && /\d+ m away/.test(result.objectiveCompass.distance ?? '')
      && result.objectiveCompass.aria?.includes('meters away'),
    'localized human objective compass did not follow the live key target'],
    [result.loadedTick === 30, 'loaded replay did not restore its final tick'],
    [result.savedChecksum === result.loadedChecksum, 'loaded replay checksum differs from the saved run'],
    [result.pausedTickAfterWait === result.pausedTick, 'manual agent simulation advanced without an action'],
    [result.baselineVictory && !result.baselineDefeat, 'public Worker agent did not complete Level 1'],
    [result.baselineTick < result.baselineMaxTicks, 'public Worker agent exceeded the Level 1 tick budget'],
    [result.baselineChecksum === result.baselineExpectedChecksum, 'public Worker agent missed the frozen Level 1 checksum'],
    [result.baselineRunMetrics.rangedAttacksFired >= result.baselineRunMetrics.rangedAttacksHit
      && result.baselineRunMetrics.rangedAttacksHit > 0, 'authoritative ranged accuracy metrics were not reported'],
    [result.baselineRunMetrics.defeatedRobotIds.length === 6
      && result.baselineRunMetrics.highestCombo > 0, 'authoritative Davel/combo metrics were not reported'],
    [result.baselineObservationSchemaVersion === 11
      && result.baselineRunObservation.robotsDefeated === 6, 'observation v11 did not expose run progress'],
    [typeof result.baselineScoreHud === 'string'
      && Number(result.baselineScoreHud.replace(/[^0-9]/g, '')) === result.baselineRunObservation.score
      && result.baselineComboHud === `×${result.baselineRunObservation.currentCombo}`, 'live score/combo HUD drifted from observation'],
    [typeof result.baselineBarkSpeaker === 'string' && result.baselineBarkSpeaker.length > 0
      && typeof result.baselineBarkLine === 'string' && result.baselineBarkLine.length > 0,
    'deterministic Davel personality bark did not reach the live presentation'],
    [result.resumedTick > result.releasedTick, 'human realtime simulation did not resume after releaseControl'],
    [result.profileStableDuringAgentRun, 'agent activity mutated the human profile'],
    [result.rendererMode === 'offscreen-worker', 'live runtime did not initialize the OffscreenCanvas render Worker'],
    [result.levelEightProof.levelId === 'level-008' && result.levelEightProof.replayLevelId === 'level-008'
      && result.levelEightProof.observedLevelId === 'level-008', 'Level 8 identity did not cross the Worker/observation/replay boundary'],
    [result.levelEightProof.seed === 'campaign-level-008-v1' && result.levelEightProof.count === 8,
      'Level 8 did not load its canonical seed and encounter roster'],
    [result.levelEightProof.dancePerformance.presetId === 'clockwork-charleston'
      && result.levelEightProof.dancePerformance.bpm === 110,
    'Level 8 did not expose its canonical choreography through the live Worker'],
    [result.levelEightProof.gates.length === 3
      && result.levelEightProof.gates.every((hazard) => hazard.kind === 'timed-door')
      && result.levelEightProof.gates.every((hazard) => hazard.ticksUntilToggle > 0),
    'Level 8 did not expose three phased clockwork gates through the live Worker'],
    [result.arsenalProof.selectedWeapon === 'laser', 'training arsenal did not select the laser'],
    [result.arsenalProof.unlockedWeapons.join(',') === 'pulse,sword,bomb,laser', 'training arsenal did not unlock all weapons'],
    [result.arsenalProof.swordHeat > 0, 'Worker sword action did not generate heat'],
    [result.arsenalProof.bombCount === 2 && result.arsenalProof.liveBombs === 1, 'Worker bomb action did not create a thrown bomb'],
    [result.arsenalProof.laserHeat > 0 && result.arsenalProof.laserActive, 'Worker laser action did not produce continuous beam state'],
    [result.bossProof.count === 1 && result.bossProof.id === 6 && result.bossProof.name === 'The Final Invoice', 'boss training did not load the stable boss identity'],
    [result.bossProof.rank === 'boss' && result.bossProof.phase === 1 && result.bossProof.health === 420, 'boss training did not expose phase-one authoritative state'],
    [errors.length === 0, `browser errors: ${errors.join('; ')}`],
  ];
  const failed = assertions.filter(([passed]) => !passed).map(([, message]) => message);
  if (failed.length > 0) throw new Error(`${failed.join('\n')}\n${JSON.stringify(result, null, 2)}`);
  console.log(JSON.stringify({ passed: true, ...result, browserErrors: errors }, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
