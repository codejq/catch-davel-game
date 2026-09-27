import { REPLAY_FORMAT_VERSION, type ReplayFile } from '../replay/replay';
import type { SimulationWorkerClient } from '../runtime/simulation-worker-client';
import { DEFAULT_LEVEL_SEED, GAME_SCHEMA_VERSION } from '../sim/constants';
import { levelObservation, type AgentObservation } from './observation';
import {
  agentActionSchema, normalizeAgentAction,
  type AgentAction, type ZamaSniperAgentApi, type ReplayEntry,
} from './api';
import { TRAINING_WEAPON_MASK } from '../sim/weapons';
import { campaignLevel } from '../content/levels/catalog';
import { isPlayableLevelId, type PlayableLevelId } from '../content/level-ids';
import { createRunMetrics } from '../sim/run-metrics';
import { isDifficultyId, type DifficultyId } from '../sim/difficulty';
import { AGENT_API_VERSION } from './contract';

type ResetOptions = { readonly levelId?: PlayableLevelId; readonly seed?: string; readonly difficulty?: DifficultyId; readonly mode?: 'agent'; readonly loadout?: 'campaign' | 'training'; readonly encounter?: 'campaign' | 'boss-training' };

export class WorkerAgentController {
  private controlled = false;
  private queuedActions = 0;
  private chain: Promise<void> = Promise.resolve();
  private readonly replay: ReplayEntry[] = [];

  constructor(
    private readonly client: SimulationWorkerClient,
    private readonly resumeHuman: () => Promise<void> = async () => { await client.setMode('realtime'); },
  ) {}

  isAgentControlled(): boolean { return this.controlled; }

  install(): ZamaSniperAgentApi {
    const api: ZamaSniperAgentApi = {
      version: AGENT_API_VERSION,
      getVersion: () => ({ apiVersion: AGENT_API_VERSION, simulationSchemaVersion: GAME_SCHEMA_VERSION, replayFormatVersion: REPLAY_FORMAT_VERSION }),
      getActionSchema: () => agentActionSchema(),
      reset: (options = {}) => this.reset(options),
      observe: () => this.client.latestObservation,
      level: () => levelObservation(this.client.latestObservation.levelId),
      act: (action, ticks = 1) => this.step(action, ticks),
      step: (request) => this.step(request.action, request.ticks ?? 1),
      saveReplay: () => this.task(() => this.client.saveReplay()),
      loadReplay: (replay) => this.loadReplay(replay),
      getMetrics: () => {
        const metrics = this.client.latestMetrics;
        const runMetrics = metrics?.runMetrics ?? createRunMetrics();
        return {
          tick: this.client.latestObservation.tick,
          checksum: metrics?.checksum ?? '0000000000000000',
          commandRuns: metrics?.commandRuns ?? 0,
          checksumRecords: metrics?.checksumRecords ?? 0,
          controlled: this.controlled,
          queuedActions: this.queuedActions,
          runMetrics: { ...runMetrics, defeatedRobotIds: [...runMetrics.defeatedRobotIds] },
        };
      },
      releaseControl: () => this.release(),
      replayLog: () => this.replay.map((entry) => ({ ...entry, action: { ...entry.action } })),
    };
    Object.freeze(api);
    window.ZamaSniperAgent = api;
    return api;
  }

  private reset(options: ResetOptions): Promise<AgentObservation> {
    return this.task(async () => {
      if (options.levelId !== undefined && !isPlayableLevelId(options.levelId)) throw new Error('Agent levelId is invalid');
      if (options.difficulty !== undefined && !isDifficultyId(options.difficulty)) throw new Error('Agent difficulty is invalid');
      if (options.mode !== undefined && options.mode !== 'agent') throw new Error('Agent API reset requires agent mode');
      if (options.loadout !== undefined && options.loadout !== 'campaign' && options.loadout !== 'training') throw new Error('Agent loadout is invalid');
      if (options.encounter !== undefined && options.encounter !== 'campaign' && options.encounter !== 'boss-training') throw new Error('Agent encounter is invalid');
      const levelId = options.levelId ?? 'level-001';
      const seed = options.seed ?? campaignLevel(levelId).seed;
      if (seed.length === 0 || seed.length > 256) throw new Error('Agent seed must contain 1 to 256 characters');
      await this.client.setMode('manual', true);
      const training = options.loadout === 'training' || options.encounter === 'boss-training';
      const response = await this.client.reset(
        seed, 0, true, training ? TRAINING_WEAPON_MASK : undefined, undefined, options.encounter ?? 'campaign', levelId,
        options.difficulty ?? 'standard',
      );
      this.controlled = true;
      this.replay.length = 0;
      return response.observation;
    });
  }

  private step(action: AgentAction, ticks: number): Promise<AgentObservation> {
    if (!Number.isInteger(ticks) || ticks < 1 || ticks > 600) return Promise.reject(new Error('Agent ticks must be an integer from 1 to 600'));
    const normalized = normalizeAgentAction(action);
    this.queuedActions += 1;
    return this.task(async () => {
      try {
        if (!this.controlled) await this.client.setMode('manual', true);
        this.controlled = true;
        this.replay.push({ tick: this.client.latestObservation.tick, ticks, action: normalized });
        const response = await this.client.step({
          forward: normalized.forward,
          strafe: normalized.strafe,
          yawDelta: normalized.turn,
          pitchDelta: normalized.look,
          fire: normalized.fire,
          altFire: normalized.altFire,
          sprint: normalized.sprint,
          dash: normalized.dash,
          weapon: normalized.weapon,
        }, ticks);
        return response.observation;
      } finally {
        this.queuedActions -= 1;
      }
    });
  }

  private loadReplay(replay: ReplayFile | string): Promise<AgentObservation> {
    return this.task(async () => {
      await this.client.setMode('manual', true);
      const response = await this.client.loadReplay(replay);
      this.controlled = true;
      this.replay.length = 0;
      return response.observation;
    });
  }

  private release(): Promise<void> {
    return this.task(async () => {
      await this.resumeHuman();
      this.controlled = false;
    });
  }

  private task<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.chain.then(operation);
    this.chain = result.then(() => undefined, () => undefined);
    return result;
  }
}
