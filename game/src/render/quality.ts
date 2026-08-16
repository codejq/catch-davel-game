export type RenderQualityPreference = 'auto' | 'low' | 'medium' | 'high';
export type RenderQualityTier = Exclude<RenderQualityPreference, 'auto'>;

export interface RenderCapabilities {
  readonly deviceMemoryGiB: number | null;
  readonly hardwareConcurrency: number;
  readonly coarsePointer: boolean;
  readonly viewportPixels: number;
}

export interface RenderQualityProfile {
  readonly pixelRatioCap: number;
  readonly hitSparkCount: number;
}

export const RENDER_QUALITY_PROFILES: Readonly<Record<RenderQualityTier, RenderQualityProfile>> = Object.freeze({
  low: Object.freeze({ pixelRatioCap: 1, hitSparkCount: 1 }),
  medium: Object.freeze({ pixelRatioCap: 1.5, hitSparkCount: 2 }),
  high: Object.freeze({ pixelRatioCap: 2, hitSparkCount: 4 }),
});

export function normalizeRenderQuality(value: unknown): RenderQualityPreference {
  if (value === 'auto' || value === 'low' || value === 'medium' || value === 'high') return value;
  throw new Error('Render quality must be auto, low, medium, or high');
}

export function browserRenderCapabilities(): RenderCapabilities {
  const extendedNavigator = navigator as Navigator & { readonly deviceMemory?: number };
  return {
    deviceMemoryGiB: typeof extendedNavigator.deviceMemory === 'number' ? extendedNavigator.deviceMemory : null,
    hardwareConcurrency: Math.max(1, navigator.hardwareConcurrency || 1),
    coarsePointer: matchMedia('(pointer: coarse)').matches,
    viewportPixels: Math.max(1, innerWidth * innerHeight),
  };
}

export function initialRenderQuality(capabilities: RenderCapabilities): RenderQualityTier {
  if ((capabilities.deviceMemoryGiB !== null && capabilities.deviceMemoryGiB <= 4)
    || capabilities.hardwareConcurrency <= 4
    || (capabilities.coarsePointer && capabilities.viewportPixels <= 1_200_000)) return 'low';
  if ((capabilities.deviceMemoryGiB !== null && capabilities.deviceMemoryGiB <= 8)
    || capabilities.hardwareConcurrency <= 8
    || capabilities.coarsePointer) return 'medium';
  return 'high';
}

function lower(tier: RenderQualityTier): RenderQualityTier {
  return tier === 'high' ? 'medium' : 'low';
}

function higher(tier: RenderQualityTier): RenderQualityTier {
  return tier === 'low' ? 'medium' : 'high';
}

export class AutoQualityController {
  private previousTimestamp: number | null = null;
  private samples: number[] = [];
  private evaluationCount = 0;

  constructor(private currentTier: RenderQualityTier) {}

  get tier(): RenderQualityTier { return this.currentTier; }

  sample(timestampMs: number, eligible = true): RenderQualityTier | null {
    if (!eligible || !Number.isFinite(timestampMs)) {
      this.previousTimestamp = timestampMs;
      this.samples = [];
      return null;
    }
    if (this.previousTimestamp === null) {
      this.previousTimestamp = timestampMs;
      return null;
    }
    const interval = timestampMs - this.previousTimestamp;
    this.previousTimestamp = timestampMs;
    if (interval < 5 || interval > 80) {
      this.samples = [];
      return null;
    }
    this.samples.push(interval);
    if (this.samples.length < 120) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)]!;
    this.samples = [];
    this.evaluationCount += 1;
    const next = p90 > 22 ? lower(this.currentTier)
      : p90 < 14.5 && this.evaluationCount >= 3 ? higher(this.currentTier) : this.currentTier;
    if (next === this.currentTier) return null;
    this.currentTier = next;
    this.evaluationCount = 0;
    return next;
  }
}
