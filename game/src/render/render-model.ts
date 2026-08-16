export interface RenderPlayerState {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly health: number;
  readonly energy: number;
  readonly coins: number;
  readonly bobPhase: number;
}

export interface RenderRobotState {
  readonly id: number;
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly health: number;
  readonly active: boolean;
  readonly hitFlashTicks: number;
  readonly danceTime: number;
  readonly body: { readonly positions: ArrayLike<number> };
}

export interface RenderProjectileState {
  readonly id: number;
  readonly ownerRobotId: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly velocityZ: number;
  readonly lifeTicks: number;
}

export interface RenderPickupState {
  readonly id: string;
  readonly kind: 'key' | 'health' | 'energy';
  readonly x: number;
  readonly z: number;
  readonly amount: number;
  readonly active: boolean;
}

export interface RenderLevelState {
  readonly pickups: readonly RenderPickupState[];
  readonly door: { readonly x: number; readonly z: number; readonly open: boolean };
  readonly checkpoint: { readonly x: number; readonly z: number; readonly activated: boolean };
  readonly exit: { readonly x: number; readonly z: number };
  readonly keyCollected: boolean;
  readonly objectiveComplete: boolean;
}

export interface RenderGameState {
  readonly tick: number;
  readonly player: RenderPlayerState;
  readonly robots: readonly RenderRobotState[];
  readonly projectiles: readonly RenderProjectileState[];
  readonly victory: boolean;
  readonly defeat: boolean;
  readonly level: RenderLevelState;
}
