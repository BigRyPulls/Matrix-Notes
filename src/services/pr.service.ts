import type { ExerciseMetric, PersonalRecord, PRCheckResult, SetEntry } from '../types';
import { createId } from '../utils/id';
import { prRepo, setRepo, workoutExerciseRepo, workoutRepo } from '../storage/repositories';

function volume(set: SetEntry): number {
  const w = set.weight ?? 0;
  const r = set.reps ?? 0;
  return w * r;
}

export async function evaluateSetPR(
  exerciseId: string,
  metric: ExerciseMetric,
  candidate: SetEntry,
  workoutId: string,
  date: string,
): Promise<PRCheckResult> {
  if (candidate.isWarmup) {
    return { isPR: false, kind: null, previousValue: null };
  }

  const existing = await prRepo.getByExercise(exerciseId);
  const now = Date.now();
  let isPR = false;
  let kind: PersonalRecord['kind'] | null = null;
  let previousValue: number | null = null;
  const newRecords: PersonalRecord[] = [...existing];

  const upsert = (k: PersonalRecord['kind'], value: number, secondary: number | null) => {
    const prev = existing.find((p) => p.kind === k);
    const improved =
      k === 'best_duration' ? !prev || value > prev.value : !prev || value > prev.value;

    if (!improved) {
      previousValue = prev?.value ?? null;
      return;
    }
    previousValue = prev?.value ?? null;
    isPR = true;
    kind = k;
    const filtered = newRecords.filter((p) => p.kind !== k);
    filtered.push({
      id: createId('pr'),
      exerciseId,
      kind: k,
      value,
      secondaryValue: secondary,
      setId: candidate.id,
      workoutId,
      achievedAt: now,
      date,
    });
    newRecords.length = 0;
    newRecords.push(...filtered);
  };

  switch (metric) {
    case 'weight_reps':
    case 'bodyweight_reps':
    case 'weight_duration': {
      if (candidate.weight != null && candidate.weight > 0) {
        upsert('max_weight', candidate.weight, candidate.reps);
      }
      if (candidate.reps != null && candidate.reps > 0) {
        upsert('max_reps', candidate.reps, candidate.weight);
      }
      const vol = volume(candidate);
      if (vol > 0) upsert('max_volume', vol, null);
      break;
    }
    case 'distance': {
      if (candidate.distance != null && candidate.distance > 0) {
        upsert('max_distance', candidate.distance, candidate.durationSec);
      }
      break;
    }
    case 'duration': {
      if (candidate.durationSec != null && candidate.durationSec > 0) {
        upsert('best_duration', candidate.durationSec, null);
      }
      break;
    }
    default:
      break;
  }

  if (isPR) {
    await prRepo.replaceForExercise(exerciseId, newRecords);
  }

  return { isPR, kind, previousValue };
}

export async function getExercisePRs(exerciseId: string): Promise<PersonalRecord[]> {
  return prRepo.getByExercise(exerciseId);
}

/** Rebuild PRs for one exercise from history (after import/delete). */
export async function rebuildPRsForExercise(exerciseId: string, metric: ExerciseMetric): Promise<void> {
  const wes = await workoutExerciseRepo.getByExercise(exerciseId);
  const candidates: Array<{ set: SetEntry; workoutId: string; date: string }> = [];
  for (const we of wes) {
    const workout = await workoutRepo.getById(we.workoutId);
    if (!workout) continue;
    const sets = await setRepo.getByWorkoutExercise(we.id);
    for (const s of sets) {
      if (!s.isWarmup) candidates.push({ set: s, workoutId: workout.id, date: workout.date });
    }
  }
  // chronological so latest overwrites correctly
  candidates.sort((a, b) => a.set.completedAt - b.set.completedAt);

  // Build all PR records in memory first, then atomically replace
  const records: PersonalRecord[] = [];
  const now = Date.now();

  const update = (kind: PersonalRecord['kind'], value: number, secondary: number | null, s: SetEntry, wId: string, date: string) => {
    const idx = records.findIndex((r) => r.kind === kind);
    const prev = idx >= 0 ? records[idx]! : null;
    if (prev && value <= prev.value) return;
    const entry: PersonalRecord = {
      id: createId('pr'),
      exerciseId,
      kind,
      value,
      secondaryValue: secondary,
      setId: s.id,
      workoutId: wId,
      achievedAt: now,
      date,
    };
    if (idx >= 0) records[idx] = entry;
    else records.push(entry);
  };

  for (const c of candidates) {
    const s = c.set;
    switch (metric) {
      case 'weight_reps':
      case 'bodyweight_reps':
      case 'weight_duration':
        if (s.weight != null && s.weight > 0) update('max_weight', s.weight, s.reps, s, c.workoutId, c.date);
        if (s.reps != null && s.reps > 0) update('max_reps', s.reps, s.weight, s, c.workoutId, c.date);
        const vol = (s.weight ?? 0) * (s.reps ?? 0);
        if (vol > 0) update('max_volume', vol, null, s, c.workoutId, c.date);
        break;
      case 'distance':
        if (s.distance != null && s.distance > 0) update('max_distance', s.distance, s.durationSec, s, c.workoutId, c.date);
        break;
      case 'duration':
        if (s.durationSec != null && s.durationSec > 0) update('best_duration', s.durationSec, null, s, c.workoutId, c.date);
        break;
    }
  }

  await prRepo.replaceForExercise(exerciseId, records);
}
