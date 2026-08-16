import type { AudioRuntimeProfile } from '../content/runtime-manifests';

export type AudioCue = 'pulse' | 'sword' | 'charged-sword' | 'deflect' | 'bomb-throw' | 'bomb-detonate'
  | 'laser' | 'robot-impact' | 'robot-shot' | 'robot-telegraph' | 'robot-melee' | 'dj-buff' | 'boss-phase'
  | 'player-hit' | 'key' | 'health' | 'energy' | 'coin' | 'door' | 'checkpoint' | 'objective'
  | 'robot-defeat' | 'robot-taunt' | 'victory' | 'defeat' | 'ambush';

export type AudioBus = 'combat' | 'world' | 'interface';
export type DynamicRangePreset = 'wide' | 'balanced' | 'night';

export interface AudioMixSettings {
  readonly combat: number;
  readonly world: number;
  readonly interface: number;
  readonly dynamicRange: DynamicRangePreset;
}

export const DEFAULT_AUDIO_MIX: AudioMixSettings = {
  combat: 1, world: 1, interface: 1, dynamicRange: 'balanced',
};

export const AUDIO_CUE_BUS: Readonly<Record<AudioCue, AudioBus>> = {
  pulse: 'combat', sword: 'combat', 'charged-sword': 'combat', deflect: 'combat', 'bomb-throw': 'combat',
  'bomb-detonate': 'combat', laser: 'combat', 'robot-impact': 'combat', 'robot-shot': 'combat',
  'robot-telegraph': 'combat', 'robot-melee': 'combat', 'dj-buff': 'combat', 'boss-phase': 'combat',
  'player-hit': 'combat', key: 'world', health: 'world', energy: 'world', coin: 'world', door: 'world',
  checkpoint: 'interface', objective: 'interface', 'robot-defeat': 'world', 'robot-taunt': 'world', victory: 'interface',
  defeat: 'interface', ambush: 'interface',
};

export const DYNAMIC_RANGE_PRESETS: Readonly<Record<DynamicRangePreset, {
  readonly threshold: number;
  readonly knee: number;
  readonly ratio: number;
  readonly attack: number;
  readonly release: number;
  readonly outputScale: number;
}>> = {
  wide: { threshold: -7, knee: 5, ratio: 2.5, attack: 0.002, release: 0.14, outputScale: 0.9 },
  balanced: { threshold: -13, knee: 12, ratio: 8, attack: 0.003, release: 0.18, outputScale: 0.78 },
  night: { threshold: -24, knee: 18, ratio: 12, attack: 0.006, release: 0.28, outputScale: 0.62 },
};

export function validateAudioMixSettings(mix: AudioMixSettings): void {
  for (const bus of ['combat', 'world', 'interface'] as const) {
    if (!Number.isFinite(mix[bus]) || mix[bus] < 0 || mix[bus] > 1) {
      throw new Error(`Audio ${bus} bus gain is outside bounds`);
    }
  }
  if (!Object.hasOwn(DYNAMIC_RANGE_PRESETS, mix.dynamicRange)) throw new Error('Audio dynamic range preset is invalid');
}

interface ToneLayer {
  readonly kind: 'tone';
  readonly wave: OscillatorType;
  readonly frequency: number;
  readonly endFrequency: number;
  readonly duration: number;
  readonly gain: number;
  readonly delay?: number;
}

interface NoiseLayer {
  readonly kind: 'noise';
  readonly filter: BiquadFilterType;
  readonly frequency: number;
  readonly duration: number;
  readonly gain: number;
  readonly delay?: number;
}

type AudioLayer = ToneLayer | NoiseLayer;

const tone = (
  wave: OscillatorType, frequency: number, endFrequency: number, duration: number, gain: number, delay = 0,
): ToneLayer => ({ kind: 'tone', wave, frequency, endFrequency, duration, gain, delay });
const noise = (
  filter: BiquadFilterType, frequency: number, duration: number, gain: number, delay = 0,
): NoiseLayer => ({ kind: 'noise', filter, frequency, duration, gain, delay });

export const AUDIO_CUE_DEFINITIONS: Readonly<Record<AudioCue, readonly AudioLayer[]>> = {
  pulse: [tone('square', 230, 72, 0.12, 0.13), noise('highpass', 1250, 0.055, 0.09), tone('sine', 82, 48, 0.19, 0.08, 0.015)],
  sword: [noise('bandpass', 740, 0.18, 0.1), tone('sawtooth', 190, 82, 0.15, 0.07)],
  'charged-sword': [noise('bandpass', 520, 0.27, 0.15), tone('sawtooth', 130, 52, 0.25, 0.13), tone('sine', 360, 110, 0.2, 0.05)],
  deflect: [tone('square', 1180, 420, 0.09, 0.1), noise('highpass', 3400, 0.07, 0.08)],
  'bomb-throw': [noise('bandpass', 430, 0.15, 0.06), tone('triangle', 170, 94, 0.16, 0.07)],
  'bomb-detonate': [noise('lowpass', 720, 0.48, 0.2), tone('sine', 74, 34, 0.52, 0.2), noise('highpass', 1800, 0.12, 0.09)],
  laser: [tone('sawtooth', 510, 390, 0.07, 0.045), tone('sine', 1020, 780, 0.06, 0.025)],
  'robot-impact': [noise('bandpass', 310, 0.09, 0.1), tone('square', 105, 62, 0.08, 0.07)],
  'robot-shot': [tone('triangle', 220, 88, 0.2, 0.09), noise('highpass', 900, 0.08, 0.05)],
  'robot-telegraph': [tone('triangle', 280, 440, 0.24, 0.06), tone('sine', 140, 210, 0.24, 0.04)],
  'robot-melee': [noise('lowpass', 460, 0.15, 0.14), tone('square', 86, 48, 0.16, 0.1)],
  'dj-buff': [tone('sawtooth', 520, 260, 0.36, 0.09), tone('square', 130, 65, 0.34, 0.08)],
  'boss-phase': [tone('sawtooth', 58, 38, 0.72, 0.21), noise('lowpass', 340, 0.66, 0.15), tone('square', 116, 58, 0.48, 0.07, 0.08)],
  'player-hit': [noise('lowpass', 420, 0.24, 0.18), tone('sawtooth', 78, 42, 0.22, 0.12)],
  key: [tone('square', 620, 860, 0.17, 0.07), tone('sine', 930, 620, 0.18, 0.045, 0.04)],
  health: [tone('sine', 420, 660, 0.2, 0.065), tone('sine', 630, 880, 0.16, 0.04, 0.05)],
  energy: [tone('triangle', 720, 1080, 0.17, 0.065), tone('sine', 360, 720, 0.18, 0.04)],
  coin: [tone('sine', 980, 1320, 0.16, 0.07), tone('square', 1470, 980, 0.12, 0.035, 0.045)],
  door: [noise('bandpass', 190, 0.32, 0.11), tone('square', 96, 48, 0.28, 0.07)],
  checkpoint: [tone('sine', 330, 660, 0.36, 0.06), tone('triangle', 495, 990, 0.32, 0.05, 0.08)],
  objective: [tone('square', 260, 520, 0.28, 0.06), tone('sine', 390, 780, 0.34, 0.06, 0.08)],
  'robot-defeat': [noise('bandpass', 240, 0.3, 0.13), tone('square', 145, 52, 0.27, 0.11)],
  'robot-taunt': [tone('square', 190, 270, 0.09, 0.045), tone('triangle', 380, 210, 0.12, 0.035, 0.08), noise('bandpass', 640, 0.18, 0.025)],
  victory: [tone('square', 262, 524, 0.34, 0.07), tone('triangle', 392, 784, 0.4, 0.065, 0.08), tone('sine', 523, 1046, 0.5, 0.07, 0.16)],
  defeat: [tone('sawtooth', 145, 42, 0.68, 0.16), noise('lowpass', 360, 0.55, 0.11)],
  ambush: [tone('sawtooth', 92, 46, 0.58, 0.16), noise('bandpass', 680, 0.32, 0.12), tone('square', 184, 69, 0.4, 0.08, 0.06)],
};

export function validateProceduralAudioDefinitions(): void {
  for (const [cue, layers] of Object.entries(AUDIO_CUE_DEFINITIONS)) {
    if (layers.length < 2) throw new Error(`Audio cue ${cue} must contain at least two layers`);
    for (const layer of layers) {
      if (![layer.frequency, layer.duration, layer.gain, layer.delay ?? 0].every(Number.isFinite)
        || layer.frequency <= 0 || layer.duration <= 0 || layer.gain <= 0 || (layer.delay ?? 0) < 0) {
        throw new Error(`Audio cue ${cue} has an invalid layer`);
      }
      if (layer.kind === 'tone' && layer.endFrequency <= 0) throw new Error(`Audio cue ${cue} has an invalid tone sweep`);
    }
  }
}

function seedText(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function nextNoise(state: number): number {
  let value = state | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value | 0;
}

export class ProceduralAudio {
  private readonly master: GainNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly dry: GainNode;
  private readonly reverbInput: GainNode;
  private readonly buses: Readonly<Record<AudioBus, GainNode>>;
  private readonly noiseBuffer: AudioBuffer;
  private outputGain: number;
  private dynamicRange: DynamicRangePreset;
  private activeSources = 0;

  constructor(
    private readonly context: AudioContext, private readonly profile: AudioRuntimeProfile, profileId: string,
    outputGain = 1, mix: AudioMixSettings = DEFAULT_AUDIO_MIX,
  ) {
    validateProceduralAudioDefinitions();
    this.outputGain = Math.max(0, Math.min(1, outputGain));
    this.dynamicRange = mix.dynamicRange;
    this.master = context.createGain();
    this.compressor = context.createDynamicsCompressor();
    this.master.connect(this.compressor).connect(context.destination);

    this.dry = context.createGain();
    this.dry.gain.value = 0.9;
    this.dry.connect(this.master);
    this.reverbInput = context.createGain();
    this.reverbInput.gain.value = profile.wetMix;
    const convolver = context.createConvolver();
    convolver.buffer = this.createImpulse(profileId);
    const damping = context.createBiquadFilter();
    damping.type = 'lowpass';
    damping.frequency.value = profile.dampingHz;
    this.reverbInput.connect(convolver).connect(damping).connect(this.master);
    this.buses = {
      combat: context.createGain(), world: context.createGain(), interface: context.createGain(),
    };
    for (const bus of Object.values(this.buses)) {
      bus.connect(this.dry);
      bus.connect(this.reverbInput);
    }
    this.setMix(mix, true);
    this.noiseBuffer = this.createNoiseBuffer(profileId);
  }

  resume(): Promise<void> { return this.context.resume(); }

  setOutputGain(value: number): void {
    this.outputGain = Math.max(0, Math.min(1, value));
    this.applyOutputGain(false);
  }

  setMix(mix: AudioMixSettings, immediate = false): void {
    validateAudioMixSettings(mix);
    const timeConstant = immediate ? 0 : 0.04;
    for (const bus of ['combat', 'world', 'interface'] as const) {
      const value = mix[bus];
      if (immediate) this.buses[bus].gain.value = value;
      else this.buses[bus].gain.setTargetAtTime(value, this.context.currentTime, timeConstant);
    }
    this.dynamicRange = mix.dynamicRange;
    const preset = DYNAMIC_RANGE_PRESETS[this.dynamicRange];
    this.compressor.threshold.value = preset.threshold;
    this.compressor.knee.value = preset.knee;
    this.compressor.ratio.value = preset.ratio;
    this.compressor.attack.value = preset.attack;
    this.compressor.release.value = preset.release;
    this.applyOutputGain(immediate);
  }

  play(cue: AudioCue, pan = 0): void {
    const layers = AUDIO_CUE_DEFINITIONS[cue];
    if (this.activeSources + layers.length > 48) return;
    for (const layer of layers) this.playLayer(layer, Math.max(-1, Math.min(1, pan)), AUDIO_CUE_BUS[cue]);
  }

  private playLayer(layer: AudioLayer, pan: number, bus: AudioBus): void {
    const now = this.context.currentTime + (layer.delay ?? 0);
    const envelope = this.context.createGain();
    const panner = this.context.createStereoPanner();
    panner.pan.value = pan;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(layer.gain, now + Math.min(0.006, layer.duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + layer.duration);
    envelope.connect(panner);
    panner.connect(this.buses[bus]);

    const source = layer.kind === 'tone' ? this.context.createOscillator() : this.context.createBufferSource();
    if (layer.kind === 'tone' && source instanceof OscillatorNode) {
      source.type = layer.wave;
      source.frequency.setValueAtTime(layer.frequency * this.profile.pitchScale, now);
      source.frequency.exponentialRampToValueAtTime(layer.endFrequency * this.profile.pitchScale, now + layer.duration);
      source.connect(envelope);
    } else if (layer.kind === 'noise' && source instanceof AudioBufferSourceNode) {
      const filter = this.context.createBiquadFilter();
      filter.type = layer.filter;
      filter.frequency.value = layer.frequency * this.profile.pitchScale;
      filter.Q.value = layer.filter === 'bandpass' ? 1.4 : 0.7;
      source.buffer = this.noiseBuffer;
      source.connect(filter).connect(envelope);
    }
    this.activeSources += 1;
    source.addEventListener('ended', () => { this.activeSources -= 1; }, { once: true });
    source.start(now);
    source.stop(now + layer.duration + 0.01);
  }

  private applyOutputGain(immediate: boolean): void {
    const value = DYNAMIC_RANGE_PRESETS[this.dynamicRange].outputScale * this.outputGain;
    if (immediate) this.master.gain.value = value;
    else this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.04);
  }

  private createNoiseBuffer(profileId: string): AudioBuffer {
    const length = Math.ceil(this.context.sampleRate * 0.8);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let state = seedText(`${profileId}:noise`) || 1;
    for (let index = 0; index < length; index += 1) {
      state = nextNoise(state);
      data[index] = state / 0x80000000;
    }
    return buffer;
  }

  private createImpulse(profileId: string): AudioBuffer {
    const length = Math.max(1, Math.ceil(this.context.sampleRate * this.profile.decaySeconds));
    const buffer = this.context.createBuffer(2, length, this.context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      let state = seedText(`${profileId}:room:${channel}`) || 1;
      for (let index = 0; index < length; index += 1) {
        state = nextNoise(state);
        const progress = index / length;
        const envelope = Math.pow(1 - progress, 1.4 + this.profile.roomSize * 1.8);
        data[index] = (state / 0x80000000) * envelope * 0.62;
      }
    }
    return buffer;
  }
}
