import type { PlayableLevelId } from '../content/level-ids';
import type { RenderProjectileState } from '../render/render-model';
import { PLAYER_EYE_HEIGHT, PLAYER_RADIUS } from '../sim/constants';

export const PROJECTILE_NEAR_MISS_MAX_REQUESTS = 2;
export const PROJECTILE_NEAR_MISS_MAX_DISTANCE = 1.35;

type NearMissProjectile = Pick<RenderProjectileState,
  'id' | 'kind' | 'x' | 'y' | 'z' | 'velocityX' | 'velocityY' | 'velocityZ'>;

export interface ProjectileNearMissSnapshot {
  readonly levelId: PlayableLevelId;
  readonly tick: number;
  readonly player: { readonly x: number; readonly z: number };
  readonly projectiles: readonly NearMissProjectile[];
  readonly victory: boolean;
  readonly defeat: boolean;
}

export interface ProjectileNearMissRequest {
  readonly cue: 'projectile-near-miss';
  readonly projectileId: number;
  readonly kind: NearMissProjectile['kind'];
  readonly x: number;
  readonly z: number;
  readonly gainScale: number;
  readonly pitchScale: number;
  readonly distance: number;
}

interface TrackedProjectile {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly playerX: number;
  readonly playerZ: number;
  reported: boolean;
}

interface Candidate extends ProjectileNearMissRequest {}

const PROJECTILE_RADIUS: Readonly<Record<NearMissProjectile['kind'], number>> = {
  'slider-bolt': 0.18,
  'beat-bolt': 0.18,
  fireball: 0.34,
};

const PROJECTILE_PITCH: Readonly<Record<NearMissProjectile['kind'], number>> = {
  'slider-bolt': 1.18,
  'beat-bolt': 1.05,
  fireball: 0.82,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Finds live hostile projectiles that have crossed their closest point beside
 * the player. The tracker is presentation-only, bounded by the active
 * projectile pool, and consumes suppressed passes so visibility/resume cannot
 * create a stale audio burst.
 */
export class ProjectileNearMissTracker {
  private readonly tracked = new Map<number, TrackedProjectile>();
  private levelId: PlayableLevelId | null = null;
  private lastTick = -1;

  reset(): void {
    this.tracked.clear();
    this.levelId = null;
    this.lastTick = -1;
  }

  sample(state: ProjectileNearMissSnapshot, enabled = true): readonly ProjectileNearMissRequest[] {
    if (this.levelId !== state.levelId || state.tick < this.lastTick) this.reset();
    if (state.tick === this.lastTick) return [];
    this.levelId = state.levelId;
    this.lastTick = state.tick;

    const present = new Set<number>();
    const candidates: Candidate[] = [];
    const canEmit = enabled && !state.victory && !state.defeat;
    for (const projectile of state.projectiles) {
      present.add(projectile.id);
      const previous = this.tracked.get(projectile.id);
      const current: TrackedProjectile = {
        x: projectile.x,
        y: projectile.y,
        z: projectile.z,
        playerX: state.player.x,
        playerZ: state.player.z,
        reported: previous?.reported ?? false,
      };
      this.tracked.set(projectile.id, current);
      if (previous === undefined || previous.reported) continue;

      const startX = previous.x - previous.playerX;
      const startZ = previous.z - previous.playerZ;
      const endX = projectile.x - state.player.x;
      const endZ = projectile.z - state.player.z;
      const deltaX = endX - startX;
      const deltaZ = endZ - startZ;
      const travelSquared = deltaX * deltaX + deltaZ * deltaZ;
      if (travelSquared <= 0.000001) continue;

      const closestProgress = clamp01(-(startX * deltaX + startZ * deltaZ) / travelSquared);
      if (closestProgress >= 0.999) continue;
      const closestX = startX + deltaX * closestProgress;
      const closestZ = startZ + deltaZ * closestProgress;
      const distance = Math.hypot(closestX, closestZ);
      const clearance = PLAYER_RADIUS + PROJECTILE_RADIUS[projectile.kind] + 0.06;
      const closestY = previous.y + (projectile.y - previous.y) * closestProgress;
      const dangerousHeight = closestY > 0.15
        && closestY < PLAYER_EYE_HEIGHT + PROJECTILE_RADIUS[projectile.kind];
      if (distance > PROJECTILE_NEAR_MISS_MAX_DISTANCE || distance < clearance || !dangerousHeight) continue;

      current.reported = true;
      if (!canEmit) continue;
      const proximity = 1 - (distance - clearance) / (PROJECTILE_NEAR_MISS_MAX_DISTANCE - clearance);
      candidates.push({
        cue: 'projectile-near-miss',
        projectileId: projectile.id,
        kind: projectile.kind,
        x: previous.x + (projectile.x - previous.x) * closestProgress,
        z: previous.z + (projectile.z - previous.z) * closestProgress,
        gainScale: 0.34 + clamp01(proximity) * 0.34,
        pitchScale: PROJECTILE_PITCH[projectile.kind],
        distance,
      });
    }
    for (const projectileId of this.tracked.keys()) {
      if (!present.has(projectileId)) this.tracked.delete(projectileId);
    }

    return candidates
      .sort((left, right) => left.distance - right.distance || left.projectileId - right.projectileId)
      .slice(0, PROJECTILE_NEAR_MISS_MAX_REQUESTS);
  }
}
