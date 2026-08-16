import {
  PROVISIONAL_BATCH_BYTE_CAP,
  PROVISIONAL_BATCH_RECORD_CAP,
  PROVISIONAL_CREDIT_WINDOW,
  PROVISIONAL_EVENT_BYTE_CAP,
  PROVISIONAL_EVENT_RECORD_CAP,
} from '../sim/constants';
import { EVENT_RECORD_BYTES, EventBuffer, EventClass } from '../sim/events';

const BATCH_HEADER_BYTES = 32;

export interface EventTransportConfig {
  readonly queueRecordCap: number;
  readonly queueByteCap: number;
  readonly batchRecordCap: number;
  readonly batchByteCap: number;
  readonly creditWindow: number;
}

export const PROVISIONAL_EVENT_TRANSPORT_CONFIG: EventTransportConfig = {
  queueRecordCap: PROVISIONAL_EVENT_RECORD_CAP,
  queueByteCap: PROVISIONAL_EVENT_BYTE_CAP,
  batchRecordCap: PROVISIONAL_BATCH_RECORD_CAP,
  batchByteCap: PROVISIONAL_BATCH_BYTE_CAP,
  creditWindow: PROVISIONAL_CREDIT_WINDOW,
};

export interface EncodedEventBatch {
  readonly batchSequence: number;
  readonly eventEpoch: number;
  readonly recordCount: number;
  readonly buffer: ArrayBuffer;
}

export interface EventProducerMetrics {
  readonly pendingRecords: number;
  readonly pendingBytes: number;
  readonly inFlightBatches: number;
  readonly presentationDrops: number;
  readonly stateCriticalResyncs: number;
  readonly coalescedResyncRequests: number;
  readonly eventEpoch: number;
}

interface PendingArrays {
  readonly eventClass: Uint8Array;
  readonly kind: Uint8Array;
  readonly tick: Uint32Array;
  readonly eventSequence: Uint32Array;
  readonly robotId: Uint8Array;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly value: Float32Array;
}

function validateConfig(config: EventTransportConfig): void {
  const values = [
    config.queueRecordCap,
    config.queueByteCap,
    config.batchRecordCap,
    config.batchByteCap,
    config.creditWindow,
  ];
  if (values.some((value) => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error('Event transport capacities must be positive integers');
  }
  if (config.creditWindow > 4) throw new Error('Event transport credit window may not exceed four');
}

function effectiveRecordCap(recordCap: number, byteCap: number): number {
  return Math.min(recordCap, Math.floor(byteCap / EVENT_RECORD_BYTES));
}

export class EventProducerChannel {
  private readonly config: EventTransportConfig;
  private readonly queueCapacity: number;
  private readonly batchCapacity: number;
  private readonly pending: PendingArrays;
  private readonly inFlight = new Map<number, number>();
  private head = 0;
  private count = 0;
  private nextBatchSequence = 1;
  private eventEpochValue = 0;
  private presentationDropCount = 0;
  private stateCriticalResyncCount = 0;
  private coalescedResyncRequestCount = 0;
  private resyncRequired = false;

  constructor(config: EventTransportConfig = PROVISIONAL_EVENT_TRANSPORT_CONFIG) {
    validateConfig(config);
    this.config = config;
    this.queueCapacity = effectiveRecordCap(config.queueRecordCap, config.queueByteCap);
    this.batchCapacity = effectiveRecordCap(config.batchRecordCap, config.batchByteCap);
    if (this.queueCapacity < 1 || this.batchCapacity < 1) throw new Error('Event byte caps cannot hold one record');
    this.pending = {
      eventClass: new Uint8Array(this.queueCapacity),
      kind: new Uint8Array(this.queueCapacity),
      tick: new Uint32Array(this.queueCapacity),
      eventSequence: new Uint32Array(this.queueCapacity),
      robotId: new Uint8Array(this.queueCapacity),
      x: new Float32Array(this.queueCapacity),
      y: new Float32Array(this.queueCapacity),
      z: new Float32Array(this.queueCapacity),
      value: new Float32Array(this.queueCapacity),
    };
  }

  get eventEpoch(): number {
    return this.eventEpochValue;
  }

  enqueue(source: EventBuffer): void {
    for (let sourceIndex = 0; sourceIndex < source.count; sourceIndex += 1) {
      const eventClass = source.eventClass[sourceIndex]!;
      if (this.count >= this.queueCapacity && !this.makeRoom(eventClass)) continue;
      const targetIndex = (this.head + this.count) % this.queueCapacity;
      this.pending.eventClass[targetIndex] = eventClass;
      this.pending.kind[targetIndex] = source.kind[sourceIndex]!;
      this.pending.tick[targetIndex] = source.tick[sourceIndex]!;
      this.pending.eventSequence[targetIndex] = source.sequence[sourceIndex]!;
      this.pending.robotId[targetIndex] = source.robotId[sourceIndex]!;
      this.pending.x[targetIndex] = source.x[sourceIndex]!;
      this.pending.y[targetIndex] = source.y[sourceIndex]!;
      this.pending.z[targetIndex] = source.z[sourceIndex]!;
      this.pending.value[targetIndex] = source.value[sourceIndex]!;
      this.count += 1;
    }
  }

  createBatch(): EncodedEventBatch | null {
    if (this.count === 0 || this.inFlight.size >= this.config.creditWindow) return null;
    const recordCount = Math.min(this.count, this.batchCapacity);
    const batchSequence = this.nextBatchSequence++;
    const buffer = new ArrayBuffer(BATCH_HEADER_BYTES + recordCount * EVENT_RECORD_BYTES);
    const header = new Uint32Array(buffer, 0, BATCH_HEADER_BYTES / Uint32Array.BYTES_PER_ELEMENT);
    header[0] = 1;
    header[1] = this.eventEpochValue;
    header[2] = batchSequence;
    header[3] = recordCount;
    const view = new DataView(buffer);
    for (let logicalIndex = 0; logicalIndex < recordCount; logicalIndex += 1) {
      const queueIndex = (this.head + logicalIndex) % this.queueCapacity;
      const offset = BATCH_HEADER_BYTES + logicalIndex * EVENT_RECORD_BYTES;
      view.setUint8(offset, this.pending.eventClass[queueIndex]!);
      view.setUint8(offset + 1, this.pending.kind[queueIndex]!);
      view.setUint8(offset + 2, this.pending.robotId[queueIndex]!);
      view.setUint32(offset + 4, this.pending.tick[queueIndex]!, true);
      view.setUint32(offset + 8, this.pending.eventSequence[queueIndex]!, true);
      view.setFloat32(offset + 12, this.pending.value[queueIndex]!, true);
      view.setFloat32(offset + 16, this.pending.x[queueIndex]!, true);
      view.setFloat32(offset + 20, this.pending.y[queueIndex]!, true);
      view.setFloat32(offset + 24, this.pending.z[queueIndex]!, true);
    }
    this.head = (this.head + recordCount) % this.queueCapacity;
    this.count -= recordCount;
    this.inFlight.set(batchSequence, this.eventEpochValue);
    return { batchSequence, eventEpoch: this.eventEpochValue, recordCount, buffer };
  }

  acknowledge(highestContiguousBatchSequence: number): void {
    for (const batchSequence of this.inFlight.keys()) {
      if (batchSequence <= highestContiguousBatchSequence) this.inFlight.delete(batchSequence);
    }
  }

  requestResync(): void {
    if (this.resyncRequired) {
      this.coalescedResyncRequestCount += 1;
      return;
    }
    this.forceResync();
  }

  snapshotResyncMetadata(): { eventEpoch: number; resyncRequired: boolean } {
    return { eventEpoch: this.eventEpochValue, resyncRequired: this.resyncRequired };
  }

  markSnapshotPublished(): void {
    this.resyncRequired = false;
  }

  metrics(): EventProducerMetrics {
    return {
      pendingRecords: this.count,
      pendingBytes: this.count * EVENT_RECORD_BYTES,
      inFlightBatches: this.inFlight.size,
      presentationDrops: this.presentationDropCount,
      stateCriticalResyncs: this.stateCriticalResyncCount,
      coalescedResyncRequests: this.coalescedResyncRequestCount,
      eventEpoch: this.eventEpochValue,
    };
  }

  private makeRoom(incomingClass: number): boolean {
    let presentationLogicalIndex = -1;
    for (let logicalIndex = 0; logicalIndex < this.count; logicalIndex += 1) {
      const queueIndex = (this.head + logicalIndex) % this.queueCapacity;
      if (this.pending.eventClass[queueIndex] === EventClass.PresentationOnly) {
        presentationLogicalIndex = logicalIndex;
        break;
      }
    }
    if (presentationLogicalIndex >= 0) {
      this.removeAt(presentationLogicalIndex);
      this.presentationDropCount += 1;
      return true;
    }
    if (incomingClass === EventClass.PresentationOnly) {
      this.presentationDropCount += 1;
      return false;
    }
    this.forceResync();
    return false;
  }

  private forceResync(): void {
    this.eventEpochValue += 1;
    this.head = 0;
    this.count = 0;
    this.resyncRequired = true;
    this.stateCriticalResyncCount += 1;
  }

  private removeAt(logicalIndex: number): void {
    for (let index = logicalIndex; index < this.count - 1; index += 1) {
      const target = (this.head + index) % this.queueCapacity;
      const source = (this.head + index + 1) % this.queueCapacity;
      this.copyRecord(source, target);
    }
    this.count -= 1;
  }

  private copyRecord(source: number, target: number): void {
    this.pending.eventClass[target] = this.pending.eventClass[source]!;
    this.pending.kind[target] = this.pending.kind[source]!;
    this.pending.tick[target] = this.pending.tick[source]!;
    this.pending.eventSequence[target] = this.pending.eventSequence[source]!;
    this.pending.robotId[target] = this.pending.robotId[source]!;
    this.pending.x[target] = this.pending.x[source]!;
    this.pending.y[target] = this.pending.y[source]!;
    this.pending.z[target] = this.pending.z[source]!;
    this.pending.value[target] = this.pending.value[source]!;
  }
}

export interface DecodedEvent {
  readonly eventClass: EventClass;
  readonly kind: number;
  readonly tick: number;
  readonly eventSequence: number;
  readonly robotId: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly value: number;
  readonly batchSequence: number;
  readonly lastInBatch: boolean;
}

export class EventConsumerQueue {
  private readonly records: DecodedEvent[] = [];
  private readonly capacity: number;
  private epoch = 0;
  private highestReceivedBatch = 0;
  private highestAcknowledgedBatch = 0;
  private presentationDrops = 0;
  private resyncRequested = false;
  private resyncRequestSent = false;

  constructor(config: EventTransportConfig = PROVISIONAL_EVENT_TRANSPORT_CONFIG) {
    validateConfig(config);
    this.capacity = effectiveRecordCap(config.queueRecordCap, config.queueByteCap);
  }

  receive(batch: ArrayBuffer): void {
    if (batch.byteLength < BATCH_HEADER_BYTES) throw new Error('Event batch header is truncated');
    const header = new Uint32Array(batch, 0, BATCH_HEADER_BYTES / Uint32Array.BYTES_PER_ELEMENT);
    const eventEpoch = header[1]!;
    const batchSequence = header[2]!;
    const recordCount = header[3]!;
    if (batch.byteLength !== BATCH_HEADER_BYTES + recordCount * EVENT_RECORD_BYTES) {
      throw new Error('Event batch byte length does not match its record count');
    }
    this.highestReceivedBatch = Math.max(this.highestReceivedBatch, batchSequence);
    if (eventEpoch < this.epoch) {
      this.highestAcknowledgedBatch = this.highestReceivedBatch;
      return;
    }
    if (eventEpoch > this.epoch) {
      this.records.length = 0;
      this.epoch = eventEpoch;
    }
    const view = new DataView(batch);
    for (let index = 0; index < recordCount; index += 1) {
      const offset = BATCH_HEADER_BYTES + index * EVENT_RECORD_BYTES;
      const event: DecodedEvent = {
        eventClass: view.getUint8(offset) as EventClass,
        kind: view.getUint8(offset + 1),
        robotId: view.getUint8(offset + 2),
        tick: view.getUint32(offset + 4, true),
        eventSequence: view.getUint32(offset + 8, true),
        value: view.getFloat32(offset + 12, true),
        x: view.getFloat32(offset + 16, true),
        y: view.getFloat32(offset + 20, true),
        z: view.getFloat32(offset + 24, true),
        batchSequence,
        lastInBatch: index === recordCount - 1,
      };
      if (!this.pushBounded(event)) break;
    }
  }

  presentThrough(snapshotTick: number, present: (event: DecodedEvent) => void): number {
    while (this.records.length > 0 && this.records[0]!.tick <= snapshotTick) {
      const event = this.records.shift()!;
      if (!this.resyncRequested) present(event);
      if (event.lastInBatch) this.highestAcknowledgedBatch = event.batchSequence;
    }
    return this.highestAcknowledgedBatch;
  }

  takeResyncRequest(): boolean {
    if (!this.resyncRequested || this.resyncRequestSent) return false;
    this.resyncRequestSent = true;
    return true;
  }

  acknowledgementReady(): number {
    return this.highestAcknowledgedBatch;
  }

  consumeResyncSnapshot(eventEpoch: number): number {
    this.epoch = eventEpoch;
    this.records.length = 0;
    this.resyncRequested = false;
    this.resyncRequestSent = false;
    this.highestAcknowledgedBatch = this.highestReceivedBatch;
    return this.highestAcknowledgedBatch;
  }

  metrics(): { queuedRecords: number; presentationDrops: number; resyncRequested: boolean; eventEpoch: number } {
    return {
      queuedRecords: this.records.length,
      presentationDrops: this.presentationDrops,
      resyncRequested: this.resyncRequested,
      eventEpoch: this.epoch,
    };
  }

  private pushBounded(event: DecodedEvent): boolean {
    if (this.records.length < this.capacity) {
      this.records.push(event);
      return true;
    }
    const presentationIndex = this.records.findIndex(
      (record) => record.eventClass === EventClass.PresentationOnly,
    );
    if (presentationIndex >= 0) {
      this.records.splice(presentationIndex, 1);
      this.presentationDrops += 1;
      this.records.push(event);
      return true;
    }
    if (event.eventClass === EventClass.PresentationOnly) {
      this.presentationDrops += 1;
      return true;
    }
    this.records.length = 0;
    this.resyncRequested = true;
    return false;
  }
}
