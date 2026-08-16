import { BaselineCampaignAgent } from '../agent/baseline-policy';
import { normalizeAgentAction } from '../agent/api';
import { createObservation } from '../agent/observation';
import { campaignLevel, PLAYABLE_LEVELS, type PlayableLevelId } from '../content/levels/catalog';
import { currentAgentValidationDependencies } from '../replay/replay';
import { GameSimulation } from '../sim/game';
import { stateChecksum } from '../sim/serialization';
import type { DifficultyId } from '../sim/difficulty';

export type CampaignQaFailure = 'defeat' | 'illegal-action' | 'stuck' | 'tick-budget' | null;

export interface CampaignQaResult {
  readonly levelId: PlayableLevelId;
  readonly validationRunId: string;
  readonly seed: string;
  readonly finalTick: number;
  readonly checksum: string;
  readonly victory: boolean;
  readonly defeat: boolean;
  readonly remainingRobots: number;
  readonly illegalActions: number;
  readonly maximumIdleProgressTicks: number;
  readonly failure: CampaignQaFailure;
  readonly dependencyHashes: ReturnType<typeof currentAgentValidationDependencies>;
}

function progressSignature(simulation: GameSimulation): string {
  const state = simulation.state;
  const robotHealth = state.robots.reduce((sum, robot) => sum + (robot.active ? robot.health : 0), 0);
  return [
    Math.floor(state.player.x * 2), Math.floor(state.player.z * 2), Math.round(robotHealth * 10),
    state.robots.filter((robot) => robot.active).length, state.level.encounter.waveIndex,
    state.level.keyCollected, state.level.door.open, state.level.checkpoint.activated, state.level.objectiveComplete,
  ].join('|');
}

export function runCampaignLevel(levelId: PlayableLevelId, validationRunId = 'standard-live'): CampaignQaResult {
  const level = campaignLevel(levelId);
  const validation = level.agentValidation.runs.find(
    (run) => run.id === validationRunId && run.mode === 'live-agent',
  );
  if (validation === undefined) throw new Error(`${levelId} has no live validation run ${validationRunId}`);
  const difficulty = validation.difficulty.toLowerCase() as DifficultyId;
  const simulation = new GameSimulation(validation.seed, undefined, undefined, 'campaign', levelId, difficulty);
  const policy = new BaselineCampaignAgent();
  let illegalActions = 0;
  let lastProgressTick = 0;
  let maximumIdleProgressTicks = 0;
  let signature = progressSignature(simulation);
  let failure: CampaignQaFailure = null;

  while (!simulation.state.victory && !simulation.state.defeat && simulation.state.tick < validation.maxTicks) {
    try {
      const action = normalizeAgentAction(policy.next(createObservation(simulation.state)));
      simulation.step({
        forward: action.forward, strafe: action.strafe, yawDelta: action.turn, pitchDelta: action.look,
        fire: action.fire, altFire: action.altFire, weapon: action.weapon,
        sprint: action.sprint,
      });
    } catch {
      illegalActions += 1;
      failure = 'illegal-action';
      break;
    }
    const nextSignature = progressSignature(simulation);
    if (nextSignature !== signature) {
      signature = nextSignature;
      lastProgressTick = simulation.state.tick;
    }
    const idleProgressTicks = simulation.state.tick - lastProgressTick;
    maximumIdleProgressTicks = Math.max(maximumIdleProgressTicks, idleProgressTicks);
    if (idleProgressTicks >= validation.stuckTimeoutTicks) {
      failure = 'stuck';
      break;
    }
  }

  if (failure === null) {
    if (simulation.state.defeat) failure = 'defeat';
    else if (!simulation.state.victory) failure = 'tick-budget';
  }
  return {
    levelId, validationRunId: validation.id, seed: validation.seed,
    finalTick: simulation.state.tick, checksum: stateChecksum(simulation.state),
    victory: simulation.state.victory, defeat: simulation.state.defeat,
    remainingRobots: simulation.state.robots.filter((robot) => robot.active).length,
    illegalActions, maximumIdleProgressTicks, failure,
    dependencyHashes: currentAgentValidationDependencies(levelId),
  };
}

export function runPlayableCampaignQa(): readonly CampaignQaResult[] {
  return PLAYABLE_LEVELS.map((level) => runCampaignLevel(level.id as PlayableLevelId));
}
