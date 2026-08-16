import type { TickTimings } from '../sim/simulation';

export interface SnapshotMessage {
  readonly type: 'snapshot';
  readonly slotId: number;
  readonly tick: number;
  readonly sentAt: number;
  readonly buffer: ArrayBuffer;
  readonly timings: TickTimings;
  readonly checksum: string;
}

export interface ReturnSnapshotMessage {
  readonly type: 'return-snapshot';
  readonly slotId: number;
  readonly buffer: ArrayBuffer;
}

export interface EventBatchMessage {
  readonly type: 'event-batch';
  readonly batchSequence: number;
  readonly eventEpoch: number;
  readonly sentAt: number;
  readonly buffer: ArrayBuffer;
}

export interface EventAcknowledgementMessage {
  readonly type: 'event-ack';
  readonly highestContiguousBatchSequence: number;
}

export interface EventResyncRequestMessage {
  readonly type: 'event-resync-request';
}

export type SnapshotConsumerMessage = ReturnSnapshotMessage;
export type SnapshotProducerMessage = SnapshotMessage;
export type EventConsumerMessage = EventAcknowledgementMessage | EventResyncRequestMessage;
export type EventProducerMessage = EventBatchMessage;

