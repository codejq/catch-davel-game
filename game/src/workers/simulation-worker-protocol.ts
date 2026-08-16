import type { PlayerCommand } from '../sim/player';
import type { SimulationSnapshotV1 } from '../sim/serialization';
import type { SnapshotPoolMetrics } from '../transport/snapshot-pool';
import type { EventProducerChannel } from '../transport/event-channel';

export interface InitializeSimulationWorker {
  readonly type: 'initialize';
  readonly seed: string;
  readonly snapshotPort: MessagePort;
  readonly eventPort: MessagePort;
  readonly mode?: 'manual' | 'realtime';
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
}

export interface SetSimulationWorkerMode {
  readonly type: 'set-mode';
  readonly requestId: number;
  readonly mode: 'manual' | 'realtime';
}

export type SimulationWorkerRequest = InitializeSimulationWorker | StepSimulationWorker | ResetSimulationWorker
  | LoadSnapshotSimulationWorker | InputSimulationWorker | SetSimulationWorkerMode;

export interface SimulationWorkerReady {
  readonly type: 'ready';
  readonly generation: number;
  readonly tick: number;
  readonly mode: 'manual' | 'realtime';
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
}

export interface SimulationWorkerFailure {
  readonly type: 'failure';
  readonly requestId: number | null;
  readonly message: string;
}

export type SimulationWorkerResponse = SimulationWorkerReady | SimulationWorkerComplete | SimulationWorkerFailure;

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
