import type { GameSimulation } from '../sim/game';
import type { PlayerCommand } from '../sim/player';
import { createObservation, levelObservation, type AgentObservation } from './observation';
import {
  REPLAY_FORMAT_VERSION, ReplayRecorder, parseReplay, verifyReplay, type ReplayFile,
} from '../replay/replay';
import { DEFAULT_LEVEL_SEED, GAME_SCHEMA_VERSION } from '../sim/constants';
import { createSimulationSnapshot, stateChecksum } from '../sim/serialization';
import { isWeaponId, TRAINING_WEAPON_MASK, type WeaponId } from '../sim/weapons';
import { campaignLevel } from '../content/levels/catalog';
import { isPlayableLevelId, type PlayableLevelId } from '../content/level-ids';
import type { RunMetrics } from '../sim/run-metrics';
import { isDifficultyId, type DifficultyId } from '../sim/difficulty';
import { AGENT_API_VERSION } from './contract';

export type AgentResetOptions = { readonly levelId?: PlayableLevelId; readonly seed?: string; readonly difficulty?: DifficultyId; readonly mode?: 'agent'; readonly loadout?: 'campaign' | 'training'; readonly encounter?: 'campaign' | 'boss-training' };

export interface AgentAction {
  readonly forward?: number;
  readonly strafe?: number;
  readonly turn?: number;
  readonly look?: number;
  readonly fire?: boolean;
  readonly altFire?: boolean;
  readonly sprint?: boolean;
  readonly dash?: boolean;
  readonly weapon?: WeaponId;
}

export interface NormalizedAgentAction {
  readonly forward: number;
  readonly strafe: number;
  readonly turn: number;
  readonly look: number;
  readonly fire: boolean;
  readonly altFire: boolean;
  readonly sprint: boolean;
  readonly dash: boolean;
  readonly weapon: WeaponId | null;
}

export interface ReplayEntry {
  readonly tick: number;
  readonly ticks: number;
  readonly action: NormalizedAgentAction;
}

interface QueuedAction {
  readonly action: NormalizedAgentAction;
  remaining: number;
  readonly resolve: (observation: AgentObservation) => void;
}

export interface ZamaSniperAgentApi {
  readonly version: typeof AGENT_API_VERSION;
  getVersion(): { readonly apiVersion: typeof AGENT_API_VERSION; readonly simulationSchemaVersion: number; readonly replayFormatVersion: number };
  getActionSchema(): Readonly<Record<string, unknown>>;
  reset(options?: AgentResetOptions): Promise<AgentObservation>;
  observe(): AgentObservation;
  level(): ReturnType<typeof levelObservation>;
  act(action: AgentAction, ticks?: number): Promise<AgentObservation>;
  step(request: { readonly action: AgentAction; readonly ticks?: number }): Promise<AgentObservation>;
  saveReplay(): Promise<ReplayFile>;
  loadReplay(replay: ReplayFile | string): Promise<AgentObservation>;
  getMetrics(): {
    readonly tick: number;
    readonly checksum: string;
    readonly commandRuns: number;
    readonly checksumRecords: number;
    readonly controlled: boolean;
    readonly queuedActions: number;
    readonly runMetrics: RunMetrics;
  };
  releaseControl(): Promise<void>;
  replayLog(): readonly ReplayEntry[];
}

function finiteBounded(value: number | undefined, minimum: number, maximum: number, fallback = 0): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) throw new Error('Agent action values must be finite');
  return Math.max(minimum, Math.min(maximum, value));
}

export function normalizeAgentAction(action: AgentAction): NormalizedAgentAction {
  if (action.weapon !== undefined && !isWeaponId(action.weapon)) throw new Error('Agent weapon is invalid');
  return {
    forward: finiteBounded(action.forward, -1, 1),
    strafe: finiteBounded(action.strafe, -1, 1),
    turn: finiteBounded(action.turn, -0.2, 0.2),
    look: finiteBounded(action.look, -0.12, 0.12),
    fire: action.fire === true,
    altFire: action.altFire === true,
    sprint: action.sprint === true,
    dash: action.dash === true,
    weapon: action.weapon ?? null,
  };
}

export function agentActionSchema(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    type: 'object',
    additionalProperties: false,
    properties: Object.freeze({
      forward: Object.freeze({ type: 'number', minimum: -1, maximum: 1 }),
      strafe: Object.freeze({ type: 'number', minimum: -1, maximum: 1 }),
      turn: Object.freeze({ type: 'number', minimum: -0.2, maximum: 0.2 }),
      look: Object.freeze({ type: 'number', minimum: -0.12, maximum: 0.12 }),
      fire: Object.freeze({ type: 'boolean' }),
      altFire: Object.freeze({ type: 'boolean' }),
      sprint: Object.freeze({ type: 'boolean' }),
      dash: Object.freeze({ type: 'boolean' }),
      weapon: Object.freeze({ type: 'string', enum: Object.freeze(['pulse', 'sword', 'bomb', 'laser']) }),
    }),
  });
}

export class AgentController {
  private readonly queue: QueuedAction[] = [];
  private readonly replay: ReplayEntry[] = [];
  private controlled = false;
  private recorder: ReplayRecorder;

  constructor(private readonly simulation: GameSimulation) {
    this.recorder = new ReplayRecorder(simulation);
  }

  isAgentControlled(): boolean { return this.controlled; }

  install(): ZamaSniperAgentApi {
    const api: ZamaSniperAgentApi = {
      version: AGENT_API_VERSION,
      getVersion: () => ({ apiVersion: AGENT_API_VERSION, simulationSchemaVersion: GAME_SCHEMA_VERSION, replayFormatVersion: REPLAY_FORMAT_VERSION }),
      getActionSchema: () => agentActionSchema(),
      reset: async (options = {}) => this.resetSession(options),
      observe: () => createObservation(this.simulation.state),
      level: () => levelObservation(this.simulation.state.levelId),
      act: (action, ticks = 1) => this.enqueue(action, ticks),
      step: (request) => this.enqueue(request.action, request.ticks ?? 1),
      saveReplay: async () => this.recorder.finish(),
      loadReplay: async (replay) => this.loadReplay(replay),
      getMetrics: () => {
        const replay = this.recorder.finish();
        return {
          tick: this.simulation.state.tick,
          checksum: stateChecksum(this.simulation.state),
          commandRuns: replay.commandRuns.length,
          checksumRecords: replay.checksums.length,
          controlled: this.controlled,
          queuedActions: this.queue.length,
          runMetrics: {
            ...this.simulation.state.metrics,
            defeatedRobotIds: [...this.simulation.state.metrics.defeatedRobotIds],
          },
        };
      },
      releaseControl: async () => this.release(),
      replayLog: () => this.replay.map((entry) => ({ ...entry, action: { ...entry.action } })),
    };
    Object.freeze(api);
    window.ZamaSniperAgent = api;
    return api;
  }

  nextCommand(humanCommand: PlayerCommand): PlayerCommand | null {
    if (!this.controlled) return humanCommand;
    const next = this.queue[0];
    if (next === undefined) return null;
    return {
      forward: next.action.forward,
      strafe: next.action.strafe,
      yawDelta: next.action.turn,
      pitchDelta: next.action.look,
      fire: next.action.fire,
      altFire: next.action.altFire,
      sprint: next.action.sprint,
      dash: next.action.dash,
      weapon: next.action.weapon,
    };
  }

  afterStep(command: PlayerCommand): void {
    this.recorder.record(command);
    if (!this.controlled) return;
    const next = this.queue[0];
    if (next === undefined) return;
    next.remaining -= 1;
    if (next.remaining > 0) return;
    this.queue.shift();
    next.resolve(createObservation(this.simulation.state));
  }

  private enqueue(action: AgentAction, ticksValue: number): Promise<AgentObservation> {
    if (!Number.isInteger(ticksValue) || ticksValue < 1 || ticksValue > 600) throw new Error('Agent ticks must be an integer from 1 to 600');
    const normalized = normalizeAgentAction(action);
    this.controlled = true;
    this.recorder.markAgentRun();
    this.replay.push({ tick: this.simulation.state.tick, ticks: ticksValue, action: normalized });
    return new Promise((resolve) => this.queue.push({ action: normalized, remaining: ticksValue, resolve }));
  }

  private release(): void {
    if (this.queue.length > 0) throw new Error('Cannot release agent control while actions are queued');
    this.controlled = false;
  }

  private resetSession(options: AgentResetOptions): AgentObservation {
    if (this.queue.length > 0) throw new Error('Cannot reset while agent actions are queued');
    if (options.levelId !== undefined && !isPlayableLevelId(options.levelId)) throw new Error('Agent levelId is invalid');
    if (options.difficulty !== undefined && !isDifficultyId(options.difficulty)) throw new Error('Agent difficulty is invalid');
    if (options.mode !== undefined && options.mode !== 'agent') throw new Error('Agent API reset requires agent mode');
    const levelId = options.levelId ?? 'level-001';
    const seed = options.seed ?? campaignLevel(levelId).seed;
    if (seed.length === 0 || seed.length > 256) throw new Error('Agent seed must contain 1 to 256 characters');
    if (options.loadout !== undefined && options.loadout !== 'campaign' && options.loadout !== 'training') throw new Error('Agent loadout is invalid');
    if (options.encounter !== undefined && options.encounter !== 'campaign' && options.encounter !== 'boss-training') throw new Error('Agent encounter is invalid');
    this.simulation.reset(
      seed, options.loadout === 'training' || options.encounter === 'boss-training' ? TRAINING_WEAPON_MASK : undefined,
      undefined, options.encounter ?? 'campaign', levelId, options.difficulty ?? 'standard',
    );
    this.controlled = true;
    this.replay.length = 0;
    this.recorder = new ReplayRecorder(this.simulation);
    this.recorder.markAgentRun();
    return createObservation(this.simulation.state);
  }

  private loadReplay(replayValue: ReplayFile | string): AgentObservation {
    if (this.queue.length > 0) throw new Error('Cannot load a replay while agent actions are queued');
    const replay = typeof replayValue === 'string' ? parseReplay(replayValue) : replayValue;
    const verified = verifyReplay(replay);
    this.simulation.loadSnapshot(createSimulationSnapshot(verified.simulation.state));
    this.controlled = true;
    this.replay.length = 0;
    this.recorder = new ReplayRecorder(this.simulation);
    this.recorder.markAgentRun();
    return createObservation(this.simulation.state);
  }
}

declare global {
  interface Window {
    ZamaSniperAgent?: ZamaSniperAgentApi;
  }
}
