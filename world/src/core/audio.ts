/** Procedural Web Audio: every sound is synthesised, so the game ships no audio files. */
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private ambience: { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null = null;

  start(): void {
    if (this.context !== null) {
      void this.context.resume();
      return;
    }
    const context = new AudioContext();
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0.7;
    const compressor = context.createDynamicsCompressor();
    this.master.connect(compressor).connect(context.destination);
    const length = context.sampleRate * 2;
    this.noise = context.createBuffer(1, length, context.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 1;
    for (let index = 0; index < length; index += 1) {
      seed = (seed * 16807) % 2147483647;
      data[index] = (seed / 2147483647) * 2 - 1;
    }
  }

  /** Continuous wind/nature bed whose colour depends on the world. */
  setAmbience(kind: 'forest' | 'desert' | 'snow'): void {
    if (this.context === null || this.noise === null || this.master === null) return;
    this.ambience?.source.stop();
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = kind === 'snow' ? 520 : kind === 'desert' ? 380 : 700;
    const gain = this.context.createGain();
    gain.gain.value = kind === 'snow' ? 0.09 : 0.05;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    this.ambience = { source, gain, filter };
  }

  updateAmbience(time: number): void {
    if (this.ambience === null) return;
    this.ambience.filter.frequency.value = 450 + Math.sin(time * 0.21) * 180 + Math.sin(time * 0.53) * 90;
  }

  private burst(options: {
    readonly duration: number; readonly gain: number; readonly frequency: number; readonly q?: number;
    readonly type?: BiquadFilterType; readonly delay?: number; readonly pan?: number; readonly decay?: number;
  }): void {
    if (this.context === null || this.noise === null || this.master === null) return;
    const start = this.context.currentTime + (options.delay ?? 0);
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const filter = this.context.createBiquadFilter();
    filter.type = options.type ?? 'bandpass';
    filter.frequency.value = options.frequency;
    filter.Q.value = options.q ?? 0.8;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(options.gain, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration * (options.decay ?? 1));
    const panner = this.context.createStereoPanner();
    panner.pan.value = options.pan ?? 0;
    source.connect(filter).connect(gain).connect(panner).connect(this.master);
    source.start(start, Math.random() * 1.5, options.duration + 0.05);
  }

  private tone(frequency: number, duration: number, gain: number, type: OscillatorType = 'sine', slideTo?: number, delay = 0): void {
    if (this.context === null || this.master === null) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo !== undefined) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  rifleShot(outdoors: boolean): void {
    this.burst({ duration: 0.08, gain: 1.4, frequency: 2600, q: 0.5, type: 'highpass' });
    this.burst({ duration: 0.45, gain: 1.1, frequency: 180, q: 0.6, type: 'lowpass' });
    this.tone(90, 0.35, 0.8, 'sine', 40);
    // Rolling echo off hills or walls.
    for (let echo = 1; echo <= 3; echo += 1) {
      this.burst({ duration: 0.6, gain: 0.25 / echo, frequency: 400, q: 0.5, type: 'lowpass', delay: (outdoors ? 0.35 : 0.08) * echo, pan: echo % 2 === 0 ? -0.4 : 0.4 });
    }
  }

  bolt(): void {
    this.burst({ duration: 0.05, gain: 0.35, frequency: 3200, q: 4, delay: 0.25 });
    this.burst({ duration: 0.05, gain: 0.3, frequency: 2400, q: 4, delay: 0.55 });
    this.burst({ duration: 0.04, gain: 0.3, frequency: 3600, q: 5, delay: 0.8 });
  }

  reload(): void {
    for (const [delay, frequency] of [[0.2, 2600], [0.9, 1800], [1.5, 3000], [2.3, 2200]] as const) {
      this.burst({ duration: 0.06, gain: 0.35, frequency, q: 4, delay });
    }
  }

  dryFire(): void { this.burst({ duration: 0.03, gain: 0.3, frequency: 4200, q: 6 }); }

  footstep(surface: 'grass' | 'hard' | 'snow' | 'sand' | 'wood', loud: number): void {
    const frequency = surface === 'hard' ? 1800 : surface === 'wood' ? 900 : surface === 'snow' ? 2600 : surface === 'sand' ? 1400 : 1100;
    this.burst({ duration: surface === 'snow' ? 0.14 : 0.08, gain: 0.12 * loud, frequency, q: surface === 'hard' ? 2 : 0.7 });
  }

  impact(kind: 'robot' | 'headshot' | 'world'): void {
    if (kind === 'world') {
      this.burst({ duration: 0.12, gain: 0.25, frequency: 1200, q: 1 });
      return;
    }
    this.tone(kind === 'headshot' ? 1400 : 900, 0.12, 0.25, 'triangle', kind === 'headshot' ? 2200 : 600);
    this.burst({ duration: 0.1, gain: 0.3, frequency: 4000, q: 2 });
  }

  robotShot(pan: number, distance: number): void {
    const gain = Math.max(0.08, 0.9 - distance / 120);
    this.tone(1800, 0.14, gain * 0.35, 'sawtooth', 300);
    this.burst({ duration: 0.18, gain: gain * 0.5, frequency: 900, q: 1, pan });
  }

  bulletSnap(): void {
    this.burst({ duration: 0.05, gain: 0.5, frequency: 5000, q: 1.5 });
  }

  hurt(): void {
    this.tone(160, 0.25, 0.45, 'sine', 70);
    this.burst({ duration: 0.15, gain: 0.3, frequency: 300, type: 'lowpass' });
  }

  robotAlert(pan: number): void {
    this.tone(880, 0.12, 0.2, 'square', 880);
    this.tone(660, 0.18, 0.2, 'square', 660, 0.14);
    void pan;
  }

  robotDown(): void {
    this.tone(420, 0.8, 0.3, 'sawtooth', 50);
    this.burst({ duration: 0.4, gain: 0.3, frequency: 600, type: 'lowpass', delay: 0.5 });
  }

  door(opening: boolean): void {
    this.tone(opening ? 210 : 180, 0.5, 0.12, 'sawtooth', opening ? 320 : 120);
    this.burst({ duration: 0.12, gain: 0.3, frequency: 500, type: 'lowpass', delay: opening ? 0 : 0.35 });
  }

  search(): void {
    for (let rustle = 0; rustle < 5; rustle += 1) this.burst({ duration: 0.09, gain: 0.12, frequency: 1500 + rustle * 200, delay: rustle * 0.15 });
  }

  pickup(important: boolean): void {
    this.tone(660, 0.12, 0.2, 'triangle');
    this.tone(important ? 1320 : 990, 0.25, 0.2, 'triangle', undefined, 0.1);
  }

  portal(): void {
    this.tone(110, 2.5, 0.35, 'sawtooth', 880);
    this.burst({ duration: 2.2, gain: 0.35, frequency: 800, q: 0.4 });
  }

  jumpLand(): void { this.burst({ duration: 0.12, gain: 0.3, frequency: 400, type: 'lowpass' }); }
}
