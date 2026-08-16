import type { TickTimings } from '../sim/simulation';

export interface DistributionSummary {
  readonly samples: number;
  readonly minimum: number;
  readonly median: number;
  readonly p95: number;
  readonly p99: number;
  readonly maximum: number;
  readonly mean: number;
}

export type TimingKey = keyof TickTimings;

function quantile(sorted: readonly number[], probability: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil(probability * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))]!;
}

export function summarize(values: readonly number[]): DistributionSummary {
  if (values.length === 0) {
    return { samples: 0, minimum: 0, median: 0, p95: 0, p99: 0, maximum: 0, mean: 0 };
  }
  const sorted = [...values].sort((left, right) => left - right);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    samples: sorted.length,
    minimum: sorted[0]!,
    median: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    p99: quantile(sorted, 0.99),
    maximum: sorted[sorted.length - 1]!,
    mean: sum / sorted.length,
  };
}

export function summarizeTimings(samples: readonly TickTimings[]): Record<TimingKey, DistributionSummary> {
  const keys: readonly TimingKey[] = [
    'navigationMs',
    'physicsMs',
    'combatProjectilesHazardsMs',
    'eventsObjectivesEconomyMs',
    'snapshotMs',
    'wholeTickMs',
  ];
  return Object.fromEntries(
    keys.map((key) => [key, summarize(samples.map((sample) => sample[key]))]),
  ) as Record<TimingKey, DistributionSummary>;
}

