import type { DaySummary, Workout, WorkoutExercise } from '../types';
import { addDays, startOfMonth, daysInMonth, toDateKey } from '../utils/date';
import { categoryRepo, exerciseRepo, setRepo, workoutExerciseRepo, workoutRepo } from '../storage/repositories';

export async function getMonthSummaries(monthKey: string): Promise<Map<string, DaySummary>> {
  const start = startOfMonth(monthKey);
  const dim = daysInMonth(monthKey);
  const end = `${start.slice(0, 8)}${String(dim).padStart(2, '0')}`;
  const [workouts, allWes, allSets] = await Promise.all([
    workoutRepo.getBetween(start, end),
    workoutExerciseRepo.getAll(),
    setRepo.getAll(),
  ]);

  const workoutIds = new Set(workouts.map((w) => w.id));
  const wesByWorkout = new Map<string, WorkoutExercise[]>();
  for (const we of allWes) {
    if (!workoutIds.has(we.workoutId)) continue;
    if (!wesByWorkout.has(we.workoutId)) wesByWorkout.set(we.workoutId, []);
    wesByWorkout.get(we.workoutId)!.push(we);
  }

  const setCountByWe = new Map<string, number>();
  for (const s of allSets) {
    setCountByWe.set(s.workoutExerciseId, (setCountByWe.get(s.workoutExerciseId) ?? 0) + 1);
  }

  const map = new Map<string, DaySummary>();
  for (const w of workouts) {
    const wes = wesByWorkout.get(w.id) ?? [];
    let setCount = 0;
    for (const we of wes) {
      setCount += setCountByWe.get(we.id) ?? 0;
    }
    if (map.has(w.date)) {
      const existing = map.get(w.date)!;
      existing.workoutCount += 1;
      existing.setCount += setCount;
      existing.exerciseCount += wes.length;
      existing.workoutIds.push(w.id);
    } else {
      map.set(w.date, {
        date: w.date,
        workoutCount: 1,
        setCount,
        exerciseCount: wes.length,
        workoutIds: [w.id],
      });
    }
  }
  return map;
}

export async function listWorkouts(limit = 100): Promise<Workout[]> {
  return workoutRepo.getRecent(limit);
}

export async function listWorkoutsWithCounts(limit = 100): Promise<
  Array<{ workout: Workout; exerciseCount: number; setCount: number }>
> {
  const workouts = await workoutRepo.getRecent(limit);
  const workoutIds = new Set(workouts.map((w) => w.id));
  const [allWes, allSets] = await Promise.all([
    workoutExerciseRepo.getAll(),
    setRepo.getAll(),
  ]);

  const wesByWorkout = new Map<string, WorkoutExercise[]>();
  for (const we of allWes) {
    if (!workoutIds.has(we.workoutId)) continue;
    if (!wesByWorkout.has(we.workoutId)) wesByWorkout.set(we.workoutId, []);
    wesByWorkout.get(we.workoutId)!.push(we);
  }

  const setCountByWe = new Map<string, number>();
  for (const s of allSets) {
    setCountByWe.set(s.workoutExerciseId, (setCountByWe.get(s.workoutExerciseId) ?? 0) + 1);
  }

  return workouts.map((workout) => {
    const wes = wesByWorkout.get(workout.id) ?? [];
    let setCount = 0;
    for (const we of wes) {
      setCount += setCountByWe.get(we.id) ?? 0;
    }
    return { workout, exerciseCount: wes.length, setCount };
  });
}

export async function getWorkoutDates(): Promise<Set<string>> {
  return workoutRepo.getDatesWithWorkouts();
}

export async function getWorkoutMuscleGroups(): Promise<Map<string, string[]>> {
  const [workouts, allWes, allExercises, allCategories] = await Promise.all([
    workoutRepo.getAll(),
    workoutExerciseRepo.getAll(),
    exerciseRepo.getAll(),
    categoryRepo.getAll(),
  ]);

  const exMap = new Map(allExercises.map((e) => [e.id, e]));
  const catMap = new Map(allCategories.map((c) => [c.id, c.name]));
  const wesByWorkout = new Map<string, WorkoutExercise[]>();
  for (const we of allWes) {
    if (!wesByWorkout.has(we.workoutId)) wesByWorkout.set(we.workoutId, []);
    wesByWorkout.get(we.workoutId)!.push(we);
  }

  const result = new Map<string, string[]>();
  const seenDates = new Set<string>();

  for (const w of workouts) {
    if (seenDates.has(w.date)) continue;
    seenDates.add(w.date);
    const wes = wesByWorkout.get(w.id) ?? [];
    const groups = new Set<string>();
    for (const we of wes) {
      const ex = exMap.get(we.exerciseId);
      if (ex) {
        const catName = catMap.get(ex.categoryId);
        if (catName) groups.add(catName);
      }
    }
    if (groups.size > 0) result.set(w.date, [...groups]);
  }
  return result;
}

export async function getStats(): Promise<{
  totalWorkouts: number;
  totalSets: number;
  streak: number;
}> {
  const [workouts, allWes, allSets] = await Promise.all([
    workoutRepo.getAll(),
    workoutExerciseRepo.getAll(),
    setRepo.getAll(),
  ]);

  const weToWorkout = new Map<string, string>();
  for (const we of allWes) {
    weToWorkout.set(we.id, we.workoutId);
  }

  const setCountByWorkout = new Map<string, number>();
  for (const s of allSets) {
    const workoutId = weToWorkout.get(s.workoutExerciseId);
    if (workoutId) {
      setCountByWorkout.set(workoutId, (setCountByWorkout.get(workoutId) ?? 0) + 1);
    }
  }

  const dates = new Set(workouts.map((w) => w.date));
  let totalSets = 0;
  for (const w of workouts) {
    totalSets += setCountByWorkout.get(w.id) ?? 0;
  }

  let streak = 0;
  let cursor = toDateKey();
  if (!dates.has(cursor)) {
    cursor = addDays(cursor, -1);
  }
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return { totalWorkouts: workouts.length, totalSets, streak };
}
