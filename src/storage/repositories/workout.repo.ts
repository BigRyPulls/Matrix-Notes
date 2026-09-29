import type { SetEntry, Workout, WorkoutExercise } from '../../types';
import { BaseRepository } from './base.repo';
import { getDb } from '../db';

class WorkoutRepository extends BaseRepository<Workout> {
  protected readonly storeName = 'workouts' as const;

  async getByDate(date: string): Promise<Workout[]> {
    const db = await getDb();
    const list = await db.getAllFromIndex('workouts', 'by-date', date);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getBetween(startDate: string, endDate: string): Promise<Workout[]> {
    const db = await getDb();
    const range = IDBKeyRange.bound(startDate, endDate);
    const list = await db.getAllFromIndex('workouts', 'by-date', range);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getRecent(limit = 50): Promise<Workout[]> {
    const db = await getDb();
    const tx = db.transaction('workouts');
    const idx = tx.store.index('by-date');
    const results: Workout[] = [];
    let cursor = await idx.openCursor(null, 'prev');
    while (cursor && results.length < limit) {
      results.push(cursor.value);
      cursor = await cursor.continue();
    }
    return results;
  }

  async getDatesWithWorkouts(): Promise<Set<string>> {
    const db = await getDb();
    const tx = db.transaction('workouts');
    const idx = tx.store.index('by-date');
    const dates = new Set<string>();
    let cursor = await idx.openCursor(null, 'next');
    while (cursor) {
      dates.add(String(cursor.key));
      cursor = await cursor.continue();
    }
    return dates;
  }
}

class WorkoutExerciseRepository extends BaseRepository<WorkoutExercise> {
  protected readonly storeName = 'workoutExercises' as const;

  async getByWorkout(workoutId: string): Promise<WorkoutExercise[]> {
    const db = await getDb();
    const list = await db.getAllFromIndex('workoutExercises', 'by-workout', workoutId);
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getByExercise(exerciseId: string): Promise<WorkoutExercise[]> {
    const db = await getDb();
    return db.getAllFromIndex('workoutExercises', 'by-exercise', exerciseId);
  }

  async deleteByWorkout(workoutId: string): Promise<void> {
    const items = await this.getByWorkout(workoutId);
    const db = await getDb();
    const tx = db.transaction(['workoutExercises', 'sets'], 'readwrite');
    for (const we of items) {
      const setIdx = tx.objectStore('sets').index('by-workoutExercise');
      let cursor = await setIdx.openCursor(we.id);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.objectStore('workoutExercises').delete(we.id);
    }
    await tx.done;
  }
}

class SetRepository extends BaseRepository<SetEntry> {
  protected readonly storeName = 'sets' as const;

  async getByWorkoutExercise(workoutExerciseId: string): Promise<SetEntry[]> {
    const db = await getDb();
    const list = await db.getAllFromIndex('sets', 'by-workoutExercise', workoutExerciseId);
    return list.sort((a, b) => a.setNumber - b.setNumber || a.createdAt - b.createdAt);
  }

  async deleteByWorkoutExercise(workoutExerciseId: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('sets', 'readwrite');
    const idx = tx.store.index('by-workoutExercise');
    let cursor = await idx.openCursor(workoutExerciseId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  async getAllForWorkout(workoutId: string): Promise<SetEntry[]> {
    const wes = await workoutExerciseRepo.getByWorkout(workoutId);
    if (wes.length === 0) return [];
    const db = await getDb();
    const all = await Promise.all(
      wes.map((we) => db.getAllFromIndex('sets', 'by-workoutExercise', we.id)),
    );
    const results = all.flat();
    results.sort((a, b) => a.setNumber - b.setNumber || a.createdAt - b.createdAt);
    return results;
  }
}

export const workoutRepo = new WorkoutRepository();
export const workoutExerciseRepo = new WorkoutExerciseRepository();
export const setRepo = new SetRepository();
