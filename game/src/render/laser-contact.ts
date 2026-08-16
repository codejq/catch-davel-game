export interface LaserContactPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface LaserContactSparkSegment {
  readonly start: LaserContactPoint;
  readonly end: LaserContactPoint;
  readonly radius: number;
}

function boundedUnit(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function laserContactSparkSegment(
  contact: LaserContactPoint,
  beamDirection: LaserContactPoint,
  tick: number,
  sparkIndex: number,
  motionScale: number,
  focusTicks: number,
): LaserContactSparkSegment {
  const motion = boundedUnit(motionScale);
  const focus = Math.max(0, Math.min(1, Number.isFinite(focusTicks) ? focusTicks / 90 : 0));
  const stablePhase = sparkIndex * 2.399963 + focus * 0.31;
  const phase = stablePhase + tick * 0.37 * motion;
  const horizontalLength = Math.max(0.001, Math.hypot(beamDirection.x, beamDirection.z));
  const right = { x: -beamDirection.z / horizontalLength, y: 0, z: beamDirection.x / horizontalLength };
  const up = {
    x: -right.z * beamDirection.y,
    y: right.z * beamDirection.x - right.x * beamDirection.z,
    z: right.x * beamDirection.y,
  };
  const direction = {
    x: right.x * Math.cos(phase) + up.x * Math.sin(phase),
    y: right.y * Math.cos(phase) + up.y * Math.sin(phase),
    z: right.z * Math.cos(phase) + up.z * Math.sin(phase),
  };
  const pulse = 0.5 + Math.sin(tick * 0.71 + sparkIndex * 1.17) * 0.5 * motion;
  const length = 0.24 + focus * 0.1 + pulse * 0.14;
  const inset = 0.08;
  return {
    start: {
      x: contact.x + direction.x * inset,
      y: Math.max(0.04, contact.y + direction.y * inset),
      z: contact.z + direction.z * inset,
    },
    end: {
      x: contact.x + direction.x * length,
      y: Math.max(0.04, contact.y + direction.y * length),
      z: contact.z + direction.z * length,
    },
    radius: 0.022 + focus * 0.01,
  };
}
