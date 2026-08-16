export interface RenderPlayerState {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly health: number;
  readonly energy: number;
  readonly coins: number;
  readonly bobPhase: number;
  readonly selectedWeapon: 'pulse' | 'sword' | 'bomb' | 'laser';
  readonly unlockedWeaponMask: number;
  readonly bombs: number;
  readonly swordHeat: number;
  readonly laserHeat: number;
  readonly laserOverheated: boolean;
}

export interface RenderPlayerBombState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly velocityZ: number;
  readonly fuseTicks: number;
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
  readonly combatState: 'patrol' | 'telegraph' | 'recover';
  readonly combatTicks: number;
  readonly strafeDirection: 1 | -1;
  readonly tempoBuffTicks: number;
  readonly bossPhase: 0 | 1 | 2 | 3;
  readonly body: { readonly positions: ArrayLike<number> };
}

export interface RenderProjectileState {
  readonly id: number;
  readonly ownerRobotId: number;
  readonly kind: 'slider-bolt' | 'beat-bolt' | 'fireball';
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
  readonly kind: 'key' | 'health' | 'energy' | 'coin';
  readonly x: number;
  readonly z: number;
  readonly amount: number;
  readonly active: boolean;
}

export interface RenderLevelState {
  readonly pickups: readonly RenderPickupState[];
  readonly hazards: readonly {
    readonly kind: 'conveyor' | 'timed-door';
    readonly x: number;
    readonly z: number;
    readonly halfWidth: number;
    readonly halfDepth: number;
    readonly directionX: number;
    readonly directionZ: number;
    readonly active: boolean;
  }[];
  readonly door: { readonly x: number; readonly z: number; readonly open: boolean };
  readonly checkpoint: { readonly x: number; readonly z: number; readonly activated: boolean };
  readonly exit: { readonly x: number; readonly z: number };
  readonly encounter: { readonly waveIndex: number; readonly waveCount: number; readonly pendingTicks: number };
  readonly keyCollected: boolean;
  readonly objectiveComplete: boolean;
}

export interface RenderGameState {
  readonly levelId: import('../content/level-ids').Chapter01LevelId;
  readonly tick: number;
  readonly player: RenderPlayerState;
  readonly robots: readonly RenderRobotState[];
  readonly projectiles: readonly RenderProjectileState[];
  readonly playerBombs: readonly RenderPlayerBombState[];
  readonly laserActive: boolean;
  readonly laserBeamDistance: number;
  readonly laserFocusTicks: number;
  readonly victory: boolean;
  readonly defeat: boolean;
  readonly level: RenderLevelState;
}

export interface RenderPresentationSettings {
  readonly motionScale: number;
  readonly flashScale: number;
  readonly qualityTier: import('./quality').RenderQualityTier;
}

export const DEFAULT_RENDER_PRESENTATION_SETTINGS: RenderPresentationSettings = Object.freeze({
  motionScale: 1,
  flashScale: 1,
  qualityTier: 'high',
});
