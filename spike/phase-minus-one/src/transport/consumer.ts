import { EventConsumerQueue, type DecodedEvent } from './event-channel';
import type {
  EventAcknowledgementMessage,
  EventProducerMessage,
  EventResyncRequestMessage,
  ReturnSnapshotMessage,
  SnapshotProducerMessage,
} from './messages';
import { SnapshotConsumerCopies, type ConsumedSnapshot } from './snapshot-pool';

export interface TransportConsumerCallbacks {
  readonly onSnapshot: (snapshot: ConsumedSnapshot, message: SnapshotProducerMessage) => void;
  readonly onEvent?: (event: DecodedEvent) => void;
  readonly onTransportStats?: (stats: TransportConsumerStats) => void;
}

export interface TransportConsumerStats {
  readonly snapshotTick: number;
  readonly snapshotLatencyMs: number;
  readonly queuedEvents: number;
  readonly presentationDrops: number;
  readonly eventEpoch: number;
}

export class TransportConsumer {
  private readonly snapshots = new SnapshotConsumerCopies();
  private readonly events = new EventConsumerQueue();
  private highestAcknowledgedBatchSequence = 0;

  constructor(
    private readonly snapshotPort: MessagePort,
    private readonly eventPort: MessagePort,
    private readonly callbacks: TransportConsumerCallbacks,
  ) {
    snapshotPort.onmessage = (event: MessageEvent<SnapshotProducerMessage>) => this.receiveSnapshot(event.data);
    eventPort.onmessage = (event: MessageEvent<EventProducerMessage>) => this.receiveEvents(event.data);
    snapshotPort.start();
    eventPort.start();
  }

  close(): void {
    this.snapshotPort.close();
    this.eventPort.close();
  }

  private receiveSnapshot(message: SnapshotProducerMessage): void {
    if (message.type !== 'snapshot') return;
    const snapshot = this.snapshots.consume(message.tick, message.buffer);
    const header = new Uint32Array(snapshot.current.buffer, snapshot.current.byteOffset, 16);
    const eventEpoch = header[10]!;
    const resyncRequired = header[11] === 1;
    let acknowledgement: number;
    if (resyncRequired) {
      acknowledgement = this.events.consumeResyncSnapshot(eventEpoch);
    } else {
      acknowledgement = this.events.presentThrough(message.tick, (event) => this.callbacks.onEvent?.(event));
    }
    this.acknowledge(acknowledgement);
    this.callbacks.onSnapshot(snapshot, message);

    const returned: ReturnSnapshotMessage = {
      type: 'return-snapshot',
      slotId: message.slotId,
      buffer: message.buffer,
    };
    this.snapshotPort.postMessage(returned, [message.buffer]);

    const eventMetrics = this.events.metrics();
    this.callbacks.onTransportStats?.({
      snapshotTick: message.tick,
      snapshotLatencyMs: Math.max(0, performance.timeOrigin + performance.now() - message.sentAt),
      queuedEvents: eventMetrics.queuedRecords,
      presentationDrops: eventMetrics.presentationDrops,
      eventEpoch: eventMetrics.eventEpoch,
    });
  }

  private receiveEvents(message: EventProducerMessage): void {
    if (message.type !== 'event-batch') return;
    this.events.receive(message.buffer);
    this.acknowledge(this.events.acknowledgementReady());
    if (this.events.takeResyncRequest()) {
      const request: EventResyncRequestMessage = { type: 'event-resync-request' };
      this.eventPort.postMessage(request);
    }
  }

  private acknowledge(highestContiguousBatchSequence: number): void {
    if (highestContiguousBatchSequence <= this.highestAcknowledgedBatchSequence) return;
    this.highestAcknowledgedBatchSequence = highestContiguousBatchSequence;
    const acknowledgement: EventAcknowledgementMessage = {
      type: 'event-ack',
      highestContiguousBatchSequence,
    };
    this.eventPort.postMessage(acknowledgement);
  }
}
