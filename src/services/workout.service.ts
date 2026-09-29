import type {
  Exercise,
  ProgramSource,
  SetEntry,
  Template,
  TemplateExercise,
  Workout,
  WorkoutExercise,
} from '../types';
import { createId } from '../utils/id';
import { toDateKey } from '../utils/date';
import {
  exerciseRepo,
  setRepo,
  settingsRepo,
  templateExerciseRepo,
  templateRepo,
  workoutExerciseRepo,
  workoutRepo,
} from '../storage/repositories';
import { getDb } from '../storage/db';
import { getSettingsSync } from './settings.service';
import { evaluateSetPR } from './pr.service';
import { sessionTimerService } from './session-timer.service';
import { restTimerService } from './timer.service';
import { undoService } from './undo.service';

export interface WorkoutBundle {
  workout: Workout;
  exercises: Array<{
    workoutExercise: WorkoutExercise;
    sets: SetEntry[];
    exercise?: Exercise;
  }>;
}

const pendingWorkoutLocks = new Map<string, Promise<Workout>>();

export async function getOrCreateWorkoutForDate(date: string): Promise<Workout> {
  const existing = await workoutRepo.getByDate(date);
  if (existing[0]) return existing[0];
  const pending = pendingWorkoutLocks.get(date);
  if (pending) return pending;
  const promise = createWorkout(date);
  pendingWorkoutLocks.set(date, promise);
  try {
    return await promise;
  } finally {
    pendingWorkoutLocks.delete(date);
  }
}

export async function createWorkout(date = toDateKey(), name?: string): Promise<Workout> {
  const settings = await settingsRepo.get();
  const now = Date.now();
  const workout: Workout = {
    id: createId('wo'),
    date,
    name: name?.trim() || settings.defaultWorkoutName,
    notes: '',
    startedAt: now,
    finishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await workoutRepo.put(workout);
  undoService.push('Delete workout', async () => {
    await deleteWorkout(workout.id, false);
  });
  return workout;
}

export async function getWorkoutBundle(workoutId: string): Promise<WorkoutBundle | null> {
  const workout = await workoutRepo.getById(workoutId);
  if (!workout) return null;
  const [wes, allSets, allExercises] = await Promise.all([
    workoutExerciseRepo.getByWorkout(workoutId),
    setRepo.getAllForWorkout(workoutId),
    exerciseRepo.getAll(),
  ]);
  const setsByWE = new Map<string, SetEntry[]>();
  for (const s of allSets) {
    const arr = setsByWE.get(s.workoutExerciseId);
    if (arr) arr.push(s);
    else setsByWE.set(s.workoutExerciseId, [s]);
  }
  const exerciseMap = new Map(allExercises.map((e) => [e.id, e]));
  const exercises = wes.map((we) => ({
    workoutExercise: we,
    sets: (setsByWE.get(we.id) ?? []).sort(
      (a, b) => a.setNumber - b.setNumber || a.createdAt - b.createdAt,
    ),
    exercise: exerciseMap.get(we.exerciseId),
  }));
  return { workout, exercises };
}

export async function updateWorkout(
  id: string,
  patch: Partial<Pick<Workout, 'name' | 'notes' | 'date' | 'finishedAt'>>,
): Promise<Workout> {
  const existing = await workoutRepo.getById(id);
  if (!existing) throw new Error('Workout not found');
  const next: Workout = { ...existing, ...patch, updatedAt: Date.now() };
  await workoutRepo.put(next);
  return next;
}

export async function deleteWorkout(id: string, withUndo = true): Promise<void> {
  const bundle = await getWorkoutBundle(id);
  if (!bundle) return;
  await workoutExerciseRepo.deleteByWorkout(id);
  await workoutRepo.delete(id);
  if (withUndo) {
    undoService.push('Restore workout', async () => {
      const db = await getDb();
      const tx = db.transaction(['workouts', 'workoutExercises', 'sets'], 'readwrite');
      await tx.objectStore('workouts').put(bundle.workout as never);
      for (const block of bundle.exercises) {
        await tx.objectStore('workoutExercises').put(block.workoutExercise as never);
        for (const s of block.sets) {
          await tx.objectStore('sets').put(s as never);
        }
      }
      await tx.done;
    });
  }
}

export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string,
): Promise<WorkoutExercise> {
  const exercise = await exerciseRepo.getById(exerciseId);
  if (!exercise) throw new Error('Exercise not found');
  const existing = await workoutExerciseRepo.getByWorkout(workoutId);
  const now = Date.now();
  const we: WorkoutExercise = {
    id: createId('we'),
    workoutId,
    exerciseId,
    sortOrder: Math.max(...existing.map(e => e.sortOrder), -1) + 1,
    notes: '',
    exerciseName: exercise.name,
    metric: exercise.metric,
    createdAt: now,
    updatedAt: now,
  };
  await workoutExerciseRepo.put(we);
  undoService.push('Remove exercise from workout', async () => {
    await setRepo.deleteByWorkoutExercise(we.id);
    await workoutExerciseRepo.delete(we.id);
  });
  return we;
}

export async function removeWorkoutExercise(workoutExerciseId: string): Promise<void> {
  const we = await workoutExerciseRepo.getById(workoutExerciseId);
  if (!we) return;
  const sets = await setRepo.getByWorkoutExercise(workoutExerciseId);
  await setRepo.deleteByWorkoutExercise(workoutExerciseId);
  await workoutExerciseRepo.delete(workoutExerciseId);
  undoService.push('Restore exercise block', async () => {
    const db = await getDb();
    const tx = db.transaction(['workoutExercises', 'sets'], 'readwrite');
    await tx.objectStore('workoutExercises').put(we as never);
    for (const s of sets) {
      await tx.objectStore('sets').put(s as never);
    }
    await tx.done;
  });
}

export async function addSet(input: {
  workoutExerciseId: string;
  weight?: number | null;
  reps?: number | null;
  durationSec?: number | null;
  distance?: number | null;
  rpe?: number | null;
  isWarmup?: boolean;
  notes?: string;
  setNumber?: number;
  programSource?: ProgramSource;
}): Promise<{ set: SetEntry; isPR: boolean }> {
  const we = await workoutExerciseRepo.getById(input.workoutExerciseId);
  if (!we) throw new Error('Workout exercise not found');
  const workout = await workoutRepo.getById(we.workoutId);
  if (!workout) throw new Error('Workout not found');

  const existing = await setRepo.getByWorkoutExercise(input.workoutExerciseId);
  const now = Date.now();
  const set: SetEntry = {
    id: createId('set'),
    workoutExerciseId: input.workoutExerciseId,
    setNumber: input.setNumber ?? existing.length + 1,
    weight: input.weight ?? null,
    reps: input.reps ?? null,
    durationSec: input.durationSec ?? null,
    distance: input.distance ?? null,
    rpe: input.rpe ?? null,
    isWarmup: input.isWarmup ?? false,
    isPR: false,
    notes: input.notes?.trim() ?? '',
    programSource: input.programSource,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const pr = await evaluateSetPR(we.exerciseId, we.metric, set, workout.id, workout.date);
  set.isPR = pr.isPR;
  await setRepo.put(set);

  // Touch workout
  await workoutRepo.put({ ...workout, updatedAt: now });

  // Auto-start session timer on first set of the workout
  if (!sessionTimerService.isRunning()) {
    const existingSets = await setRepo.getAllForWorkout(workout.id);
    if (existingSets.length === 1) {
      sessionTimerService.start();
    }
  }

  const settings = getSettingsSync() ?? await settingsRepo.get();
  if (settings.autoStartRest && !set.isWarmup) {
    restTimerService.start(settings.restTimerSec);
  }

  undoService.push('Delete set', async () => {
    await setRepo.delete(set.id);
  });

  return { set, isPR: pr.isPR };
}

export async function updateSet(
  id: string,
  patch: Partial<
    Pick<SetEntry, 'weight' | 'reps' | 'durationSec' | 'distance' | 'rpe' | 'isWarmup' | 'notes' | 'programSource'>
  >,
): Promise<SetEntry> {
  const existing = await setRepo.getById(id);
  if (!existing) throw new Error('Set not found');
  const next: SetEntry = {
    ...existing,
    ...patch,
    notes: patch.notes !== undefined ? patch.notes.trim() : existing.notes,
    updatedAt: Date.now(),
  };
  await setRepo.put(next);
  return next;
}

export async function deleteSet(id: string): Promise<void> {
  const existing = await setRepo.getById(id);
  if (!existing) return;
  await setRepo.delete(id);
  undoService.push('Restore set', async () => {
    await setRepo.put(existing);
  });
}

/** Copy last workout's exercise structure (no sets) into target date. */
export async function copyPreviousWorkout(targetDate: string): Promise<Workout | null> {
  const recent = await workoutRepo.getRecent(30);
  const previous = recent.find((w) => w.date < targetDate) ?? recent.find((w) => w.date !== targetDate);
  if (!previous) return null;

  const target = await getOrCreateWorkoutForDate(targetDate);
  const wes = await workoutExerciseRepo.getByWorkout(previous.id);
  for (const we of wes) {
    const already = await workoutExerciseRepo.getByWorkout(target.id);
    if (already.some((a) => a.exerciseId === we.exerciseId)) continue;
    await addExerciseToWorkout(target.id, we.exerciseId);
  }
  return target;
}

/** Duplicate full workout including sets onto a new date. */
export async function duplicateWorkout(sourceId: string, targetDate: string): Promise<Workout> {
  const bundle = await getWorkoutBundle(sourceId);
  if (!bundle) throw new Error('Source workout not found');
  const clone = await createWorkout(targetDate, bundle.workout.name);
  await updateWorkout(clone.id, { notes: bundle.workout.notes });

  for (const block of bundle.exercises) {
    const we = await addExerciseToWorkout(clone.id, block.workoutExercise.exerciseId);
    for (const s of block.sets) {
      await addSet({
        workoutExerciseId: we.id,
        weight: s.weight,
        reps: s.reps,
        durationSec: s.durationSec,
        distance: s.distance,
        rpe: s.rpe,
        isWarmup: s.isWarmup,
        notes: s.notes,
      });
    }
  }
  // disable rest timer spam after bulk
  restTimerService.stop();
  return clone;
}

export async function copyWorkoutToToday(sourceWorkoutId: string): Promise<Workout> {
  const bundle = await getWorkoutBundle(sourceWorkoutId);
  if (!bundle) throw new Error('Source workout not found');
  const todayKey = toDateKey();
  const target = await getOrCreateWorkoutForDate(todayKey);
  const existingWEs = await workoutExerciseRepo.getByWorkout(target.id);

  for (const block of bundle.exercises) {
    const match = existingWEs.find((we) => we.exerciseId === block.workoutExercise.exerciseId);
    if (match) {
      for (const s of block.sets) {
        await addSet({
          workoutExerciseId: match.id,
          weight: s.weight,
          reps: s.reps,
          durationSec: s.durationSec,
          distance: s.distance,
          rpe: s.rpe,
          isWarmup: s.isWarmup,
          notes: s.notes,
        });
      }
    } else {
      const we = await addExerciseToWorkout(target.id, block.workoutExercise.exerciseId);
      for (const s of block.sets) {
        await addSet({
          workoutExerciseId: we.id,
          weight: s.weight,
          reps: s.reps,
          durationSec: s.durationSec,
          distance: s.distance,
          rpe: s.rpe,
          isWarmup: s.isWarmup,
          notes: s.notes,
        });
      }
    }
  }
  restTimerService.stop();
  return target;
}

export async function saveWorkoutAsTemplate(workoutId: string, name: string): Promise<Template> {
  const bundle = await getWorkoutBundle(workoutId);
  if (!bundle) throw new Error('Workout not found');
  const now = Date.now();
  const template: Template = {
    id: createId('tpl'),
    name: name.trim() || bundle.workout.name,
    notes: bundle.workout.notes,
    createdAt: now,
    updatedAt: now,
  };
  await templateRepo.put(template);
  let order = 0;
  for (const block of bundle.exercises) {
    const last = block.sets.filter((s) => !s.isWarmup).at(-1);
    const te: TemplateExercise = {
      id: createId('te'),
      templateId: template.id,
      exerciseId: block.workoutExercise.exerciseId,
      sortOrder: order++,
      notes: block.workoutExercise.notes,
      targetSets: Math.max(1, block.sets.filter((s) => !s.isWarmup).length || 3),
      targetReps: last?.reps ?? null,
      targetWeight: last?.weight ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await templateExerciseRepo.put(te);
  }
  return template;
}

export async function applyTemplate(templateId: string, date: string): Promise<Workout> {
  const template = await templateRepo.getById(templateId);
  if (!template) throw new Error('Template not found');
  const tes = await templateExerciseRepo.getByTemplate(templateId);
  const workout = await getOrCreateWorkoutForDate(date);
  await updateWorkout(workout.id, { name: template.name, notes: template.notes });
  for (const te of tes) {
    const we = await addExerciseToWorkout(workout.id, te.exerciseId);
    if (te.notes) {
      await workoutExerciseRepo.put({ ...we, notes: te.notes, updatedAt: Date.now() });
    }
  }
  return workout;
}

export async function listTemplates(): Promise<Template[]> {
  return templateRepo.getSorted();
}

export async function deleteTemplate(id: string): Promise<void> {
  await templateExerciseRepo.deleteByTemplate(id);
  await templateRepo.delete(id);
}

export async function getLastPerformance(exerciseId: string): Promise<SetEntry[]> {
  const wes = await workoutExerciseRepo.getByExercise(exerciseId);
  const allWorkouts = await workoutRepo.getAll();
  const workoutMap = new Map(allWorkouts.map((w) => [w.id, w]));
  const withDates: Array<{ we: WorkoutExercise; date: string; createdAt: number }> = [];
  for (const we of wes) {
    const w = workoutMap.get(we.workoutId);
    if (w) withDates.push({ we, date: w.date, createdAt: w.createdAt });
  }
  withDates.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const latest = withDates[0];
  if (!latest) return [];
  return setRepo.getByWorkoutExercise(latest.we.id);
}

export async function getExerciseHistory(
  exerciseId: string,
  /** Max sets to return. Omit / `0` / `Infinity` = full history. */
  limit?: number,
): Promise<Array<{ set: SetEntry; date: string; workoutId: string }>> {
  const wes = await workoutExerciseRepo.getByExercise(exerciseId);
  if (wes.length === 0) return [];
  const uniqueWorkoutIds = [...new Set(wes.map((w) => w.workoutId))];
  const allWorkouts = await Promise.all(uniqueWorkoutIds.map((id) => workoutRepo.getById(id)));
  const workoutMap = new Map<string, Workout>();
  for (const w of allWorkouts) {
    if (w) workoutMap.set(w.id, w);
  }
  const setsByWE = new Map<string, SetEntry[]>();
  for (const we of wes) {
    const sets = await setRepo.getByWorkoutExercise(we.id);
    setsByWE.set(we.id, sets);
  }
  const rows: Array<{ set: SetEntry; date: string; workoutId: string }> = [];
  for (const we of wes) {
    const w = workoutMap.get(we.workoutId);
    if (!w) continue;
    const sets = setsByWE.get(we.id) ?? [];
    for (const set of sets) {
      rows.push({ set, date: w.date, workoutId: w.id });
    }
  }
  rows.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.set.setNumber - a.set.setNumber ||
      b.set.completedAt - a.set.completedAt,
  );
  if (limit == null || limit <= 0 || !Number.isFinite(limit)) return rows;
  return rows.slice(0, limit);
}

export async function findExerciseInWorkout(
  workoutId: string,
  exerciseName: string,
): Promise<WorkoutExercise | undefined> {
  const wes = await workoutExerciseRepo.getByWorkout(workoutId);
  return wes.find((we) => we.exerciseName.toLowerCase() === exerciseName.toLowerCase());
}

/** Find a WorkoutExercise by its library Exercise.id (identity-based, not name-based). */
export async function findExerciseInWorkoutById(
  workoutId: string,
  exerciseId: string,
): Promise<WorkoutExercise | undefined> {
  const wes = await workoutExerciseRepo.getByWorkout(workoutId);
  return wes.find((we) => we.exerciseId === exerciseId);
}

export async function reorderExercises(
  workoutId: string,
  orderedWEIds: string[],
): Promise<void> {
  const wes = await workoutExerciseRepo.getByWorkout(workoutId);
  for (let i = 0; i < orderedWEIds.length; i++) {
    const we = wes.find((w) => w.id === orderedWEIds[i]);
    if (we && we.sortOrder !== i) {
      await workoutExerciseRepo.put({ ...we, sortOrder: i, updatedAt: Date.now() });
    }
  }
}

export async function addExerciseWithSets(
  workoutId: string,
  exerciseId: string,
  sets: Array<{ weight?: number | null; reps?: number | null }>,
): Promise<WorkoutExercise> {
  const we = await addExerciseToWorkout(workoutId, exerciseId);
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i]!;
    await addSet({
      workoutExerciseId: we.id,
      weight: s.weight ?? null,
      reps: s.reps ?? null,
      setNumber: i + 1,
    });
  }
  return we;
}
