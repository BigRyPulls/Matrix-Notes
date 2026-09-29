import type { ExportPayload } from '../types';
import { clearAllData, getDb } from '../storage/db';
import {
  categoryRepo,
  exerciseRepo,
  measurementRepo,
  prRepo,
  settingsRepo,
  setRepo,
  templateExerciseRepo,
  templateRepo,
  workoutExerciseRepo,
  workoutRepo,
} from '../storage/repositories';
import { markBackupCompleted } from './backup-reminder.service';
import { ensureSeeded } from './seed.service';

export async function buildExport(): Promise<ExportPayload> {
  const [
    categories,
    exercises,
    workouts,
    workoutExercises,
    sets,
    templates,
    templateExercises,
    measurements,
    personalRecords,
    settings,
  ] = await Promise.all([
    categoryRepo.getAll(),
    exerciseRepo.getAll(),
    workoutRepo.getAll(),
    workoutExerciseRepo.getAll(),
    setRepo.getAll(),
    templateRepo.getAll(),
    templateExerciseRepo.getAll(),
    measurementRepo.getAll(),
    prRepo.getAll(),
    settingsRepo.get(),
  ]);

  let customPrograms: string | undefined;
  let programConfigs: string | undefined;
  let exerciseMappings: string | undefined;
  try {
    customPrograms = localStorage.getItem('matrixnotes_custom_programs') ?? undefined;
    programConfigs = localStorage.getItem('matrixnotes_programs') ?? undefined;
    exerciseMappings = localStorage.getItem('matrixnotes_exercise_mappings') ?? undefined;
  } catch { /* best-effort */ }

  return {
    version: 2,
    exportedAt: Date.now(),
    app: 'MatrixNotes',
    categories,
    exercises,
    workouts,
    workoutExercises,
    sets,
    templates,
    templateExercises,
    measurements,
    personalRecords,
    settings,
    customPrograms,
    programConfigs,
    exerciseMappings,
  };
}

export async function exportToJsonFile(): Promise<void> {
  const payload = await buildExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `matrixnotes-export-${stamp}.json`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  await markBackupCompleted();
}

export async function importFromJson(raw: string, mode: 'merge' | 'replace' = 'replace'): Promise<void> {
  const rawObj = JSON.parse(raw) as Record<string, unknown>;
  if (!rawObj || rawObj.app !== 'MatrixNotes') {
    throw new Error('Invalid MatrixNotes export file');
  }
  const importVersion = typeof rawObj.version === 'number' ? rawObj.version : 0;
  if (importVersion !== 1 && importVersion !== 2) {
    throw new Error('Unsupported export version — expect version 1 or 2');
  }
  const data = rawObj as unknown as ExportPayload;
  // Tolerate partial payloads from converters
  data.categories ??= [];
  data.exercises ??= [];
  data.workouts ??= [];
  data.workoutExercises ??= [];
  data.sets ??= [];
  data.templates ??= [];
  data.templateExercises ??= [];
  data.measurements ??= [];
  data.personalRecords ??= [];

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

  if (mode === 'replace') {
    await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
  }

  await Promise.all([
    ...data.categories.map((c) => tx.objectStore('categories').put(c)),
    ...data.exercises.map((e) => tx.objectStore('exercises').put(e)),
    ...data.workouts.map((w) => tx.objectStore('workouts').put(w)),
    ...data.workoutExercises.map((w) => tx.objectStore('workoutExercises').put(w)),
    ...data.sets.map((s) => tx.objectStore('sets').put(s)),
    ...data.templates.map((t) => tx.objectStore('templates').put(t)),
    ...data.templateExercises.map((t) => tx.objectStore('templateExercises').put(t)),
    ...data.measurements.map((m) => tx.objectStore('measurements').put(m)),
    ...data.personalRecords.map((p) => tx.objectStore('personalRecords').put(p)),
    tx.objectStore('settings').put({ ...data.settings, id: 'settings' }),
  ]);
  await tx.done;

  // Restore localStorage program data (v2+ payloads)
  if (data.customPrograms) {
    try { localStorage.setItem('matrixnotes_custom_programs', data.customPrograms); } catch { /* best-effort */ }
  }
  if (data.programConfigs) {
    try { localStorage.setItem('matrixnotes_programs', data.programConfigs); } catch { /* best-effort */ }
  }
  if (data.exerciseMappings) {
    try { localStorage.setItem('matrixnotes_exercise_mappings', data.exerciseMappings); } catch { /* best-effort */ }
  }
}

export async function resetAndReseed(): Promise<void> {
  await clearAllData();
  try {
    localStorage.removeItem('matrixnotes_seeded_v1');
  } catch {
    /* ignore */
  }
  await ensureSeeded();
}
