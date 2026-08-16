import type { PlayerCommand } from '../sim/player';
import type { SimulationSnapshotV1 } from '../sim/serialization';
import type { SnapshotPoolMetrics } from '../transport/snapshot-pool';
import type { EventProducerChannel } from '../transport/event-channel';
import type { AgentObservation } from '../agent/observation';
import type { ReplayFile } from '../replay/replay';
import type { WeaponId, WeaponUpgradeLevels } from '../sim/weapons';
import type { EncounterId } from '../sim/robots';
import type { Chapter01LevelId } from '../content/levels/chapter-01';
import type { RunMetrics } from '../sim/run-metrics';
import type { DifficultyId } from '../sim/difficulty';
import type { PlayerUpgradeLevels } from '../sim/player-upgrades';

export interface InitializeSimulationWorker {
  readonly type: 'initialize';
  readonly seed: string;
  readonly levelId?: Chapter01LevelId;
  readonly snapshotPort: MessagePort;
  readonly eventPort: MessagePort;
  readonly mode?: 'manual' | 'realtime';
  readonly initialCoins?: number;
  readonly unlockedWeaponMask?: number;
  readonly weaponUpgrades?: WeaponUpgradeLevels;
  readonly playerUpgrades?: PlayerUpgradeLevels;
  readonly encounter?: EncounterId;
  readonly difficulty?: DifficultyId;
}

export interface StepSimulationWorker {
  readonly type: 'step';
  readonly requestId: number;
  readonly command: PlayerCommand;
  readonly ticks: number;
}

export interface ResetSimulationWorker {
  readonly type: 'reset';
  readonly requestId: number;
  readonly seed: string;
  readonly levelId?: Chapter01LevelId;
  readonly initialCoins?: number;
  readonly agentRun?: boolean;
  readonly unlockedWeaponMask?: number;
  readonly weaponUpgrades?: WeaponUpgradeLevels;
  readonly playerUpgrades?: PlayerUpgradeLevels;
  readonly encounter?: EncounterId;
  readonly difficulty?: DifficultyId;
}

export interface LoadSnapshotSimulationWorker {
  readonly type: 'load-snapshot';
  readonly requestId: number;
  readonly snapshot: SimulationSnapshotV1;
}

export interface InputSimulationWorker {
  readonly type: 'input';
  readonly sequence: number;
  readonly forward: number;
  readonly strafe: number;
  readonly yawDelta: number;
  readonly pitchDelta: number;
  readonly fire: boolean;
  readonly altFire: boolean;
  readonly sprint: boolean;
  readonly weapon: WeaponId | null;
}

export interface SetSimulationWorkerMode {
  readonly type: 'set-mode';
  readonly requestId: number;
  readonly mode: 'manual' | 'realtime';
  readonly agentRun?: boolean;
}

export interface SaveReplaySimulationWorker {
  readonly type: 'save-replay';
  readonly requestId: number;
}

export interface LoadReplaySimulationWorker {
  readonly type: 'load-replay';
  readonly requestId: number;
  readonly replay: ReplayFile | string;
}

export interface GetStatusSimulationWorker {
  readonly type: 'get-status';
  readonly requestId: number;
}

export interface GetCheckpointSimulationWorker {
  readonly type: 'get-checkpoint';
  readonly requestId: number;
}

export type SimulationWorkerRequest = InitializeSimulationWorker | StepSimulationWorker | ResetSimulationWorker
  | LoadSnapshotSimulationWorker | InputSimulationWorker | SetSimulationWorkerMode
  | SaveReplaySimulationWorker | LoadReplaySimulationWorker | GetStatusSimulationWorker | GetCheckpointSimulationWorker;

export interface SimulationWorkerReady {
  readonly type: 'ready';
  readonly generation: number;
  readonly tick: number;
  readonly mode: 'manual' | 'realtime';
  readonly observation: AgentObservation;
}

export interface SimulationWorkerComplete {
  readonly type: 'complete';
  readonly requestId: number;
  readonly generation: number;
  readonly tick: number;
  readonly mode: 'manual' | 'realtime';
  readonly checksum: string;
  readonly transport: SnapshotPoolMetrics;
  readonly events: ReturnType<EventProducerChannel['metrics']>;
  readonly observation: AgentObservation;
  readonly commandRuns: number;
  readonly checksumRecords: number;
  readonly runMetrics: RunMetrics;
}

export interface SimulationWorkerReplay {
  readonly type: 'replay';
  readonly requestId: number;
  readonly replay: ReplayFile;
}

export interface SimulationWorkerCheckpoint {
  readonly type: 'checkpoint';
  readonly requestId: number;
  readonly snapshot: SimulationSnapshotV1 | null;
}

export interface SimulationWorkerFailure {
  readonly type: 'failure';
  readonly requestId: number | null;
  readonly message: string;
}

export type SimulationWorkerResponse = SimulationWorkerReady | SimulationWorkerComplete | SimulationWorkerReplay
  | SimulationWorkerCheckpoint | SimulationWorkerFailure;

export interface WorkerSnapshotMessage {
  readonly type: 'snapshot';
  readonly generation: number;
  readonly slotId: number;
  readonly tick: number;
  readonly sentAt: number;
  readonly buffer: ArrayBuffer;
}

export interface WorkerReturnSnapshotMessage {
  readonly type: 'return-snapshot';
  readonly generation: number;
  readonly slotId: number;
  readonly buffer: ArrayBuffer;
}

export interface WorkerEventBatchMessage {
  readonly type: 'event-batch';
  readonly generation: number;
  readonly batchSequence: number;
  readonly eventEpoch: number;
  readonly sentAt: number;
  readonly buffer: ArrayBuffer;
}

export type WorkerEventConsumerMessage = {
  readonly type: 'event-ack';
  readonly generation: number;
  readonly highestContiguousBatchSequence: number;
} | {
  readonly type: 'event-resync-request';
  readonly generation: number;
};
