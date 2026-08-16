import type { RenderGameState, RenderRobotState } from '../render/render-model';
import { PLAYER_EYE_HEIGHT } from '../sim/constants';
import { isWallAtWorld } from '../sim/level';
import type { PlayerCommand } from '../sim/player';

const HEAD_OFFSET = 2 * 3;
const MAX_ASSIST_DISTANCE = 14;
const MAX_INPUT_CORRECTION_RATIO = 0.35;

function normalizeAngle(value: number): number {
  let result = value;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
}

function clearAimLine(state: RenderGameState, robot: RenderRobotState): boolean {
  const deltaX = robot.x - state.player.x;
  const deltaZ = robot.z - state.player.z;
  const distance = Math.hypot(deltaX, deltaZ);
  const steps = Math.max(1, Math.ceil(distance / 0.18));
  for (let step = 1; step < steps; step += 1) {
    const amount = step / steps;
    const x = state.player.x + deltaX * amount;
    const z = state.player.z + deltaZ * amount;
    if (isWallAtWorld(x, z, state.levelId)) return false;
    if (!state.level.door.open && Math.hypot(x - state.level.door.x, z - state.level.door.z) < 0.52) return false;
    if (state.level.hazards.some((hazard) => hazard.kind === 'timed-door' && hazard.active
      && Math.abs(x - hazard.x) <= hazard.halfWidth && Math.abs(z - hazard.z) <= hazard.halfDepth)) return false;
  }
  return true;
}

function boundedCorrection(error: number, input: number, strength: number): number {
  const maximum = Math.abs(input) * MAX_INPUT_CORRECTION_RATIO;
  return Math.max(-maximum, Math.min(maximum, error * strength));
}

/**
 * Applies bounded angular slowdown/target friction to human look input only.
 * It never moves a stationary reticle, changes damage, or bypasses line of sight.
 * The returned command is the command recorded by replays and consumed by the
 * authoritative simulation, so assisted human runs remain reproducible.
 */
export function applyHumanAimAssist(
  command: PlayerCommand, state: RenderGameState | null, assistRadians: number,
): PlayerCommand {
  if (state === null || state.victory || state.defeat || assistRadians <= 0
    || Math.hypot(command.yawDelta, command.pitchDelta) < 0.000_001) return command;
  const predictedYaw = state.player.yaw + command.yawDelta;
  const predictedPitch = state.player.pitch + command.pitchDelta;
  let best: { readonly yawError: number; readonly pitchError: number; readonly error: number } | null = null;
  for (const robot of state.robots) {
    if (!robot.active || !clearAimLine(state, robot)) continue;
    const deltaX = robot.x - state.player.x;
    const deltaZ = robot.z - state.player.z;
    const distance = Math.hypot(deltaX, deltaZ);
    if (distance <= 0.001 || distance > MAX_ASSIST_DISTANCE) continue;
    const targetY = robot.body.positions[HEAD_OFFSET + 1] ?? PLAYER_EYE_HEIGHT;
    const yawError = normalizeAngle(Math.atan2(deltaX, -deltaZ) - predictedYaw);
    const pitchError = Math.atan2(targetY - PLAYER_EYE_HEIGHT, distance) - predictedPitch;
    const error = Math.hypot(yawError, pitchError);
    if (error <= assistRadians && (best === null || error < best.error)) best = { yawError, pitchError, error };
  }
  if (best === null) return command;
  const strength = 0.22 * (1 - best.error / assistRadians);
  return {
    ...command,
    yawDelta: command.yawDelta + boundedCorrection(best.yawError, command.yawDelta, strength),
    pitchDelta: command.pitchDelta + boundedCorrection(best.pitchError, command.pitchDelta, strength),
  };
}
