import type { GameSimulation } from '../sim/game';
import type { PlayerCommand } from '../sim/player';
import { createObservation, levelObservation, type AgentObservation } from './observation';

export interface AgentAction {
  readonly forward?: number;
  readonly strafe?: number;
  readonly turn?: number;
  readonly look?: number;
  readonly fire?: boolean;
}

export interface ReplayEntry {
  readonly tick: number;
  readonly ticks: number;
  readonly action: Required<AgentAction>;
}

interface QueuedAction {
  readonly action: Required<AgentAction>;
  remaining: number;
  readonly resolve: (observation: AgentObservation) => void;
}

export interface CatchDavelAgentApi {
  readonly version: 1;
  observe(): AgentObservation;
  level(): ReturnType<typeof levelObservation>;
  act(action: AgentAction, ticks?: number): Promise<AgentObservation>;
  releaseControl(): void;
  replayLog(): readonly ReplayEntry[];
}

function finiteBounded(value: number | undefined, minimum: number, maximum: number, fallback = 0): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) throw new Error('Agent action values must be finite');
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeAction(action: AgentAction): Required<AgentAction> {
  return {
    forward: finiteBounded(action.forward, -1, 1),
    strafe: finiteBounded(action.strafe, -1, 1),
    turn: finiteBounded(action.turn, -0.2, 0.2),
    look: finiteBounded(action.look, -0.12, 0.12),
    fire: action.fire === true,
  };
}

export class AgentController {
  private readonly queue: QueuedAction[] = [];
  private readonly replay: ReplayEntry[] = [];
  private controlled = false;

  constructor(private readonly simulation: GameSimulation) {}

  install(): CatchDavelAgentApi {
    const api: CatchDavelAgentApi = {
      version: 1,
      observe: () => createObservation(this.simulation.state),
      level: () => levelObservation(),
      act: (action, ticks = 1) => this.enqueue(action, ticks),
      releaseControl: () => this.release(),
      replayLog: () => this.replay.map((entry) => ({ ...entry, action: { ...entry.action } })),
    };
    window.CatchDavelAgent = api;
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
    };
  }

  afterStep(): void {
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
    const normalized = normalizeAction(action);
    this.controlled = true;
    this.replay.push({ tick: this.simulation.state.tick, ticks: ticksValue, action: normalized });
    return new Promise((resolve) => this.queue.push({ action: normalized, remaining: ticksValue, resolve }));
  }

  private release(): void {
    if (this.queue.length > 0) throw new Error('Cannot release agent control while actions are queued');
    this.controlled = false;
  }
}

declare global {
  interface Window {
    CatchDavelAgent: CatchDavelAgentApi;
  }
}
