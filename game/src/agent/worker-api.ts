import { REPLAY_FORMAT_VERSION, type ReplayFileV1 } from '../replay/replay';
import type { SimulationWorkerClient } from '../runtime/simulation-worker-client';
import { GAME_SCHEMA_VERSION } from '../sim/constants';
import { levelObservation, type AgentObservation } from './observation';
import {
  agentActionSchema, normalizeAgentAction,
  type AgentAction, type CatchDavelAgentApi, type ReplayEntry,
} from './api';

type ResetOptions = { readonly levelId?: 'level-001'; readonly seed?: string; readonly difficulty?: 'standard'; readonly mode?: 'agent' };

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

  install(): CatchDavelAgentApi {
    const api: CatchDavelAgentApi = {
      version: 1,
      getVersion: () => ({ apiVersion: 1, simulationSchemaVersion: GAME_SCHEMA_VERSION, replayFormatVersion: REPLAY_FORMAT_VERSION }),
      getActionSchema: () => agentActionSchema(),
      reset: (options = {}) => this.reset(options),
      observe: () => this.client.latestObservation,
      level: () => levelObservation(),
      act: (action, ticks = 1) => this.step(action, ticks),
      step: (request) => this.step(request.action, request.ticks ?? 1),
      saveReplay: () => this.task(() => this.client.saveReplay()),
      loadReplay: (replay) => this.loadReplay(replay),
      getMetrics: () => {
        const metrics = this.client.latestMetrics;
        return {
          tick: this.client.latestObservation.tick,
          checksum: metrics?.checksum ?? '0000000000000000',
          commandRuns: metrics?.commandRuns ?? 0,
          checksumRecords: metrics?.checksumRecords ?? 0,
          controlled: this.controlled,
          queuedActions: this.queuedActions,
        };
      },
      releaseControl: () => this.release(),
      replayLog: () => this.replay.map((entry) => ({ ...entry, action: { ...entry.action } })),
    };
    Object.freeze(api);
    window.CatchDavelAgent = api;
    return api;
  }

  private reset(options: ResetOptions): Promise<AgentObservation> {
    return this.task(async () => {
      if (options.levelId !== undefined && options.levelId !== 'level-001') throw new Error('Only level-001 is implemented');
      if (options.difficulty !== undefined && options.difficulty !== 'standard') throw new Error('Only standard difficulty is implemented');
      if (options.mode !== undefined && options.mode !== 'agent') throw new Error('Agent API reset requires agent mode');
      const seed = options.seed ?? 'first-playable-v1';
      if (seed.length === 0 || seed.length > 256) throw new Error('Agent seed must contain 1 to 256 characters');
      await this.client.setMode('manual', true);
      const response = await this.client.reset(seed, 0, true);
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
        }, ticks);
        return response.observation;
      } finally {
        this.queuedActions -= 1;
      }
    });
  }

  private loadReplay(replay: ReplayFileV1 | string): Promise<AgentObservation> {
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
