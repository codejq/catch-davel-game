import { assertApprovedScenarioConstants } from './constants';
import { checksumState } from './checksum';
import { stepCombatAndEconomy } from './combat';
import { EventBuffer } from './events';
import { stepHazards } from './hazards';
import { updateNavigationAndPoseTargets } from './navigation';
import { NavigationWorkspace } from './pathfinding';
import { stepPhysics } from './physics/xpbd';
import { stepProjectiles } from './projectiles';
import { createScenario } from './scenario';
import { SnapshotWriter } from './snapshot';
import type { SimulationState } from './state';

export interface TickTimings {
  navigationMs: number;
  physicsMs: number;
  combatProjectilesHazardsMs: number;
  eventsObjectivesEconomyMs: number;
  snapshotMs: number;
  wholeTickMs: number;
}

export interface StepResult {
  readonly tick: number;
  readonly checksum: string;
  readonly snapshot: ArrayBuffer;
  readonly eventCount: number;
  readonly eventBytes: number;
  readonly timings: TickTimings;
}

export type MonotonicClock = () => number;

const disabledInstrumentationClock: MonotonicClock = () => 0;

export class Simulation {
  readonly state: SimulationState;
  readonly events = new EventBuffer();
  readonly snapshotWriter = new SnapshotWriter();
  private readonly navigationWorkspace = new NavigationWorkspace();
  private readonly clock: MonotonicClock;

  constructor(seed = 'phase-minus-one-v1', clock: MonotonicClock = disabledInstrumentationClock) {
    assertApprovedScenarioConstants();
    this.state = createScenario(seed);
    this.clock = clock;
    this.snapshotWriter.write(this.state, this.events);
  }

  step(): StepResult {
    const wholeStart = this.clock();
    this.events.reset();

    const navigationStart = this.clock();
    updateNavigationAndPoseTargets(this.state, this.navigationWorkspace);
    const physicsStart = this.clock();
    stepPhysics(this.state);
    const combatStart = this.clock();
    stepProjectiles(this.state, this.events);
    stepHazards(this.state, this.events);
    const eventStart = this.clock();
    stepCombatAndEconomy(this.state, this.events);
    const snapshotStart = this.clock();
    this.state.tick += 1;
    const snapshot = this.snapshotWriter.write(this.state, this.events);
    const end = this.clock();

    return {
      tick: this.state.tick,
      checksum: checksumState(this.state),
      snapshot,
      eventCount: this.events.count,
      eventBytes: this.events.byteLength,
      timings: {
        navigationMs: physicsStart - navigationStart,
        physicsMs: combatStart - physicsStart,
        combatProjectilesHazardsMs: eventStart - combatStart,
        eventsObjectivesEconomyMs: snapshotStart - eventStart,
        snapshotMs: end - snapshotStart,
        wholeTickMs: end - wholeStart,
      },
    };
  }

  checksum(): string {
    return checksumState(this.state);
  }
}
