import type { AgentObservation } from '../agent/observation';
import type { ReplayFileV1 } from '../replay/replay';
import type { PlayerCommand } from '../sim/player';
import type { SimulationSnapshotV1 } from '../sim/serialization';
import type { RenderGameState } from '../render/render-model';
import { decodeRenderSnapshot } from '../transport/render-snapshot';
import { EventConsumerQueue, type DecodedGameEvent } from '../transport/event-channel';
import { SnapshotConsumerCopies } from '../transport/snapshot-pool';
import type {
  SimulationWorkerCheckpoint, SimulationWorkerComplete, SimulationWorkerReady, SimulationWorkerReplay, SimulationWorkerRequest,
  SimulationWorkerResponse, WorkerEventBatchMessage, WorkerEventConsumerMessage,
  WorkerReturnSnapshotMessage, WorkerSnapshotMessage,
} from '../workers/simulation-worker-protocol';

export interface SimulationWorkerClientCallbacks {
  readonly onSnapshot: (state: RenderGameState, latencyMs: number) => void;
  readonly onEvent: (event: DecodedGameEvent) => void;
  readonly onResync: (state: RenderGameState) => void;
  readonly onError: (error: Error) => void;
}

export interface SimulationWorkerClientOptions {
  readonly seed: string;
  readonly initialCoins: number;
  readonly mode?: 'manual' | 'realtime';
  readonly callbacks: SimulationWorkerClientCallbacks;
}

type RequestResponse = SimulationWorkerComplete | SimulationWorkerReplay | SimulationWorkerCheckpoint;

interface PendingRequest {
  readonly expectedType: RequestResponse['type'];
  readonly resolve: (response: RequestResponse) => void;
  readonly reject: (error: Error) => void;
}

export class SimulationWorkerClient {
  private readonly worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' });
  private readonly snapshotChannel = new MessageChannel();
  private readonly eventChannel = new MessageChannel();
  private snapshotCopies = new SnapshotConsumerCopies();
  private eventQueue = new EventConsumerQueue();
  private readonly pending = new Map<number, PendingRequest>();
  private readonly readyPromise: Promise<SimulationWorkerReady>;
  private resolveReady!: (ready: SimulationWorkerReady) => void;
  private rejectReady!: (error: Error) => void;
  private nextRequestId = 1;
  private inputSequence = 0;
  private generation = 0;
  private lastAcknowledgement = 0;
  private latestStateValue: RenderGameState | null = null;
  private latestObservationValue: AgentObservation | null = null;
  private latestCompleteValue: SimulationWorkerComplete | null = null;
  private modeValue: 'manual' | 'realtime';

  private constructor(private readonly options: SimulationWorkerClientOptions) {
    this.modeValue = options.mode ?? 'realtime';
    this.readyPromise = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => this.receiveControl(event.data);
    this.worker.onerror = (event) => this.fail(new Error(event.message || 'Simulation Worker failed'));
    this.snapshotChannel.port2.onmessage = (event: MessageEvent<WorkerSnapshotMessage>) => this.receiveSnapshot(event.data);
    this.eventChannel.port2.onmessage = (event: MessageEvent<WorkerEventBatchMessage>) => this.receiveEventBatch(event.data);
    this.snapshotChannel.port2.start();
    this.eventChannel.port2.start();
    this.worker.postMessage({
      type: 'initialize', seed: options.seed, initialCoins: options.initialCoins, mode: this.modeValue,
      snapshotPort: this.snapshotChannel.port1, eventPort: this.eventChannel.port1,
    } satisfies SimulationWorkerRequest, [this.snapshotChannel.port1, this.eventChannel.port1]);
  }

  static async create(options: SimulationWorkerClientOptions): Promise<SimulationWorkerClient> {
    const client = new SimulationWorkerClient(options);
    await client.readyPromise;
    return client;
  }

  get latestState(): RenderGameState {
    if (this.latestStateValue === null) throw new Error('Simulation Worker has not delivered its first snapshot');
    return this.latestStateValue;
  }

  get latestObservation(): AgentObservation {
    if (this.latestObservationValue === null) throw new Error('Simulation Worker has not delivered an observation');
    return this.latestObservationValue;
  }

  get latestMetrics(): SimulationWorkerComplete | null { return this.latestCompleteValue; }
  get mode(): 'manual' | 'realtime' { return this.modeValue; }

  sendInput(command: PlayerCommand): void {
    this.worker.postMessage({
      type: 'input', sequence: ++this.inputSequence,
      forward: command.forward, strafe: command.strafe,
      yawDelta: command.yawDelta, pitchDelta: command.pitchDelta, fire: command.fire,
    } satisfies SimulationWorkerRequest);
  }

  async setMode(mode: 'manual' | 'realtime', agentRun = false): Promise<SimulationWorkerComplete> {
    const response = await this.requestComplete({ type: 'set-mode', requestId: 0, mode, agentRun });
    this.modeValue = response.mode;
    return response;
  }

  step(command: PlayerCommand, ticks: number): Promise<SimulationWorkerComplete> {
    return this.requestComplete({ type: 'step', requestId: 0, command, ticks });
  }

  reset(seed: string, initialCoins: number, agentRun: boolean): Promise<SimulationWorkerComplete> {
    return this.requestComplete({ type: 'reset', requestId: 0, seed, initialCoins, agentRun });
  }

  loadSnapshot(snapshot: SimulationSnapshotV1): Promise<SimulationWorkerComplete> {
    return this.requestComplete({ type: 'load-snapshot', requestId: 0, snapshot });
  }

  getStatus(): Promise<SimulationWorkerComplete> {
    return this.requestComplete({ type: 'get-status', requestId: 0 });
  }

  async saveReplay(): Promise<ReplayFileV1> {
    const requestId = this.nextRequestId++;
    const response = await this.request({ type: 'save-replay', requestId }, 'replay');
    return (response as SimulationWorkerReplay).replay;
  }

  async loadReplay(replay: ReplayFileV1 | string): Promise<SimulationWorkerComplete> {
    return this.requestComplete({ type: 'load-replay', requestId: 0, replay });
  }

  async getCheckpoint(): Promise<SimulationSnapshotV1 | null> {
    const requestId = this.nextRequestId++;
    const response = await this.request({ type: 'get-checkpoint', requestId }, 'checkpoint');
    return (response as SimulationWorkerCheckpoint).snapshot;
  }

  terminate(): void {
    const error = new Error('Simulation Worker client terminated');
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
    this.snapshotChannel.port2.close();
    this.eventChannel.port2.close();
    this.worker.terminate();
  }

  private requestComplete(request: SimulationWorkerRequest & { requestId: number }): Promise<SimulationWorkerComplete> {
    const requestId = this.nextRequestId++;
    return this.request({ ...request, requestId } as SimulationWorkerRequest, 'complete') as Promise<SimulationWorkerComplete>;
  }

  private request(request: SimulationWorkerRequest, expectedType: RequestResponse['type']): Promise<RequestResponse> {
    const requestId = 'requestId' in request ? request.requestId : 0;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { expectedType, resolve, reject });
      this.worker.postMessage(request);
    });
  }

  private receiveControl(response: SimulationWorkerResponse): void {
    if (response.type === 'ready') {
      this.beginGeneration(response.generation);
      this.modeValue = response.mode;
      this.latestObservationValue = response.observation;
      this.resolveReady(response);
      return;
    }
    if (response.type === 'failure') {
      const error = new Error(response.message);
      if (response.requestId === null) this.options.callbacks.onError(error);
      else {
        this.pending.get(response.requestId)?.reject(error);
        this.pending.delete(response.requestId);
      }
      return;
    }
    const pending = this.pending.get(response.requestId);
    if (pending === undefined) {
      this.options.callbacks.onError(new Error(`Unexpected Worker response ${response.type} for request ${response.requestId}`));
      return;
    }
    this.pending.delete(response.requestId);
    if (pending.expectedType !== response.type) {
      pending.reject(new Error(`Expected Worker ${pending.expectedType}, received ${response.type}`));
      return;
    }
    if (response.type === 'complete') {
      if (response.generation !== this.generation) this.beginGeneration(response.generation);
      this.modeValue = response.mode;
      this.latestObservationValue = response.observation;
      this.latestCompleteValue = response;
    }
    pending.resolve(response);
  }

  private receiveSnapshot(message: WorkerSnapshotMessage): void {
    if (message.generation < this.generation) return;
    if (message.generation !== this.generation) this.beginGeneration(message.generation);
    const snapshot = this.snapshotCopies.consume(message.tick, message.buffer);
    const decoded = decodeRenderSnapshot(snapshot.current);
    this.latestStateValue = decoded.state;
    if (decoded.metadata.resyncRequired) {
      const acknowledgement = this.eventQueue.consumeResyncSnapshot(decoded.metadata.eventEpoch);
      this.sendEventAcknowledgement(acknowledgement);
      this.options.callbacks.onResync(decoded.state);
    }
    this.presentEvents(decoded.state.tick);
    this.options.callbacks.onSnapshot(decoded.state, Math.max(0, performance.timeOrigin + performance.now() - message.sentAt));
    const returned: WorkerReturnSnapshotMessage = {
      type: 'return-snapshot', generation: message.generation, slotId: message.slotId, buffer: message.buffer,
    };
    this.snapshotChannel.port2.postMessage(returned, [message.buffer]);
  }

  private receiveEventBatch(message: WorkerEventBatchMessage): void {
    if (message.generation < this.generation) return;
    if (message.generation !== this.generation) this.beginGeneration(message.generation);
    this.eventQueue.receive(message.buffer);
    if (this.latestStateValue !== null) this.presentEvents(this.latestStateValue.tick);
    if (this.eventQueue.takeResyncRequest()) {
      const request: WorkerEventConsumerMessage = { type: 'event-resync-request', generation: this.generation };
      this.eventChannel.port2.postMessage(request);
    }
  }

  private presentEvents(tick: number): void {
    const acknowledgement = this.eventQueue.presentThrough(tick, (event) => this.options.callbacks.onEvent(event));
    this.sendEventAcknowledgement(acknowledgement);
  }

  private sendEventAcknowledgement(acknowledgement: number): void {
    if (acknowledgement <= this.lastAcknowledgement) return;
    this.lastAcknowledgement = acknowledgement;
    const message: WorkerEventConsumerMessage = {
      type: 'event-ack', generation: this.generation, highestContiguousBatchSequence: acknowledgement,
    };
    this.eventChannel.port2.postMessage(message);
  }

  private beginGeneration(generation: number): void {
    this.generation = generation;
    this.snapshotCopies = new SnapshotConsumerCopies();
    this.eventQueue = new EventConsumerQueue();
    this.lastAcknowledgement = 0;
  }

  private fail(error: Error): void {
    this.rejectReady(error);
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
    this.options.callbacks.onError(error);
  }
}
