import { WorkerAgentController } from '../agent/worker-api';
import { createRendererHost } from '../render/renderer-host';
import type { RenderGameState } from '../render/render-model';
import { DEFAULT_LEVEL_SEED, LOOK_SCALE } from '../sim/constants';
import type { PlayerCommand } from '../sim/player';
import { createBrowserProfileRepository } from '../storage/indexeddb';
import { createDefaultProfile, updateProfile, type LevelProgressV1, type ProfileV1 } from '../storage/profile';
import type { DecodedGameEvent } from '../transport/event-channel';
import { SimulationWorkerClient } from './simulation-worker-client';
import { CAMPAIGN_LEVEL_1_WEAPON_MASK, TRAINING_WEAPON_MASK, type WeaponId } from '../sim/weapons';

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
  const trainingMode = new URLSearchParams(location.search).get('arsenal') === 'training';
  let canvas = requireCanvas();
  const renderer = await createRendererHost(canvas, {
    forceMainThread: new URLSearchParams(location.search).get('renderer') === 'main',
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
  document.body.dataset.loadout = trainingMode ? 'training' : 'campaign';
  const profileRepository = createBrowserProfileRepository();
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
  let renderState: RenderGameState | null = null;
  let messageTimeout = 0;
  let audioContext: AudioContext | null = null;
  let profileWrite: Promise<void> = Promise.resolve();
  let humanSessionStarted = false;
  let agentController: WorkerAgentController;

  const updateLevelProgress = (profile: ProfileV1, update: (progress: LevelProgressV1) => LevelProgressV1): readonly LevelProgressV1[] => (
    profile.levelProgress.map((progress) => progress.levelId === 'level-001' ? update(progress) : progress)
  );

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
    persistProfile(updateProfile(activeProfile, {
      lastCleanShutdown: false,
      levelProgress: updateLevelProgress(activeProfile, (progress) => ({ ...progress, attempts: progress.attempts + 1 })),
    }));
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
          levelProgress: updateLevelProgress(activeProfile, (progress) => ({ ...progress, robotsDefeated: progress.robotsDefeated + 1 })),
        }));
      }
    }
    if (event.type === 'victory') {
      showMessage('MAZE STABILIZED!');
      if (humanSessionStarted && !agentController.isAgentControlled() && renderState !== null) {
        const unlocked = activeProfile.unlockedLevelIds.includes('level-002')
          ? activeProfile.unlockedLevelIds : [...activeProfile.unlockedLevelIds, 'level-002'];
        persistProfile(updateProfile(activeProfile, {
          unlockedLevelIds: unlocked,
          campaignCheckpoint: null,
          levelProgress: updateLevelProgress(activeProfile, (progress) => ({
            ...progress,
            completed: true,
            bestTicks: progress.bestTicks === null ? renderState!.tick : Math.min(progress.bestTicks, renderState!.tick),
          })),
        }));
      }
    }
    if (event.type === 'defeat') {
      showMessage('SYSTEM DOWN — DAVELS WIN');
      if (humanSessionStarted && !agentController.isAgentControlled()) {
        persistProfile(updateProfile(activeProfile, {
          levelProgress: updateLevelProgress(activeProfile, (progress) => ({ ...progress, defeats: progress.defeats + 1 })),
        }));
      }
    }
  };

  const client = await SimulationWorkerClient.create({
    seed: DEFAULT_LEVEL_SEED,
    initialCoins: trainingMode ? 0 : activeProfile.spendableCoins,
    mode: 'manual',
    unlockedWeaponMask: trainingMode ? TRAINING_WEAPON_MASK : CAMPAIGN_LEVEL_1_WEAPON_MASK,
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
  if (!trainingMode && activeProfile.campaignCheckpoint !== null) await client.loadSnapshot(activeProfile.campaignCheckpoint);
  await client.setMode('realtime');
  agentController = new WorkerAgentController(client, async () => {
    if (!trainingMode && activeProfile.campaignCheckpoint !== null) await client.loadSnapshot(activeProfile.campaignCheckpoint);
    else await client.reset(
      DEFAULT_LEVEL_SEED, trainingMode ? 0 : activeProfile.spendableCoins, false,
      trainingMode ? TRAINING_WEAPON_MASK : CAMPAIGN_LEVEL_1_WEAPON_MASK,
    );
    await client.setMode('realtime');
    humanSessionStarted = false;
  });
  if (import.meta.env.DEV || import.meta.env.VITE_AGENT_API === '1') agentController.install();
  document.body.dataset.workerStatus = 'ready';

  new ResizeObserver(() => renderer.resize()).observe(canvas);
  renderer.resize();
  const pressed = new Set<string>();
  let yawDelta = 0;
  let pitchDelta = 0;
  let fireQueued = false;
  let altFireQueued = false;
  let fireHeld = false;
  let queuedWeapon: WeaponId | null = null;

  window.addEventListener('keydown', (event: KeyboardEvent) => {
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
