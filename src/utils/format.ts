import type { ExerciseMetric, WeightUnit } from '../types';

export function formatWeight(value: number | null | undefined, unit: WeightUnit): string {
  if (value == null || Number.isNaN(value)) return '—';
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
  return `${rounded} ${unit}`;
}

export function formatReps(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return String(value);
}

export function formatSetSummary(
  metric: ExerciseMetric,
  weight: number | null,
  reps: number | null,
  durationSec: number | null,
  distance: number | null,
  unit: WeightUnit,
): string {
  switch (metric) {
    case 'weight_reps':
      return `${formatWeight(weight, unit)} × ${formatReps(reps)}`;
    case 'bodyweight_reps':
      return weight && weight > 0
        ? `+${formatWeight(weight, unit)} × ${formatReps(reps)}`
        : `${formatReps(reps)} reps`;
    case 'duration':
      return formatClock(durationSec ?? 0);
    case 'distance':
      return distance != null ? `${trimNum(distance)}` : '—';
    case 'weight_duration':
      return `${formatWeight(weight, unit)} · ${formatClock(durationSec ?? 0)}`;
    default:
      return '—';
  }
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function trimNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export function parseNumberInput(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
