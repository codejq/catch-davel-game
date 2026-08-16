export interface AudioVisualSample {
  readonly targetPerformanceTimeMs: number;
  readonly estimatedAudioPerformanceTimeMs: number;
  readonly visualPerformanceTimeMs: number;
  readonly audioMappingErrorMs: number;
  readonly audioVisualSeparationMs: number;
}

export interface AudioVisualProbeResult {
  readonly supported: boolean;
  readonly contextState: AudioContextState | 'unavailable';
  readonly baseLatencySeconds: number | null;
  readonly outputLatencySeconds: number | null;
  readonly samples: readonly AudioVisualSample[];
  readonly limitation: string;
}

function nextAnimationFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function outputTimestamp(context: AudioContext): { contextTime: number; performanceTime: number } | null {
  const timestamp = context.getOutputTimestamp();
  if (timestamp.contextTime === undefined || timestamp.performanceTime === undefined) return null;
  if (timestamp.contextTime <= 0 || timestamp.performanceTime <= 0) return null;
  return { contextTime: timestamp.contextTime, performanceTime: timestamp.performanceTime };
}

async function primeAudioClock(context: AudioContext): Promise<void> {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  gain.gain.value = 0.0001;
  oscillator.connect(gain).connect(context.destination);
  const ended = new Promise<void>((resolve) => {
    oscillator.onended = () => resolve();
  });
  oscillator.start();
  oscillator.stop(context.currentTime + 0.01);
  await ended;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (outputTimestamp(context) !== null) return;
    await nextAnimationFrame();
  }
  throw new Error('Web Audio output clock did not produce a usable timestamp');
}

export async function runAudioVisualProbe(sampleCount = 12): Promise<AudioVisualProbeResult> {
  if (typeof AudioContext !== 'function') {
    return {
      supported: false,
      contextState: 'unavailable',
      baseLatencySeconds: null,
      outputLatencySeconds: null,
      samples: [],
      limitation: 'Web Audio is unavailable.',
    };
  }
  const context = new AudioContext({ latencyHint: 'interactive' });
  await context.resume();
  const measurementState = context.state;
  const samples: AudioVisualSample[] = [];
  try {
    await primeAudioClock(context);
    for (let index = 0; index < sampleCount; index += 1) {
      const frameTime = await nextAnimationFrame();
      const targetPerformanceTimeMs = frameTime + 6 * (1_000 / 60);
      const before = outputTimestamp(context);
      if (before === null) throw new Error('Web Audio output clock became unavailable');
      const targetContextTime = before.contextTime + (targetPerformanceTimeMs - before.performanceTime) / 1_000;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.0001;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(targetContextTime);
      oscillator.stop(targetContextTime + 0.008);
      const ended = new Promise<void>((resolve) => {
        oscillator.onended = () => resolve();
      });
      let visualPerformanceTimeMs = frameTime;
      while (visualPerformanceTimeMs < targetPerformanceTimeMs) {
        visualPerformanceTimeMs = await nextAnimationFrame();
      }
      document.documentElement.dataset.audioProbe = String(index & 1);
      const after = outputTimestamp(context) ?? before;
      const estimatedAudioPerformanceTimeMs = after.performanceTime + (targetContextTime - after.contextTime) * 1_000;
      await ended;
      samples.push({
        targetPerformanceTimeMs,
        estimatedAudioPerformanceTimeMs,
        visualPerformanceTimeMs,
        audioMappingErrorMs: Math.abs(estimatedAudioPerformanceTimeMs - targetPerformanceTimeMs),
        audioVisualSeparationMs: Math.abs(visualPerformanceTimeMs - estimatedAudioPerformanceTimeMs),
      });
    }
  } finally {
    await context.close();
  }
  return {
    supported: true,
    contextState: measurementState,
    baseLatencySeconds: Number.isFinite(context.baseLatency) ? context.baseLatency : null,
    outputLatencySeconds: Number.isFinite(context.outputLatency) ? context.outputLatency : null,
    samples,
    limitation: 'Instrumented Web Audio clock mapping and animation-frame timing only; no microphone, speaker, photodiode, or physical display capture.',
  };
}
