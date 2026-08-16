import type { AudioCue } from '../audio/procedural-audio';
import type { Chapter01LevelId } from '../content/level-ids';
import type { RenderRobotState } from '../render/render-model';
import { ROBOT_DEFINITIONS, type RobotArchetype } from '../sim/robots';

export const DAVEL_MOVEMENT_AUDIO_MAX_REQUESTS = 3;
export const DAVEL_MOVEMENT_AUDIO_RANGE = 14;

export type DavelMovementAudioCue = Extract<AudioCue,
  | 'wobble-step' | 'slider-step' | 'spinner-step'
  | 'firemouth-step' | 'dj-step' | 'overlord-step'>;

export const DAVEL_MOVEMENT_AUDIO_CUES: Readonly<Record<RobotArchetype, DavelMovementAudioCue>> = {
  'wobble-scout': 'wobble-step',
  'blue-slider': 'slider-step',
  'yellow-spinner': 'spinner-step',
  'red-firemouth': 'firemouth-step',
  'cyan-dj': 'dj-step',
  'invoice-overlord': 'overlord-step',
};

const STEPS_PER_DANCE_UNIT: Readonly<Record<RobotArchetype, number>> = {
  'wobble-scout': 1.15,
  'blue-slider': 1.45,
  'yellow-spinner': 1.75,
  'red-firemouth': 0.9,
  'cyan-dj': 1.5,
  'invoice-overlord': 0.72,
};

type MovementRobot = Pick<RenderRobotState, 'id' | 'x' | 'z' | 'active' | 'danceTime'>;

export interface DavelMovementAudioSnapshot {
  readonly levelId: Chapter01LevelId;
  readonly tick: number;
  readonly player: { readonly x: number; readonly z: number };
  readonly robots: readonly MovementRobot[];
  readonly victory: boolean;
  readonly defeat: boolean;
}

export interface DavelMovementAudioRequest {
  readonly cue: DavelMovementAudioCue;
  readonly robotId: number;
  readonly gainScale: number;
}

interface Candidate extends DavelMovementAudioRequest {
  readonly distanceSquared: number;
}

/**
 * Converts already-authoritative dance phases into bounded presentation cues.
 * It deliberately consumes inaudible/disabled beats and never catches up, so a
 * coalesced snapshot, pause, or resync cannot create a sound burst.
 */
export class DavelMovementAudioSequencer {
  private readonly beatByRobot = new Map<number, number>();
  private levelId: Chapter01LevelId | null = null;
  private lastTick = -1;

  reset(): void {
    this.beatByRobot.clear();
    this.levelId = null;
    this.lastTick = -1;
  }

  sample(state: DavelMovementAudioSnapshot, enabled = true): readonly DavelMovementAudioRequest[] {
    if (this.levelId !== state.levelId || state.tick < this.lastTick) this.reset();
    if (state.tick === this.lastTick) return [];
    this.levelId = state.levelId;
    this.lastTick = state.tick;

    const present = new Set<number>();
    const candidates: Candidate[] = [];
    const canEmit = enabled && !state.victory && !state.defeat;
    const rangeSquared = DAVEL_MOVEMENT_AUDIO_RANGE * DAVEL_MOVEMENT_AUDIO_RANGE;
    for (const robot of state.robots) {
      if (!robot.active) continue;
      const definition = ROBOT_DEFINITIONS[robot.id];
      if (definition === undefined) continue;
      present.add(robot.id);
      const beat = Math.floor(robot.danceTime * STEPS_PER_DANCE_UNIT[definition.archetype]);
      const previousBeat = this.beatByRobot.get(robot.id);
      this.beatByRobot.set(robot.id, beat);
      if (!canEmit || previousBeat === undefined || beat <= previousBeat) continue;

      const deltaX = robot.x - state.player.x;
      const deltaZ = robot.z - state.player.z;
      const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;
      if (distanceSquared >= rangeSquared) continue;
      const proximity = 1 - Math.sqrt(distanceSquared) / DAVEL_MOVEMENT_AUDIO_RANGE;
      candidates.push({
        cue: DAVEL_MOVEMENT_AUDIO_CUES[definition.archetype],
        robotId: robot.id,
        gainScale: 0.58 * Math.pow(proximity, 0.8),
        distanceSquared,
      });
    }
    for (const robotId of this.beatByRobot.keys()) {
      if (!present.has(robotId)) this.beatByRobot.delete(robotId);
    }

    return candidates
      .sort((left, right) => left.distanceSquared - right.distanceSquared || left.robotId - right.robotId)
      .slice(0, DAVEL_MOVEMENT_AUDIO_MAX_REQUESTS)
      .map(({ cue, robotId, gainScale }) => ({ cue, robotId, gainScale }));
  }
}
