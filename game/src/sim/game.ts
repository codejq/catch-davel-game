import { createPlayer, stepPlayer, type PlayerCommand, type PlayerState } from './player';

export interface GameState {
  tick: number;
  readonly seed: string;
  readonly player: PlayerState;
}

export class GameSimulation {
  readonly state: GameState;

  constructor(seed = 'first-playable-v1') {
    this.state = { tick: 0, seed, player: createPlayer() };
  }

  step(command: PlayerCommand): void {
    stepPlayer(this.state.player, command);
    this.state.tick += 1;
  }
}
