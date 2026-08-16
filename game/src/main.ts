import './style.css';
import { WorldRenderer } from './render/world-renderer';
import { FIXED_DT_SECONDS, LOOK_SCALE } from './sim/constants';
import { GameSimulation } from './sim/game';
import type { GameEvent } from './sim/game';
import { AgentController } from './agent/api';
import { createBrowserProfileRepository } from './storage/indexeddb';
import { createDefaultProfile, updateProfile, type LevelProgressV1, type ProfileV1 } from './storage/profile';

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

const canvas = requireCanvas();
const gl = requireWebGL2(canvas);
const healthHud = requireElement<HTMLElement>('#health');
const energyHud = requireElement<HTMLElement>('#energy');
const coinsHud = requireElement<HTMLElement>('#coins');
const remainingHud = requireElement<HTMLElement>('#remaining');
const crosshair = requireElement<HTMLElement>('#crosshair');
const combatMessage = requireElement<HTMLElement>('#combat-message');

const renderer = new WorldRenderer(gl, canvas);
const simulation = new GameSimulation();
const agentController = new AgentController(simulation);
if (import.meta.env.DEV || import.meta.env.VITE_AGENT_API === '1') agentController.install();
const profileRepository = createBrowserProfileRepository();
let activeProfile: ProfileV1 | null = null;
let profileWrite: Promise<void> = Promise.resolve();
const pressed = new Set<string>();
let yawDelta = 0;
let pitchDelta = 0;
let fireQueued = false;
let previousTime = performance.now();
let accumulator = 0;
let messageTimeout = 0;
let audioContext: AudioContext | null = null;

function updateLevelProgress(profile: ProfileV1, update: (progress: LevelProgressV1) => LevelProgressV1): readonly LevelProgressV1[] {
  return profile.levelProgress.map((progress) => progress.levelId === 'level-001' ? update(progress) : progress);
}

function persistProfile(profile: ProfileV1): void {
  activeProfile = profile;
  profileWrite = profileWrite.then(() => profileRepository.save(profile)).catch((error: unknown) => {
    console.warn('Catch Davel profile save failed', error);
  });
}

async function initializeProfile(): Promise<void> {
  try {
    const loaded = await profileRepository.load('default');
    const profile = loaded ?? createDefaultProfile();
    activeProfile = profile;
    if (!agentController.isAgentControlled()) {
      simulation.state.player.coins = profile.spendableCoins;
      persistProfile(updateProfile(profile, {
        lastCleanShutdown: false,
        levelProgress: updateLevelProgress(profile, (progress) => ({ ...progress, attempts: progress.attempts + 1 })),
      }));
    }
    document.body.dataset.profileReady = 'true';
  } catch (error) {
    document.body.dataset.profileReady = 'error';
    console.warn('Catch Davel profile load failed; continuing without persistence', error);
  }
}

void initializeProfile();

new ResizeObserver(() => renderer.resize()).observe(canvas);
renderer.resize();

window.addEventListener('keydown', (event: KeyboardEvent) => pressed.add(event.code));
window.addEventListener('keyup', (event: KeyboardEvent) => pressed.delete(event.code));
window.addEventListener('blur', () => pressed.clear());
window.addEventListener('mousemove', (event: MouseEvent) => {
  if (document.pointerLockElement !== canvas) return;
  yawDelta += event.movementX * LOOK_SCALE;
  pitchDelta -= event.movementY * LOOK_SCALE;
});

canvas.addEventListener('click', () => {
  audioContext ??= new AudioContext();
  void audioContext.resume();
  if (document.pointerLockElement !== canvas) void canvas.requestPointerLock();
  else {
    fireQueued = true;
    document.body.classList.add('firing');
    setTimeout(() => document.body.classList.remove('firing'), 80);
  }
});
document.addEventListener('pointerlockchange', () => {
  document.body.classList.toggle('locked', document.pointerLockElement === canvas);
});

function sound(frequency: number, duration: number, volume: number, wave: OscillatorType): void {
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
}

function showMessage(text: string): void {
  combatMessage.textContent = text;
  combatMessage.classList.add('show');
  window.clearTimeout(messageTimeout);
  messageTimeout = window.setTimeout(() => combatMessage.classList.remove('show'), 650);
}

function processEvents(events: readonly GameEvent[]): void {
  for (const event of events) {
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
      if (activeProfile !== null && !agentController.isAgentControlled()) {
        const reward = event.coins ?? 0;
        persistProfile(updateProfile(activeProfile, {
          totalCoins: activeProfile.totalCoins + reward,
          spendableCoins: simulation.state.player.coins,
          levelProgress: updateLevelProgress(activeProfile, (progress) => ({
            ...progress, robotsDefeated: progress.robotsDefeated + 1,
          })),
        }));
      }
    }
    if (event.type === 'victory') {
      showMessage('MAZE STABILIZED!');
      if (activeProfile !== null && !agentController.isAgentControlled()) {
        const unlocked = activeProfile.unlockedLevelIds.includes('level-002')
          ? activeProfile.unlockedLevelIds
          : [...activeProfile.unlockedLevelIds, 'level-002'];
        persistProfile(updateProfile(activeProfile, {
          unlockedLevelIds: unlocked,
          campaignCheckpoint: null,
          levelProgress: updateLevelProgress(activeProfile, (progress) => ({
            ...progress,
            completed: true,
            bestTicks: progress.bestTicks === null ? simulation.state.tick : Math.min(progress.bestTicks, simulation.state.tick),
          })),
        }));
      }
    }
    if (event.type === 'defeat') {
      showMessage('SYSTEM DOWN — DAVELS WIN');
      if (activeProfile !== null && !agentController.isAgentControlled()) {
        persistProfile(updateProfile(activeProfile, {
          levelProgress: updateLevelProgress(activeProfile, (progress) => ({ ...progress, defeats: progress.defeats + 1 })),
        }));
      }
    }
  }
}

window.addEventListener('pagehide', () => {
  if (activeProfile !== null && !agentController.isAgentControlled()) persistProfile(updateProfile(activeProfile, { lastCleanShutdown: true }));
});

function updateHud(): void {
  healthHud.textContent = String(Math.ceil(simulation.state.player.health));
  energyHud.textContent = String(Math.floor(simulation.state.player.energy));
  coinsHud.textContent = String(simulation.state.player.coins);
  const remaining = simulation.state.robots.filter((robot) => robot.active).length;
  remainingHud.textContent = simulation.state.victory ? 'maze clear!' : `${remaining} remain`;
}

function frame(now: number): void {
  accumulator += Math.min(0.1, (now - previousTime) / 1_000);
  previousTime = now;
  let catchupSteps = 0;
  while (accumulator >= FIXED_DT_SECONDS && catchupSteps < 5) {
    const command = agentController.nextCommand({
      forward: Number(pressed.has('KeyW') || pressed.has('ArrowUp')) - Number(pressed.has('KeyS') || pressed.has('ArrowDown')),
      strafe: Number(pressed.has('KeyD') || pressed.has('ArrowRight')) - Number(pressed.has('KeyA') || pressed.has('ArrowLeft')),
      yawDelta,
      pitchDelta,
      fire: fireQueued,
    });
    if (command === null) {
      accumulator = 0;
      break;
    }
    simulation.step(command);
    processEvents(simulation.state.events);
    agentController.afterStep(command);
    yawDelta = 0;
    pitchDelta = 0;
    fireQueued = false;
    accumulator -= FIXED_DT_SECONDS;
    catchupSteps += 1;
  }
  updateHud();
  renderer.render(simulation.state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
