import { WorkerAgentController } from '../agent/worker-api';
import { WorldRenderer } from '../render/world-renderer';
import type { RenderGameState } from '../render/render-model';
import { LOOK_SCALE } from '../sim/constants';
import type { PlayerCommand } from '../sim/player';
import { createBrowserProfileRepository } from '../storage/indexeddb';
import { createDefaultProfile, updateProfile, type LevelProgressV1, type ProfileV1 } from '../storage/profile';
import type { DecodedGameEvent } from '../transport/event-channel';
import { SimulationWorkerClient } from './simulation-worker-client';

function requireCanvas(): HTMLCanvasElement {
  const element = document.querySelector<HTMLCanvasElement>('#game');
  if (element === null) throw new Error('Game canvas is missing');
  return element;
}

function requireWebGL2(element: HTMLCanvasElement): WebGL2RenderingContext {
  const context = element.getContext('webgl2', { alpha: false, antialias: true });
  if (context === null) throw new Error('Catch Davel requires WebGL2');
  return context;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Required HUD element ${selector} is missing`);
  return element;
}

export async function startBrowserGame(): Promise<void> {
  const canvas = requireCanvas();
  const renderer = new WorldRenderer(requireWebGL2(canvas), canvas);
  const healthHud = requireElement<HTMLElement>('#health');
  const energyHud = requireElement<HTMLElement>('#energy');
  const coinsHud = requireElement<HTMLElement>('#coins');
  const remainingHud = requireElement<HTMLElement>('#remaining');
  const crosshair = requireElement<HTMLElement>('#crosshair');
  const combatMessage = requireElement<HTMLElement>('#combat-message');
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
    remainingHud.textContent = state.victory ? 'maze clear!' : `${remaining} remain`;
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
    seed: 'first-playable-v1',
    initialCoins: activeProfile.spendableCoins,
    mode: 'realtime',
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
  await client.getStatus();
  agentController = new WorkerAgentController(client, async () => {
    await client.reset('first-playable-v1', activeProfile.spendableCoins, false);
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

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    pressed.add(event.code);
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
    else {
      fireQueued = true;
      document.body.classList.add('firing');
      window.setTimeout(() => document.body.classList.remove('firing'), 80);
    }
  });
  document.addEventListener('pointerlockchange', () => {
    document.body.classList.toggle('locked', document.pointerLockElement === canvas);
  });
  window.addEventListener('pagehide', () => {
    if (humanSessionStarted && !agentController.isAgentControlled()) persistProfile(updateProfile(activeProfile, { lastCleanShutdown: true }));
    client.terminate();
  });

  const frame = (): void => {
    if (!agentController.isAgentControlled()) {
      const command: PlayerCommand = {
        forward: Number(pressed.has('KeyW') || pressed.has('ArrowUp')) - Number(pressed.has('KeyS') || pressed.has('ArrowDown')),
        strafe: Number(pressed.has('KeyD') || pressed.has('ArrowRight')) - Number(pressed.has('KeyA') || pressed.has('ArrowLeft')),
        yawDelta,
        pitchDelta,
        fire: fireQueued,
      };
      client.sendInput(command);
      yawDelta = 0;
      pitchDelta = 0;
      fireQueued = false;
    }
    if (renderState !== null) renderer.render(renderState);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
