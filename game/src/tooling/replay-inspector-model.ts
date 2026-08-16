import {
  currentReplayDependencies, parseReplay, serializeReplay, verifyReplay,
  type ReplayDependencyHashes, type ReplayFileV1,
} from '../replay/replay';
import type { WeaponId } from '../sim/weapons';

export interface ReplayDependencyInspection {
  readonly name: keyof ReplayDependencyHashes;
  readonly recorded: string;
  readonly current: string;
  readonly matches: boolean;
}

export interface ReplayInspection {
  readonly replay: ReplayFileV1;
  readonly canonicalJson: string;
  readonly verified: boolean;
  readonly verificationError: string | null;
  readonly dependenciesCurrent: boolean;
  readonly dependencies: readonly ReplayDependencyInspection[];
  readonly initialTick: number;
  readonly finalTick: number;
  readonly ticksPlayed: number;
  readonly commandRunCount: number;
  readonly compressionRatio: number;
  readonly checksumCount: number;
  readonly declaredFinalChecksum: string;
  readonly verifiedFinalChecksum: string | null;
  readonly movementTicks: number;
  readonly fireTicks: number;
  readonly weaponSelectionTicks: Readonly<Record<WeaponId, number>>;
}

export function inspectReplay(value: string | ReplayFileV1): ReplayInspection {
  const replay = typeof value === 'string' ? parseReplay(value) : parseReplay(serializeReplay(value));
  const currentDependencies = currentReplayDependencies(replay.levelId);
  const dependencies = (Object.keys(currentDependencies) as (keyof ReplayDependencyHashes)[]).map((name) => ({
    name, recorded: replay.dependencyHashes[name], current: currentDependencies[name],
    matches: replay.dependencyHashes[name] === currentDependencies[name],
  }));
  let verifiedFinalChecksum: string | null = null;
  let verificationError: string | null = null;
  try {
    verifiedFinalChecksum = verifyReplay(replay).finalChecksum;
  } catch (error) {
    verificationError = error instanceof Error ? error.message : String(error);
  }
  const initialTick = replay.initialSnapshot.tick;
  const finalTick = replay.checksums.at(-1)!.tick;
  const ticksPlayed = finalTick - initialTick;
  const weaponSelectionTicks: Record<WeaponId, number> = { pulse: 0, sword: 0, bomb: 0, laser: 0 };
  let movementTicks = 0;
  let fireTicks = 0;
  let selectedWeapon = replay.initialSnapshot.player.selectedWeapon;
  for (const run of replay.commandRuns) {
    if (run.command.weapon !== null && run.command.weapon !== undefined) selectedWeapon = run.command.weapon;
    weaponSelectionTicks[selectedWeapon] += run.ticks;
    if (run.command.forward !== 0 || run.command.strafe !== 0) movementTicks += run.ticks;
    if (run.command.fire) fireTicks += run.ticks;
  }
  return {
    replay, canonicalJson: serializeReplay(replay),
    verified: verificationError === null, verificationError,
    dependenciesCurrent: dependencies.every((entry) => entry.matches), dependencies,
    initialTick, finalTick, ticksPlayed,
    commandRunCount: replay.commandRuns.length,
    compressionRatio: replay.commandRuns.length === 0 ? 0 : ticksPlayed / replay.commandRuns.length,
    checksumCount: replay.checksums.length,
    declaredFinalChecksum: replay.checksums.at(-1)!.checksum,
    verifiedFinalChecksum,
    movementTicks, fireTicks, weaponSelectionTicks,
  };
}
