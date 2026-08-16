import type { GameEvent } from '../sim/game';

export const EVENT_RECORD_BYTES = 24;
export const EVENT_BATCH_HEADER_BYTES = 32;
export const EVENT_TRANSPORT_CONTRACT_VERSION = 2;

export const EVENT_CLASS = { presentationOnly: 0, stateCritical: 1 } as const;
export type EventClass = typeof EVENT_CLASS[keyof typeof EVENT_CLASS];

export const EVENT_KIND = {
  pulseFired: 1,
  robotHit: 2,
  robotDefeated: 3,
  robotFired: 4,
  playerHit: 5,
  victory: 6,
  defeat: 7,
  keyCollected: 8,
  healthCollected: 9,
  energyCollected: 10,
  doorOpened: 11,
  checkpointActivated: 12,
  objectiveComplete: 13,
  exitUnlocked: 14,
  swordSwung: 15,
  swordCharged: 16,
  projectileDeflected: 17,
  bombThrown: 18,
  bombDetonated: 19,
  laserFired: 20,
  robotTelegraph: 21,
  robotMelee: 22,
  robotBuff: 23,
  bossPhase: 24,
  coinCollected: 25,
  ambushTriggered: 26,
} as const;

export interface EventTransportConfig {
  readonly queueRecordCap: number;
  readonly queueByteCap: number;
  readonly batchRecordCap: number;
  readonly batchByteCap: number;
  readonly creditWindow: number;
}

export const EVENT_TRANSPORT_CONFIG: EventTransportConfig = {
  queueRecordCap: 256,
  queueByteCap: 64 * 1024,
  batchRecordCap: 64,
  batchByteCap: 16 * 1024,
  creditWindow: 1,
};

export interface EncodedEventBatch {
  readonly batchSequence: number;
  readonly eventEpoch: number;
  readonly recordCount: number;
  readonly buffer: ArrayBuffer;
}

export interface DecodedGameEvent extends GameEvent {
  readonly eventId: number;
  readonly eventClass: EventClass;
  readonly batchSequence: number;
  readonly lastInBatch: boolean;
}

interface QueuedEvent {
  readonly tick: number;
  readonly eventId: number;
  readonly eventClass: EventClass;
  readonly kind: number;
  readonly robotId: number;
  readonly value: number;
}

function validateConfig(config: EventTransportConfig): void {
  const values = [config.queueRecordCap, config.queueByteCap, config.batchRecordCap, config.batchByteCap, config.creditWindow];
  if (values.some((value) => !Number.isSafeInteger(value) || value <= 0)) throw new Error('Event transport capacities must be positive integers');
  if (config.creditWindow > 4) throw new Error('Event credit window may not exceed four');
}

function capacity(records: number, bytes: number): number {
  return Math.min(records, Math.floor(bytes / EVENT_RECORD_BYTES));
}

function encodeKind(event: GameEvent): { readonly kind: number; readonly eventClass: EventClass } {
  switch (event.type) {
    case 'pulse-fired': return { kind: EVENT_KIND.pulseFired, eventClass: EVENT_CLASS.presentationOnly };
    case 'sword-swung': return { kind: EVENT_KIND.swordSwung, eventClass: EVENT_CLASS.presentationOnly };
    case 'sword-charged': return { kind: EVENT_KIND.swordCharged, eventClass: EVENT_CLASS.presentationOnly };
    case 'projectile-deflected': return { kind: EVENT_KIND.projectileDeflected, eventClass: EVENT_CLASS.presentationOnly };
    case 'bomb-thrown': return { kind: EVENT_KIND.bombThrown, eventClass: EVENT_CLASS.presentationOnly };
    case 'bomb-detonated': return { kind: EVENT_KIND.bombDetonated, eventClass: EVENT_CLASS.presentationOnly };
    case 'laser-fired': return { kind: EVENT_KIND.laserFired, eventClass: EVENT_CLASS.presentationOnly };
    case 'robot-telegraph': return { kind: EVENT_KIND.robotTelegraph, eventClass: EVENT_CLASS.presentationOnly };
    case 'robot-melee': return { kind: EVENT_KIND.robotMelee, eventClass: EVENT_CLASS.presentationOnly };
    case 'robot-buff': return { kind: EVENT_KIND.robotBuff, eventClass: EVENT_CLASS.presentationOnly };
    case 'boss-phase': return { kind: EVENT_KIND.bossPhase, eventClass: EVENT_CLASS.stateCritical };
    case 'robot-fired': return { kind: EVENT_KIND.robotFired, eventClass: EVENT_CLASS.presentationOnly };
    case 'robot-hit': return { kind: EVENT_KIND.robotHit, eventClass: EVENT_CLASS.stateCritical };
    case 'robot-defeated': return { kind: EVENT_KIND.robotDefeated, eventClass: EVENT_CLASS.stateCritical };
    case 'player-hit': return { kind: EVENT_KIND.playerHit, eventClass: EVENT_CLASS.stateCritical };
    case 'victory': return { kind: EVENT_KIND.victory, eventClass: EVENT_CLASS.stateCritical };
    case 'defeat': return { kind: EVENT_KIND.defeat, eventClass: EVENT_CLASS.stateCritical };
    case 'key-collected': return { kind: EVENT_KIND.keyCollected, eventClass: EVENT_CLASS.stateCritical };
    case 'health-collected': return { kind: EVENT_KIND.healthCollected, eventClass: EVENT_CLASS.stateCritical };
    case 'energy-collected': return { kind: EVENT_KIND.energyCollected, eventClass: EVENT_CLASS.stateCritical };
    case 'coin-collected': return { kind: EVENT_KIND.coinCollected, eventClass: EVENT_CLASS.stateCritical };
    case 'door-opened': return { kind: EVENT_KIND.doorOpened, eventClass: EVENT_CLASS.stateCritical };
    case 'checkpoint-activated': return { kind: EVENT_KIND.checkpointActivated, eventClass: EVENT_CLASS.stateCritical };
    case 'objective-complete': return { kind: EVENT_KIND.objectiveComplete, eventClass: EVENT_CLASS.stateCritical };
    case 'exit-unlocked': return { kind: EVENT_KIND.exitUnlocked, eventClass: EVENT_CLASS.stateCritical };
    case 'ambush-triggered': return { kind: EVENT_KIND.ambushTriggered, eventClass: EVENT_CLASS.presentationOnly };
  }
}

function decodeKind(kind: number): GameEvent['type'] {
  switch (kind) {
    case EVENT_KIND.pulseFired: return 'pulse-fired';
    case EVENT_KIND.robotHit: return 'robot-hit';
    case EVENT_KIND.robotDefeated: return 'robot-defeated';
    case EVENT_KIND.robotFired: return 'robot-fired';
    case EVENT_KIND.playerHit: return 'player-hit';
    case EVENT_KIND.victory: return 'victory';
    case EVENT_KIND.defeat: return 'defeat';
    case EVENT_KIND.keyCollected: return 'key-collected';
    case EVENT_KIND.healthCollected: return 'health-collected';
    case EVENT_KIND.energyCollected: return 'energy-collected';
    case EVENT_KIND.coinCollected: return 'coin-collected';
    case EVENT_KIND.doorOpened: return 'door-opened';
    case EVENT_KIND.checkpointActivated: return 'checkpoint-activated';
    case EVENT_KIND.objectiveComplete: return 'objective-complete';
    case EVENT_KIND.exitUnlocked: return 'exit-unlocked';
    case EVENT_KIND.swordSwung: return 'sword-swung';
    case EVENT_KIND.swordCharged: return 'sword-charged';
    case EVENT_KIND.projectileDeflected: return 'projectile-deflected';
    case EVENT_KIND.bombThrown: return 'bomb-thrown';
    case EVENT_KIND.bombDetonated: return 'bomb-detonated';
    case EVENT_KIND.laserFired: return 'laser-fired';
    case EVENT_KIND.robotTelegraph: return 'robot-telegraph';
    case EVENT_KIND.robotMelee: return 'robot-melee';
    case EVENT_KIND.robotBuff: return 'robot-buff';
    case EVENT_KIND.bossPhase: return 'boss-phase';
    case EVENT_KIND.ambushTriggered: return 'ambush-triggered';
    default: throw new Error(`Unknown event kind ${kind}`);
  }
}

export class EventProducerChannel {
  private readonly queueCapacity: number;
  private readonly batchCapacity: number;
  private readonly pending: QueuedEvent[] = [];
  private readonly inFlight = new Set<number>();
  private nextBatchSequence = 1;
  private nextEventId = 1;
  private epoch = 0;
  private resyncRequired = false;
  private presentationDrops = 0;
  private stateCriticalResyncs = 0;
  private coalescedResyncRequests = 0;

  constructor(private readonly config: EventTransportConfig = EVENT_TRANSPORT_CONFIG) {
    validateConfig(config);
    this.queueCapacity = capacity(config.queueRecordCap, config.queueByteCap);
    this.batchCapacity = capacity(config.batchRecordCap, config.batchByteCap);
    if (this.queueCapacity < 1 || this.batchCapacity < 1) throw new Error('Event byte cap cannot hold one record');
  }

  enqueue(events: readonly GameEvent[]): void {
    for (const event of events) {
      const encoded = encodeKind(event);
      if (this.pending.length >= this.queueCapacity && !this.makeRoom(encoded.eventClass)) continue;
      this.pending.push({
        tick: event.tick,
        eventId: this.nextEventId++,
        eventClass: encoded.eventClass,
        kind: encoded.kind,
        robotId: event.robotId ?? -1,
        value: event.coins ?? event.value ?? 0,
      });
    }
  }

  createBatch(): EncodedEventBatch | null {
    if (this.pending.length === 0 || this.inFlight.size >= this.config.creditWindow) return null;
    const records = this.pending.splice(0, this.batchCapacity);
    const batchSequence = this.nextBatchSequence++;
    const buffer = new ArrayBuffer(EVENT_BATCH_HEADER_BYTES + records.length * EVENT_RECORD_BYTES);
    const header = new DataView(buffer, 0, EVENT_BATCH_HEADER_BYTES);
    header.setUint32(0, EVENT_TRANSPORT_CONTRACT_VERSION, true);
    header.setUint32(4, this.epoch, true);
    header.setUint32(8, batchSequence, true);
    header.setUint32(12, records.length, true);
    const view = new DataView(buffer);
    for (let index = 0; index < records.length; index += 1) {
      const event = records[index]!;
      const offset = EVENT_BATCH_HEADER_BYTES + index * EVENT_RECORD_BYTES;
      view.setUint8(offset, event.eventClass);
      view.setUint8(offset + 1, event.kind);
      view.setInt16(offset + 2, event.robotId, true);
      view.setUint32(offset + 4, event.tick, true);
      view.setUint32(offset + 8, event.eventId, true);
      view.setInt32(offset + 12, event.value, true);
    }
    this.inFlight.add(batchSequence);
    return { batchSequence, eventEpoch: this.epoch, recordCount: records.length, buffer };
  }

  acknowledge(highestContiguousBatchSequence: number): void {
    for (const sequence of this.inFlight) if (sequence <= highestContiguousBatchSequence) this.inFlight.delete(sequence);
  }

  requestResync(): void {
    if (this.resyncRequired) this.coalescedResyncRequests += 1;
    else this.forceResync();
  }

  snapshotMetadata(): { readonly eventEpoch: number; readonly eventHighWatermark: number; readonly resyncRequired: boolean } {
    return { eventEpoch: this.epoch, eventHighWatermark: this.nextEventId - 1, resyncRequired: this.resyncRequired };
  }

  markSnapshotPublished(): void { this.resyncRequired = false; }

  metrics(): {
    readonly pendingRecords: number;
    readonly pendingBytes: number;
    readonly inFlightBatches: number;
    readonly presentationDrops: number;
    readonly stateCriticalResyncs: number;
    readonly coalescedResyncRequests: number;
    readonly eventEpoch: number;
  } {
    return {
      pendingRecords: this.pending.length,
      pendingBytes: this.pending.length * EVENT_RECORD_BYTES,
      inFlightBatches: this.inFlight.size,
      presentationDrops: this.presentationDrops,
      stateCriticalResyncs: this.stateCriticalResyncs,
      coalescedResyncRequests: this.coalescedResyncRequests,
      eventEpoch: this.epoch,
    };
  }

  private makeRoom(incomingClass: EventClass): boolean {
    const presentationIndex = this.pending.findIndex((event) => event.eventClass === EVENT_CLASS.presentationOnly);
    if (presentationIndex >= 0) {
      this.pending.splice(presentationIndex, 1);
      this.presentationDrops += 1;
      return true;
    }
    if (incomingClass === EVENT_CLASS.presentationOnly) {
      this.presentationDrops += 1;
      return false;
    }
    this.forceResync();
    return false;
  }

  private forceResync(): void {
    this.epoch += 1;
    this.pending.length = 0;
    this.resyncRequired = true;
    this.stateCriticalResyncs += 1;
  }
}

export class EventConsumerQueue {
  private readonly queueCapacity: number;
  private readonly records: DecodedGameEvent[] = [];
  private readonly receivedEventIds = new Set<number>();
  private readonly presentedBatches = new Set<number>();
  private epoch = 0;
  private highestContiguousAcknowledgement = 0;
  private highestReceivedBatch = 0;
  private presentationDrops = 0;
  private resyncRequested = false;
  private resyncRequestSent = false;

  constructor(config: EventTransportConfig = EVENT_TRANSPORT_CONFIG) {
    validateConfig(config);
    this.queueCapacity = capacity(config.queueRecordCap, config.queueByteCap);
  }

  receive(buffer: ArrayBuffer): void {
    if (buffer.byteLength < EVENT_BATCH_HEADER_BYTES) throw new Error('Event batch header is truncated');
    const header = new DataView(buffer, 0, EVENT_BATCH_HEADER_BYTES);
    if (header.getUint32(0, true) !== EVENT_TRANSPORT_CONTRACT_VERSION) throw new Error('Unsupported event batch version');
    const eventEpoch = header.getUint32(4, true);
    const batchSequence = header.getUint32(8, true);
    const recordCount = header.getUint32(12, true);
    if (buffer.byteLength !== EVENT_BATCH_HEADER_BYTES + recordCount * EVENT_RECORD_BYTES) throw new Error('Event batch byte length mismatch');
    this.highestReceivedBatch = Math.max(this.highestReceivedBatch, batchSequence);
    if (eventEpoch < this.epoch) return;
    if (eventEpoch > this.epoch) this.beginEpoch(eventEpoch);
    const view = new DataView(buffer);
    for (let index = 0; index < recordCount; index += 1) {
      const offset = EVENT_BATCH_HEADER_BYTES + index * EVENT_RECORD_BYTES;
      const eventId = view.getUint32(offset + 8, true);
      if (this.receivedEventIds.has(eventId)) continue;
      this.receivedEventIds.add(eventId);
      const eventClass = view.getUint8(offset) as EventClass;
      const robotId = view.getInt16(offset + 2, true);
      const value = view.getInt32(offset + 12, true);
      const type = decodeKind(view.getUint8(offset + 1));
      const event: DecodedGameEvent = {
        tick: view.getUint32(offset + 4, true),
        type,
        ...(robotId < 0 ? {} : { robotId }),
        ...(value === 0 ? {} : type === 'robot-defeated' ? { coins: value } : { value }),
        eventId,
        eventClass,
        batchSequence,
        lastInBatch: index === recordCount - 1,
      };
      if (!this.pushBounded(event)) break;
    }
  }

  presentThrough(snapshotTick: number, present: (event: DecodedGameEvent) => void): number {
    while (this.records.length > 0 && this.records[0]!.tick <= snapshotTick) {
      const event = this.records.shift()!;
      if (!this.resyncRequested) present(event);
      if (event.lastInBatch) this.markBatchPresented(event.batchSequence);
    }
    return this.highestContiguousAcknowledgement;
  }

  takeResyncRequest(): boolean {
    if (!this.resyncRequested || this.resyncRequestSent) return false;
    this.resyncRequestSent = true;
    return true;
  }

  consumeResyncSnapshot(eventEpoch: number): number {
    this.beginEpoch(eventEpoch);
    this.highestContiguousAcknowledgement = this.highestReceivedBatch;
    return this.highestContiguousAcknowledgement;
  }

  metrics(): { readonly queuedRecords: number; readonly presentationDrops: number; readonly resyncRequested: boolean; readonly eventEpoch: number } {
    return { queuedRecords: this.records.length, presentationDrops: this.presentationDrops, resyncRequested: this.resyncRequested, eventEpoch: this.epoch };
  }

  private pushBounded(event: DecodedGameEvent): boolean {
    if (this.records.length < this.queueCapacity) {
      this.insertOrdered(event);
      return true;
    }
    const presentationIndex = this.records.findIndex((record) => record.eventClass === EVENT_CLASS.presentationOnly);
    if (presentationIndex >= 0) {
      this.records.splice(presentationIndex, 1);
      this.presentationDrops += 1;
      this.insertOrdered(event);
      return true;
    }
    if (event.eventClass === EVENT_CLASS.presentationOnly) {
      this.presentationDrops += 1;
      return true;
    }
    this.records.length = 0;
    this.resyncRequested = true;
    return false;
  }

  private insertOrdered(event: DecodedGameEvent): void {
    const index = this.records.findIndex((record) => record.tick > event.tick || (record.tick === event.tick && record.eventId > event.eventId));
    if (index < 0) this.records.push(event);
    else this.records.splice(index, 0, event);
  }

  private markBatchPresented(sequence: number): void {
    this.presentedBatches.add(sequence);
    while (this.presentedBatches.delete(this.highestContiguousAcknowledgement + 1)) this.highestContiguousAcknowledgement += 1;
  }

  private beginEpoch(eventEpoch: number): void {
    this.epoch = eventEpoch;
    this.records.length = 0;
    this.receivedEventIds.clear();
    this.presentedBatches.clear();
    this.resyncRequested = false;
    this.resyncRequestSent = false;
  }
}
