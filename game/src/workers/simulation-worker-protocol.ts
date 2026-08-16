import type { PlayerCommand } from '../sim/player';
import type { SimulationSnapshotV1 } from '../sim/serialization';
import type { SnapshotPoolMetrics } from '../transport/snapshot-pool';

export interface InitializeSimulationWorker {
  readonly type: 'initialize';
  readonly seed: string;
  readonly snapshotPort: MessagePort;
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

export type SimulationWorkerRequest = InitializeSimulationWorker | StepSimulationWorker | ResetSimulationWorker | LoadSnapshotSimulationWorker;

export interface SimulationWorkerReady {
  readonly type: 'ready';
  readonly generation: number;
  readonly tick: number;
}

export interface SimulationWorkerComplete {
  readonly type: 'complete';
  readonly requestId: number;
  readonly generation: number;
  readonly tick: number;
  readonly checksum: string;
  readonly transport: SnapshotPoolMetrics;
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
