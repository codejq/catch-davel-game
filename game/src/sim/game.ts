import { createPlayer, stepPlayer, type PlayerCommand, type PlayerState } from './player';
import { createRobots, stepRobots, type RobotState } from './robots';

export interface GameState {
  tick: number;
  readonly seed: string;
  readonly player: PlayerState;
  readonly robots: RobotState[];
}

export class GameSimulation {
  readonly state: GameState;

  constructor(seed = 'first-playable-v1') {
    this.state = { tick: 0, seed, player: createPlayer(), robots: createRobots() };
  }

  step(command: PlayerCommand): void {
    stepPlayer(this.state.player, command);
    stepRobots(this.state.robots, this.state.seed);
    this.state.tick += 1;
  }
}
