import type { MusicRuntimeProfile } from '../content/runtime-manifests';

export interface MusicStep {
  readonly absoluteStep: number;
  readonly barStep: number;
  readonly delaySeconds: number;
  readonly kick: boolean;
  readonly snare: boolean;
  readonly hat: boolean;
  readonly bassMidi: number | null;
  readonly leadMidi: number | null;
}

function degreeMidi(profile: MusicRuntimeProfile, degree: number, octave = 0): number {
  const normalized = ((degree % profile.scale.length) + profile.scale.length) % profile.scale.length;
  return profile.rootMidi + profile.scale[normalized]! + octave * 12;
}

export function musicStepAtTick(
  tick: number, bpm: number, profile: MusicRuntimeProfile, intensity: number, frozen: boolean, bossPhase = 0,
): MusicStep {
  const sixteenthTicks = 900 / bpm;
  const absoluteStep = Math.floor(Math.max(0, tick) / sixteenthTicks);
  const barStep = absoluteStep % 16;
  const patternIndex = Math.floor(barStep / 2) % profile.leadPattern.length;
  const activity = Math.max(0, Math.min(1, intensity));
  const sparseFreezeBeat = frozen && (barStep === 0 || barStep === 8);
  const leadStep = !frozen && (barStep === 2 || barStep === 6 || barStep === 10 || barStep === 14);
  const phaseLift = bossPhase >= 3 ? 12 : bossPhase >= 2 ? 5 : 0;
  return {
    absoluteStep,
    barStep,
    delaySeconds: (barStep & 1) === 1 ? (60 / bpm / 4) * profile.swing : 0,
    kick: sparseFreezeBeat || (!frozen && ([0, 4, 8, 12].includes(barStep) || (activity > 0.82 && barStep === 10))),
    snare: !frozen && (barStep === 4 || barStep === 12),
    hat: frozen ? sparseFreezeBeat : activity > 0.58 || barStep % 2 === 0,
    bassMidi: !frozen && barStep % 4 === 0
      ? degreeMidi(profile, profile.bassPattern[Math.floor(barStep / 4)]!) : null,
    leadMidi: leadStep ? degreeMidi(profile, profile.leadPattern[patternIndex]!, 1) + phaseLift : null,
  };
}

function midiFrequency(midi: number): number { return 440 * 2 ** ((midi - 69) / 12); }

export class ProceduralMusicSequencer {
  private readonly output: GainNode;
  private readonly targetGain: number;
  private lastStep = -1;
  private activeSources = 0;

  constructor(
    private readonly context: AudioContext,
    private readonly bpm: number,
    private readonly profile: MusicRuntimeProfile,
    outputGain: number,
  ) {
    this.output = context.createGain();
    this.targetGain = Math.max(0, Math.min(1, outputGain)) * 0.24;
    this.output.gain.value = this.targetGain;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 16;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.24;
    this.output.connect(compressor).connect(context.destination);
  }

  update(tick: number, intensity: number, frozen: boolean, bossPhase: number, active: boolean): void {
    const step = musicStepAtTick(tick, this.bpm, this.profile, intensity, frozen, bossPhase);
    if (!active) {
      this.lastStep = step.absoluteStep;
      this.output.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.06);
      return;
    }
    this.output.gain.setTargetAtTime(this.targetGain, this.context.currentTime, 0.08);
    if (step.absoluteStep === this.lastStep) return;
    this.lastStep = step.absoluteStep;
    const when = this.context.currentTime + 0.006 + step.delaySeconds;
    if (step.kick) this.playTone(when, 'sine', 112, 42, 0.14, 0.7);
    if (step.snare) {
      this.playTone(when, 'triangle', 210, 92, 0.1, 0.34);
      this.playTone(when, 'square', 1320, 430, 0.055, 0.13);
    }
    if (step.hat) this.playTone(when, 'square', 5200, 2600, 0.025, frozen ? 0.08 : 0.045 + intensity * 0.035);
    if (step.bassMidi !== null) {
      const frequency = midiFrequency(step.bassMidi);
      this.playTone(when, 'sawtooth', frequency, frequency * 0.72, 0.19, 0.12 + intensity * 0.045);
    }
    if (step.leadMidi !== null) {
      const frequency = midiFrequency(step.leadMidi);
      this.playTone(when, 'triangle', frequency, frequency * 0.985, 0.16, 0.07 + intensity * 0.04);
    }
  }

  private playTone(
    when: number, wave: OscillatorType, frequency: number, endFrequency: number, duration: number, gainValue: number,
  ): void {
    if (this.activeSources >= 24) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(gainValue, when + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain).connect(this.output);
    this.activeSources += 1;
    oscillator.addEventListener('ended', () => { this.activeSources -= 1; }, { once: true });
    oscillator.start(when);
    oscillator.stop(when + duration + 0.01);
  }
}
