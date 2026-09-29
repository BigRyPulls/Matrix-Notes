import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  AppSettings,
  Category,
  Exercise,
  Measurement,
  PersonalRecord,
  SetEntry,
  Template,
  TemplateExercise,
  Workout,
  WorkoutExercise,
} from '../types';

export const DB_NAME = 'matrixnotes';
export const DB_VERSION = 1;

interface MatrixNotesDB extends DBSchema {
  categories: {
    key: string;
    value: Category;
    indexes: { 'by-sort': number };
  };
  exercises: {
    key: string;
    value: Exercise;
    indexes: { 'by-category': string; 'by-name': string };
  };
  workouts: {
    key: string;
    value: Workout;
    indexes: { 'by-date': string };
  };
  workoutExercises: {
    key: string;
    value: WorkoutExercise;
    indexes: { 'by-workout': string; 'by-exercise': string };
  };
  sets: {
    key: string;
    value: SetEntry;
    indexes: { 'by-workoutExercise': string };
  };
  templates: {
    key: string;
    value: Template;
    indexes: { 'by-name': string };
  };
  templateExercises: {
    key: string;
    value: TemplateExercise;
    indexes: { 'by-template': string };
  };
  measurements: {
    key: string;
    value: Measurement;
    indexes: { 'by-date': string; 'by-type': string };
  };
  personalRecords: {
    key: string;
    value: PersonalRecord;
    indexes: { 'by-exercise': string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

export type MatrixDB = IDBPDatabase<MatrixNotesDB>;

let dbPromise: Promise<MatrixDB> | null = null;

export function getDb(): Promise<MatrixDB> {
  if (!dbPromise) {
    dbPromise = openDB<MatrixNotesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const cats = db.createObjectStore('categories', { keyPath: 'id' });
        cats.createIndex('by-sort', 'sortOrder');

        const ex = db.createObjectStore('exercises', { keyPath: 'id' });
        ex.createIndex('by-category', 'categoryId');
        ex.createIndex('by-name', 'name');

        const wo = db.createObjectStore('workouts', { keyPath: 'id' });
        wo.createIndex('by-date', 'date');

        const we = db.createObjectStore('workoutExercises', { keyPath: 'id' });
        we.createIndex('by-workout', 'workoutId');
        we.createIndex('by-exercise', 'exerciseId');

        const sets = db.createObjectStore('sets', { keyPath: 'id' });
        sets.createIndex('by-workoutExercise', 'workoutExerciseId');

        const tpl = db.createObjectStore('templates', { keyPath: 'id' });
        tpl.createIndex('by-name', 'name');

        const te = db.createObjectStore('templateExercises', { keyPath: 'id' });
        te.createIndex('by-template', 'templateId');

        const meas = db.createObjectStore('measurements', { keyPath: 'id' });
        meas.createIndex('by-date', 'date');
        meas.createIndex('by-type', 'type');

        const prs = db.createObjectStore('personalRecords', { keyPath: 'id' });
        prs.createIndex('by-exercise', 'exerciseId');

        db.createObjectStore('settings', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  const stores = [
    'categories',
    'exercises',
    'workouts',
    'workoutExercises',
    'sets',
    'templates',
    'templateExercises',
    'measurements',
    'personalRecords',
    'settings',
  ] as const;
  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
  await tx.done;
}
