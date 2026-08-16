import type { RuntimeUiKey } from '../content/localization/runtime-ui';
import type { DecodedGameEvent } from '../transport/event-channel';

export type CaptionDirection = 'left' | 'center' | 'right';

export interface CaptionRequest {
  readonly key: RuntimeUiKey;
  readonly dedupeKey: string;
  readonly direction?: CaptionDirection;
  readonly parameters?: Readonly<Record<string, string | number>>;
}

export function relativeCaptionDirection(
  playerX: number, playerZ: number, playerYaw: number, targetX: number, targetZ: number,
): CaptionDirection {
  const deltaX = targetX - playerX;
  const deltaZ = targetZ - playerZ;
  const distance = Math.hypot(deltaX, deltaZ);
  if (distance < 0.001) return 'center';
  const rightDot = (Math.cos(playerYaw) * deltaX + Math.sin(playerYaw) * deltaZ) / distance;
  if (rightDot < -0.28) return 'left';
  if (rightDot > 0.28) return 'right';
  return 'center';
}

export function relativeThreatBearing(
  playerX: number, playerZ: number, playerYaw: number, targetX: number, targetZ: number,
): number {
  const deltaX = targetX - playerX;
  const deltaZ = targetZ - playerZ;
  const distance = Math.hypot(deltaX, deltaZ);
  if (distance < 0.001) return 0;
  const rightDot = (Math.cos(playerYaw) * deltaX + Math.sin(playerYaw) * deltaZ) / distance;
  const forwardDot = (Math.sin(playerYaw) * deltaX - Math.cos(playerYaw) * deltaZ) / distance;
  return Math.atan2(rightDot, forwardDot);
}

export function captionForEvent(
  event: DecodedGameEvent, direction: CaptionDirection = 'center',
): CaptionRequest | null {
  switch (event.type) {
    case 'pulse-fired': return { key: 'captionPulse', dedupeKey: 'player-weapon' };
    case 'sword-swung': return { key: 'captionSword', dedupeKey: 'player-weapon' };
    case 'sword-charged': return { key: 'captionChargedSword', dedupeKey: 'player-weapon' };
    case 'projectile-deflected': return { key: 'captionDeflect', dedupeKey: 'deflect' };
    case 'bomb-thrown': return { key: 'captionBombThrown', dedupeKey: 'player-weapon' };
    case 'laser-fired': return { key: 'captionLaser', dedupeKey: 'player-weapon' };
    case 'robot-hit': return { key: 'captionHitConfirmed', dedupeKey: `robot-hit-${event.robotId ?? 0}`, direction };
    case 'robot-telegraph': return { key: 'captionAttackCharging', dedupeKey: `robot-attack-${event.robotId ?? 0}`, direction };
    case 'robot-fired': return { key: 'captionIncoming', dedupeKey: `robot-attack-${event.robotId ?? 0}`, direction };
    case 'robot-melee': return { key: 'captionMelee', dedupeKey: `robot-attack-${event.robotId ?? 0}`, direction };
    case 'player-hit': return { key: 'captionPlayerHit', dedupeKey: 'player-hit', direction };
    default: return null;
  }
}
