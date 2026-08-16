import { WorkerAgentController } from '../agent/worker-api';
import { createRendererHost } from '../render/renderer-host';
import type { RenderGameState } from '../render/render-model';
import { DEFAULT_LEVEL_SEED, LOOK_SCALE } from '../sim/constants';
import type { PlayerCommand } from '../sim/player';
import { createPlatformProfileRepository } from '../storage/platform';
import { createDefaultProfile, updateProfile, type ProfileV1 } from '../storage/profile';
import type { DecodedGameEvent } from '../transport/event-channel';
import { SimulationWorkerClient } from './simulation-worker-client';
import {
  CAMPAIGN_LEVEL_1_WEAPON_MASK, normalizeWeaponUpgradeLevels, TRAINING_WEAPON_MASK,
  type WeaponId, type WeaponUpgradeId,
} from '../sim/weapons';
import { purchaseWeaponUpgrade, weaponUpgradeCost, WEAPON_UPGRADE_CATALOG } from '../storage/economy';
import { chapter01Level } from '../content/levels/chapter-01';
import { CHAPTER_01_LEVEL_IDS, isChapter01LevelId } from '../content/level-ids';
import {
  completeCampaignLevel, recordCampaignAttempt, recordCampaignDefeat, recordCampaignRobotDefeat,
} from '../campaign/progression';
import { chapter01LevelTitle } from '../campaign/catalog';

function requireCanvas(): HTMLCanvasElement {
  const element = document.querySelector<HTMLCanvasElement>('#game');
  if (element === null) throw new Error('Game canvas is missing');
  return element;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Required HUD element ${selector} is missing`);
  return element;
}

export async function startBrowserGame(): Promise<void> {
  const parameters = new URLSearchParams(location.search);
  const bossTraining = parameters.get('encounter') === 'boss-training';
  const trainingMode = parameters.get('arsenal') === 'training' || bossTraining;
  const requestedLevelId = parameters.get('level');
  let activeLevelId = requestedLevelId !== null && isChapter01LevelId(requestedLevelId)
    ? requestedLevelId : bossTraining ? 'level-010' : 'level-001';
  let activeLevel = chapter01Level(activeLevelId);
  let canvas = requireCanvas();
  const renderer = await createRendererHost(canvas, {
    forceMainThread: parameters.get('renderer') === 'main',
    onError: (error) => console.warn('Offscreen renderer issue', error),
  });
  canvas = renderer.canvas;
  document.body.dataset.rendererMode = renderer.mode;
  const healthHud = requireElement<HTMLElement>('#health');
  const energyHud = requireElement<HTMLElement>('#energy');
  const coinsHud = requireElement<HTMLElement>('#coins');
  const remainingHud = requireElement<HTMLElement>('#remaining');
  const crosshair = requireElement<HTMLElement>('#crosshair');
  const combatMessage = requireElement<HTMLElement>('#combat-message');
  const weaponStatus = requireElement<HTMLElement>('#weapon-status');
  const shop = requireElement<HTMLElement>('#shop');
  const shopCoins = requireElement<HTMLElement>('#shop-coins');
  const campaignButton = requireElement<HTMLButtonElement>('#campaign-button');
  const campaignMap = requireElement<HTMLElement>('#campaign-map');
  const campaignClose = requireElement<HTMLButtonElement>('#campaign-close');
  const campaignLevels = requireElement<HTMLElement>('#campaign-levels');
  const levelName = requireElement<HTMLElement>('#level-name');
  document.body.dataset.loadout = trainingMode ? 'training' : 'campaign';
  document.body.dataset.encounter = bossTraining ? 'boss-training' : 'campaign';
  const profileStorage = createPlatformProfileRepository();
  const profileRepository = profileStorage.repository;
  document.body.dataset.profileStorage = profileStorage.backend;
  let activeProfile: ProfileV1;
  try {
    const loadedProfile = await profileRepository.load('default');
    activeProfile = loadedProfile ?? createDefaultProfile();
    if (loadedProfile === null) await profileRepository.save(activeProfile);
    document.body.dataset.profileReady = 'true';
  } catch (error) {
    activeProfile = createDefaultProfile();
    document.body.dataset.profileReady = 'error';
    console.warn('Catch Davel profile load failed; continuing without durable persistence', error);
  }
  if (!trainingMode && !activeProfile.unlockedLevelIds.includes(activeLevelId)) {
    activeLevelId = 'level-001';
    activeLevel = chapter01Level(activeLevelId);
  }
  document.body.dataset.levelId = activeLevelId;
  levelName.textContent = `LEVEL ${activeLevelId.slice(-2)} · ${chapter01LevelTitle(activeLevelId).toUpperCase()}`;
  let renderState: RenderGameState | null = null;
  let messageTimeout = 0;
  let audioContext: AudioContext | null = null;
  let profileWrite: Promise<void> = Promise.resolve();
  let humanSessionStarted = false;
  let agentController: WorkerAgentController;

  const renderCampaignMap = (): void => {
    campaignLevels.replaceChildren(...CHAPTER_01_LEVEL_IDS.map((levelId, index) => {
      const button = document.createElement('button');
      const progress = activeProfile.levelProgress.find((entry) => entry.levelId === levelId);
      const unlocked = activeProfile.unlockedLevelIds.includes(levelId);
      button.type = 'button';
      button.className = `level-card${levelId === activeLevelId ? ' active' : ''}${progress?.completed ? ' completed' : ''}`;
      button.dataset.levelId = levelId;
      button.disabled = !unlocked;
      const number = document.createElement('b');
      number.textContent = `LEVEL ${String(index + 1).padStart(2, '0')}`;
      const title = document.createElement('span');
      title.textContent = chapter01LevelTitle(levelId);
      const status = document.createElement('small');
      status.textContent = !unlocked ? 'LOCKED' : progress?.completed
        ? `CLEARED · BEST ${progress.bestTicks ?? '—'} TICKS` : levelId === activeLevelId ? 'CURRENT MISSION' : 'READY';
      button.append(number, title, status);
      return button;
    }));
  };
  renderCampaignMap();

  const persistProfile = (profile: ProfileV1): void => {
    activeProfile = profile;
    if (trainingMode) return;
    profileWrite = profileWrite.then(() => profileRepository.save(profile)).catch((error: unknown) => {
      console.warn('Catch Davel profile save failed', error);
    });
  };

  const beginHumanSession = (): void => {
    if (humanSessionStarted || agentController?.isAgentControlled()) return;
    humanSessionStarted = true;
    shop.classList.remove('open');
    persistProfile(recordCampaignAttempt(activeProfile, activeLevelId));
  };

  const sound = (frequency: number, duration: number, volume: number, wave: OscillatorType): void => {
    if (audioContext === null) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * 0.46), audioContext.currentTime + duration);
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  };

  const showMessage = (text: string): void => {
    combatMessage.textContent = text;
    combatMessage.classList.add('show');
    window.clearTimeout(messageTimeout);
    messageTimeout = window.setTimeout(() => combatMessage.classList.remove('show'), 650);
  };

  const updateHud = (state: RenderGameState): void => {
    healthHud.textContent = String(Math.ceil(state.player.health));
    energyHud.textContent = String(Math.floor(state.player.energy));
    coinsHud.textContent = String(state.player.coins);
    const remaining = state.robots.filter((robot) => robot.active).length;
    remainingHud.textContent = state.victory ? 'maze clear!'
      : state.level.objectiveComplete ? 'reach the green exit'
      : bossTraining
        ? `THE FINAL INVOICE · ${Math.ceil(state.robots[0]?.health ?? 0)} HP · phase ${state.robots[0]?.bossPhase ?? 1}`
        : state.level.encounter.pendingTicks > 0
          ? `DAVEL SHIFT ${state.level.encounter.waveIndex + 2}/${state.level.encounter.waveCount} IN ${state.level.encounter.pendingTicks}`
        : `${remaining} Davels remain`;
    const resource = state.player.selectedWeapon === 'bomb' ? ` · ${state.player.bombs} BOMBS`
      : state.player.selectedWeapon === 'sword' ? ` · HEAT ${Math.ceil(state.player.swordHeat)}`
      : state.player.selectedWeapon === 'laser' ? ` · HEAT ${Math.ceil(state.player.laserHeat)}${state.player.laserOverheated ? ' OVERHEATED' : ''}` : '';
    weaponStatus.textContent = `${state.player.selectedWeapon.toUpperCase()}${resource}`;
    document.body.dataset.weapon = state.player.selectedWeapon;
  };

  const persistDurableState = (state: RenderGameState): void => {
    if (!humanSessionStarted || agentController.isAgentControlled()) return;
    if (state.player.coins > activeProfile.spendableCoins) {
      const earned = state.player.coins - activeProfile.spendableCoins;
      persistProfile(updateProfile(activeProfile, {
        totalCoins: activeProfile.totalCoins + earned,
        spendableCoins: state.player.coins,
      }));
    }
  };

  const processEvent = (event: DecodedGameEvent): void => {
    if (event.type === 'pulse-fired') sound(210, 0.11, 0.055, 'sawtooth');
    if (event.type === 'sword-swung' || event.type === 'sword-charged') sound(event.type === 'sword-charged' ? 110 : 180, 0.14, 0.05, 'sawtooth');
    if (event.type === 'projectile-deflected') sound(880, 0.08, 0.04, 'square');
    if (event.type === 'bomb-thrown') sound(145, 0.11, 0.035, 'triangle');
    if (event.type === 'bomb-detonated') { showMessage('PULSE BOMB DETONATED'); sound(58, 0.42, 0.1, 'sawtooth'); }
    if (event.type === 'laser-fired' && event.tick % 4 === 0) sound(430, 0.05, 0.018, 'sine');
    if (event.type === 'robot-hit') {
      crosshair.classList.add('hit');
      window.setTimeout(() => crosshair.classList.remove('hit'), 90);
      sound(92, 0.08, 0.04, 'square');
    }
    if (event.type === 'robot-fired') sound(155, 0.18, 0.035, 'triangle');
    if (event.type === 'robot-telegraph') sound(260, 0.22, 0.025, 'triangle');
    if (event.type === 'robot-melee') sound(74, 0.14, 0.06, 'square');
    if (event.type === 'robot-buff') { showMessage('DJ GRIN DROPPED THE EVIL BEAT'); sound(520, 0.35, 0.04, 'sawtooth'); }
    if (event.type === 'boss-phase') { showMessage(`FINAL INVOICE · PHASE ${event.value ?? 1}`); sound(48, 0.7, 0.11, 'sawtooth'); }
    if (event.type === 'player-hit') {
      document.body.classList.add('hurt');
      window.setTimeout(() => document.body.classList.remove('hurt'), 130);
      sound(68, 0.2, 0.075, 'sawtooth');
    }
    if (event.type === 'key-collected') {
      showMessage('WORKSHOP KEY ACQUIRED');
      sound(620, 0.16, 0.045, 'square');
    }
    if (event.type === 'health-collected') {
      showMessage(`REPAIR KIT  +${event.value ?? 0} HEALTH`);
      sound(440, 0.18, 0.04, 'sine');
    }
    if (event.type === 'energy-collected') {
      showMessage(`PULSE CELL  +${event.value ?? 0} ENERGY`);
      sound(760, 0.15, 0.04, 'triangle');
    }
    if (event.type === 'coin-collected') {
      showMessage(`QUANTUM CACHE  +${event.value ?? 0} COINS`);
      sound(980, 0.2, 0.045, 'sine');
    }
    if (event.type === 'door-opened') showMessage('WORKSHOP LOCK OPEN');
    if (event.type === 'checkpoint-activated') {
      showMessage('CHECKPOINT STABILIZED');
      if (humanSessionStarted && !agentController.isAgentControlled()) {
        void client.getCheckpoint().then((snapshot) => {
          if (snapshot !== null && humanSessionStarted && !agentController.isAgentControlled()) {
            persistProfile(updateProfile(activeProfile, { campaignCheckpoint: snapshot }));
          }
        }).catch((error: unknown) => console.warn('Catch Davel checkpoint save failed', error));
      }
    }
    if (event.type === 'objective-complete') showMessage('ALL DAVELS DOWN');
    if (event.type === 'exit-unlocked') showMessage('EXIT ONLINE — REACH THE GREEN PORTAL');
    if (event.type === 'robot-defeated') {
      showMessage(`DAVEL DOWN  +${event.coins ?? 0} COINS`);
      if (humanSessionStarted && !agentController.isAgentControlled() && renderState !== null) {
        const reward = event.coins ?? 0;
        persistProfile(updateProfile(activeProfile, {
          totalCoins: activeProfile.totalCoins + reward,
          spendableCoins: renderState.player.coins,
          levelProgress: recordCampaignRobotDefeat(activeProfile, activeLevelId).levelProgress,
        }));
      }
    }
    if (event.type === 'victory') {
      showMessage('MAZE STABILIZED!');
      if (humanSessionStarted && !agentController.isAgentControlled() && renderState !== null) {
        persistProfile(completeCampaignLevel(activeProfile, activeLevelId, renderState.tick));
        renderCampaignMap();
        window.setTimeout(() => {
          campaignMap.classList.add('open');
          campaignMap.setAttribute('aria-hidden', 'false');
          document.exitPointerLock();
        }, 700);
      }
    }
    if (event.type === 'defeat') {
      showMessage('SYSTEM DOWN — DAVELS WIN');
      if (humanSessionStarted && !agentController.isAgentControlled()) {
        persistProfile(recordCampaignDefeat(activeProfile, activeLevelId));
      }
    }
  };

  const client = await SimulationWorkerClient.create({
    seed: activeLevel.seed,
    levelId: activeLevelId,
    initialCoins: trainingMode ? 0 : activeProfile.spendableCoins,
    mode: 'manual',
    unlockedWeaponMask: trainingMode ? TRAINING_WEAPON_MASK : CAMPAIGN_LEVEL_1_WEAPON_MASK,
    ...(trainingMode ? {} : { weaponUpgrades: normalizeWeaponUpgradeLevels(activeProfile.weaponUpgrades) }),
    encounter: bossTraining ? 'boss-training' : 'campaign',
    callbacks: {
      onSnapshot: (state) => {
        renderState = state;
        updateHud(state);
        document.body.dataset.snapshotTick = String(state.tick);
      },
      onEvent: processEvent,
      onResync: (state) => {
        renderState = state;
        updateHud(state);
        persistDurableState(state);
        showMessage('PRESENTATION RESYNCHRONIZED');
      },
      onError: (error) => {
        document.body.dataset.workerStatus = 'error';
        showMessage('SIMULATION WORKER ERROR');
        console.error(error);
      },
    },
  });
  if (!trainingMode && activeProfile.campaignCheckpoint?.levelId === activeLevelId) await client.loadSnapshot(activeProfile.campaignCheckpoint);
  await client.setMode('realtime');
  agentController = new WorkerAgentController(client, async () => {
    if (!trainingMode && activeProfile.campaignCheckpoint?.levelId === activeLevelId) await client.loadSnapshot(activeProfile.campaignCheckpoint);
    else await client.reset(
      activeLevel.seed, trainingMode ? 0 : activeProfile.spendableCoins, false,
      trainingMode ? TRAINING_WEAPON_MASK : CAMPAIGN_LEVEL_1_WEAPON_MASK,
      trainingMode ? undefined : normalizeWeaponUpgradeLevels(activeProfile.weaponUpgrades),
      bossTraining ? 'boss-training' : 'campaign',
      activeLevelId,
    );
    await client.setMode('realtime');
    humanSessionStarted = false;
  });
  if (import.meta.env.DEV || import.meta.env.VITE_AGENT_API === '1') agentController.install();
  document.body.dataset.workerStatus = 'ready';

  let resumeAfterCampaignMap = false;
  const setCampaignMapOpen = (open: boolean): void => {
    campaignMap.classList.toggle('open', open);
    campaignMap.setAttribute('aria-hidden', String(!open));
    if (open) {
      resumeAfterCampaignMap = !renderState?.victory && !renderState?.defeat;
      shop.classList.remove('open');
      document.exitPointerLock();
      void client.setMode('manual');
    } else if (resumeAfterCampaignMap && !renderState?.victory && !renderState?.defeat) {
      resumeAfterCampaignMap = false;
      void client.setMode('realtime');
    }
  };
  campaignButton.hidden = trainingMode;
  campaignMap.hidden = trainingMode;
  campaignButton.addEventListener('click', () => setCampaignMapOpen(!campaignMap.classList.contains('open')));
  campaignClose.addEventListener('click', () => setCampaignMapOpen(false));
  campaignLevels.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-level-id]');
    const levelId = button?.dataset.levelId;
    if (button === null || button.disabled || levelId === undefined || !isChapter01LevelId(levelId)) return;
    if (levelId === activeLevelId) {
      setCampaignMapOpen(false);
      return;
    }
    const nextParameters = new URLSearchParams(location.search);
    nextParameters.set('level', levelId);
    location.search = nextParameters.toString();
  });

  const renderShop = (): void => {
    const levels = normalizeWeaponUpgradeLevels(activeProfile.weaponUpgrades);
    shopCoins.textContent = String(activeProfile.spendableCoins);
    for (const button of shop.querySelectorAll<HTMLButtonElement>('button[data-upgrade]')) {
      const id = button.dataset.upgrade as WeaponUpgradeId;
      const definition = WEAPON_UPGRADE_CATALOG.find((entry) => entry.id === id)!;
      const level = levels[id];
      button.disabled = level >= 3;
      button.textContent = level >= 3
        ? `${definition.name} · MAX`
        : `${definition.name} · L${level} → L${level + 1} · ${weaponUpgradeCost(id, level)} coins`;
      button.title = definition.description;
    }
  };
  renderShop();
  if (trainingMode) shop.hidden = true;
  shop.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-upgrade]');
    if (button === null || trainingMode || humanSessionStarted || agentController.isAgentControlled()) return;
    const id = button.dataset.upgrade as WeaponUpgradeId;
    try {
      const upgraded = purchaseWeaponUpgrade(activeProfile, id);
      persistProfile(upgraded);
      renderShop();
      void client.reset(
        activeLevel.seed, upgraded.spendableCoins, false, CAMPAIGN_LEVEL_1_WEAPON_MASK,
        normalizeWeaponUpgradeLevels(upgraded.weaponUpgrades),
        'campaign', activeLevelId,
      ).then(() => client.setMode('realtime')).catch((error: unknown) => console.error(error));
      showMessage(`${WEAPON_UPGRADE_CATALOG.find((entry) => entry.id === id)!.name.toUpperCase()} INSTALLED`);
    } catch (error) {
      showMessage(error instanceof Error ? error.message.toUpperCase() : 'UPGRADE FAILED');
    }
  });

  new ResizeObserver(() => renderer.resize()).observe(canvas);
  renderer.resize();
  const pressed = new Set<string>();
  let yawDelta = 0;
  let pitchDelta = 0;
  let fireQueued = false;
  let altFireQueued = false;
  let fireHeld = false;
  let queuedWeapon: WeaponId | null = null;
  let resumeAfterVisibility = false;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      pressed.clear(); fireHeld = false; fireQueued = false; altFireQueued = false;
      resumeAfterVisibility = !agentController.isAgentControlled()
        && !campaignMap.classList.contains('open') && !renderState?.victory && !renderState?.defeat;
      if (resumeAfterVisibility) void client.setMode('manual');
      if (humanSessionStarted) persistProfile(activeProfile);
      document.body.dataset.suspended = 'true';
    } else {
      document.body.dataset.suspended = 'false';
      if (resumeAfterVisibility && !agentController.isAgentControlled()
        && !campaignMap.classList.contains('open') && !renderState?.victory && !renderState?.defeat) {
        resumeAfterVisibility = false;
        void client.setMode('realtime');
      }
    }
  });

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.code === 'KeyM' && !trainingMode && !agentController.isAgentControlled()) {
      event.preventDefault();
      setCampaignMapOpen(!campaignMap.classList.contains('open'));
      return;
    }
    if (event.code === 'KeyU' && !trainingMode && !humanSessionStarted && !agentController.isAgentControlled()) {
      event.preventDefault();
      shop.classList.toggle('open');
      if (shop.classList.contains('open')) document.exitPointerLock();
      return;
    }
    if (shop.classList.contains('open')) return;
    pressed.add(event.code);
    const weaponByCode: Partial<Record<string, WeaponId>> = { Digit1: 'pulse', Digit2: 'sword', Digit3: 'bomb', Digit4: 'laser' };
    queuedWeapon = weaponByCode[event.code] ?? queuedWeapon;
    beginHumanSession();
  });
  window.addEventListener('keyup', (event: KeyboardEvent) => pressed.delete(event.code));
  window.addEventListener('blur', () => pressed.clear());
  window.addEventListener('mousemove', (event: MouseEvent) => {
    if (document.pointerLockElement !== canvas || agentController.isAgentControlled()) return;
    yawDelta += event.movementX * LOOK_SCALE;
    pitchDelta -= event.movementY * LOOK_SCALE;
  });
  canvas.addEventListener('click', () => {
    if (agentController.isAgentControlled()) return;
    beginHumanSession();
    audioContext ??= new AudioContext();
    void audioContext.resume();
    if (document.pointerLockElement !== canvas) void canvas.requestPointerLock();
  });
  canvas.addEventListener('mousedown', (event: MouseEvent) => {
    if (document.pointerLockElement !== canvas || agentController.isAgentControlled()) return;
    if (event.button === 0) fireHeld = true;
    if (event.button === 2) { fireQueued = true; altFireQueued = true; }
    document.body.classList.add('firing');
  });
  window.addEventListener('mouseup', (event: MouseEvent) => {
    if (event.button === 0) fireHeld = false;
    document.body.classList.remove('firing');
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    document.body.classList.toggle('locked', document.pointerLockElement === canvas);
  });
  window.addEventListener('pagehide', () => {
    if (humanSessionStarted && !agentController.isAgentControlled()) persistProfile(updateProfile(activeProfile, { lastCleanShutdown: true }));
    renderer.dispose();
    client.terminate();
  });

  const frame = (): void => {
    if (!agentController.isAgentControlled()) {
      const command: PlayerCommand = {
        forward: Number(pressed.has('KeyW') || pressed.has('ArrowUp')) - Number(pressed.has('KeyS') || pressed.has('ArrowDown')),
        strafe: Number(pressed.has('KeyD') || pressed.has('ArrowRight')) - Number(pressed.has('KeyA') || pressed.has('ArrowLeft')),
        yawDelta,
        pitchDelta,
        fire: fireQueued || fireHeld,
        altFire: altFireQueued,
        weapon: queuedWeapon,
      };
      client.sendInput(command);
      yawDelta = 0;
      pitchDelta = 0;
      fireQueued = false;
      altFireQueued = false;
      queuedWeapon = null;
    }
    if (renderState !== null) renderer.present(renderState);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
