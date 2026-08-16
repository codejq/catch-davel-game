import type { AgentAction } from './api';
import { levelObservation, type AgentObservation } from './observation';

type LevelMap = ReturnType<typeof levelObservation>;
interface Cell { readonly column: number; readonly row: number }

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function worldCell(x: number, z: number, level: LevelMap): Cell {
  return {
    column: Math.floor((x - level.originX) / level.cellSize),
    row: Math.floor((z - level.originZ) / level.cellSize),
  };
}

function cellCenter(cell: Cell, level: LevelMap): { readonly x: number; readonly z: number } {
  return {
    x: level.originX + (cell.column + 0.5) * level.cellSize,
    z: level.originZ + (cell.row + 0.5) * level.cellSize,
  };
}

function key(cell: Cell): string { return `${cell.column},${cell.row}`; }

function nextPathCell(start: Cell, goal: Cell, level: LevelMap, blocked: readonly Cell[]): Cell | null {
  if (start.column === goal.column && start.row === goal.row) return goal;
  const queue: Cell[] = [start];
  const previous = new Map<string, Cell | null>([[key(start), null]]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    for (const [columnDelta, rowDelta] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const candidate = { column: current.column + columnDelta, row: current.row + rowDelta };
      const candidateKey = key(candidate);
      if (previous.has(candidateKey) || level.rows[candidate.row]?.[candidate.column] === '#') continue;
      if (blocked.some((cell) => candidate.column === cell.column && candidate.row === cell.row)
        && !(candidate.column === goal.column && candidate.row === goal.row)) continue;
      previous.set(candidateKey, current);
      if (candidate.column === goal.column && candidate.row === goal.row) {
        let step = candidate;
        let parent = previous.get(key(step));
        while (parent !== null && parent !== undefined && !(parent.column === start.column && parent.row === start.row)) {
          step = parent;
          parent = previous.get(key(step));
        }
        return step;
      }
      queue.push(candidate);
    }
  }
  return null;
}

function worldTarget(observation: AgentObservation, relativeX: number, relativeZ: number): { readonly x: number; readonly z: number } {
  return { x: observation.player.x + relativeX, z: observation.player.z + relativeZ };
}

export class BaselineCampaignAgent {
  private level = levelObservation();

  next(observation: AgentObservation): AgentAction {
    if (this.level.levelId !== observation.levelId) this.level = levelObservation(observation.levelId);
    if (observation.victory || observation.defeat) return {};
    const visible = observation.robots.filter((robot) => robot.visible)
      .sort((first, second) => first.distance - second.distance || first.id - second.id)[0];
    if (visible !== undefined) {
      const targetBearing = visible.weakPoint.active ? visible.weakPoint.bearing : visible.bearing;
      const targetElevation = visible.weakPoint.active ? visible.weakPoint.elevation : visible.elevation;
      const aligned = Math.abs(targetBearing) < 0.055 && Math.abs(targetElevation) < 0.045;
      const projectileThreat = observation.hostileProjectiles
        .filter((projectile) => Math.hypot(projectile.relativeX, projectile.relativeZ) < 4.5)
        .sort((first, second) => first.id - second.id)[0];
      const dodge = projectileThreat === undefined ? 0 : (projectileThreat.id & 1) === 0 ? 1 : -1;
      return {
        forward: visible.distance > 7 ? 0.75 : visible.distance < 2.5 ? -0.35 : 0,
        strafe: dodge,
        turn: clamp(targetBearing * 0.72, -0.2, 0.2),
        look: clamp(targetElevation * 0.72, -0.12, 0.12),
        fire: aligned,
      };
    }

    const activeHealth = observation.pickups.find((pickup) => pickup.kind === 'health' && pickup.active);
    const activeEnergy = observation.pickups.find((pickup) => pickup.kind === 'energy' && pickup.active);
    const activeKey = observation.pickups.find((pickup) => pickup.kind === 'key' && pickup.active);
    let target: { readonly x: number; readonly z: number };
    if (observation.objective.complete) {
      target = worldTarget(observation, observation.exit.relativeX, observation.exit.relativeZ);
    } else if (observation.player.health < 58 && activeHealth !== undefined) {
      target = worldTarget(observation, activeHealth.relativeX, activeHealth.relativeZ);
    } else if (activeKey !== undefined) {
      target = worldTarget(observation, activeKey.relativeX, activeKey.relativeZ);
    } else if (!observation.door.open) {
      target = worldTarget(observation, observation.door.relativeX, observation.door.relativeZ);
    } else if (!observation.checkpoint.activated) {
      target = worldTarget(observation, observation.checkpoint.relativeX, observation.checkpoint.relativeZ);
    } else if (observation.player.energy < 22 && activeEnergy !== undefined) {
      target = worldTarget(observation, activeEnergy.relativeX, activeEnergy.relativeZ);
    } else {
      const targetRobot = observation.robots.slice().sort((first, second) => first.distance - second.distance || first.id - second.id)[0];
      if (targetRobot === undefined) target = worldTarget(observation, observation.exit.relativeX, observation.exit.relativeZ);
      else target = worldTarget(observation, targetRobot.relativeX, targetRobot.relativeZ);
    }
    return this.navigate(observation, target);
  }

  private navigate(observation: AgentObservation, target: { readonly x: number; readonly z: number }): AgentAction {
    const start = { column: observation.player.cellColumn, row: observation.player.cellRow };
    const goal = worldCell(target.x, target.z, this.level);
    const doorWorld = worldTarget(observation, observation.door.relativeX, observation.door.relativeZ);
    const blockedCells = observation.door.open ? [] : [worldCell(doorWorld.x, doorWorld.z, this.level)];
    for (const hazard of observation.hazards) {
      if (hazard.kind !== 'timed-door' || !hazard.active) continue;
      const hazardWorld = worldTarget(observation, hazard.relativeX, hazard.relativeZ);
      const hazardCell = worldCell(hazardWorld.x, hazardWorld.z, this.level);
      if (hazardCell.column === start.column && hazardCell.row === start.row) continue;
      blockedCells.push(hazardCell);
    }
    const step = nextPathCell(start, goal, this.level, blockedCells);
    const waypoint = step === null || (step.column === goal.column && step.row === goal.row)
      ? target : cellCenter(step, this.level);
    const deltaX = waypoint.x - observation.player.x;
    const deltaZ = waypoint.z - observation.player.z;
    const desiredYaw = Math.atan2(deltaX, -deltaZ);
    const turn = normalizeAngle(desiredYaw - observation.player.yaw);
    return {
      forward: Math.abs(turn) < 0.48 ? 1 : 0,
      strafe: 0,
      turn: clamp(turn * 0.72, -0.2, 0.2),
      look: clamp(-observation.player.pitch, -0.12, 0.12),
      fire: false,
    };
  }
}
