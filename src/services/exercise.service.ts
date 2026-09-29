import type { Category, Exercise, ExerciseMetric } from '../types';
import { createId } from '../utils/id';
import { categoryRepo, exerciseRepo } from '../storage/repositories';
import { undoService } from './undo.service';

export async function listCategories(): Promise<Category[]> {
  return categoryRepo.getSorted();
}

export async function listExercises(opts?: {
  categoryId?: string;
  query?: string;
  includeArchived?: boolean;
}): Promise<Exercise[]> {
  if (opts?.query) {
    const found = await exerciseRepo.search(opts.query, opts.includeArchived);
    if (opts.categoryId) return found.filter((e) => e.categoryId === opts.categoryId);
    return found;
  }
  if (opts?.categoryId) {
    const list = await exerciseRepo.getByCategory(opts.categoryId);
    return opts.includeArchived ? list : list.filter((e) => !e.archived);
  }
  return opts?.includeArchived ? exerciseRepo.getAll().then((a) => a.sort((x, y) => x.name.localeCompare(y.name))) : exerciseRepo.getActive();
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
  return exerciseRepo.getById(id);
}

export async function createExercise(input: {
  name: string;
  categoryId: string;
  metric: ExerciseMetric;
  notes?: string;
}): Promise<Exercise> {
  const now = Date.now();
  const exercise: Exercise = {
    id: createId('ex'),
    name: input.name.trim(),
    categoryId: input.categoryId,
    metric: input.metric,
    notes: input.notes?.trim() ?? '',
    isCustom: true,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  await exerciseRepo.put(exercise);
  undoService.push('Delete exercise', async () => {
    await exerciseRepo.delete(exercise.id);
  });
  return exercise;
}

export async function updateExercise(
  id: string,
  patch: Partial<Pick<Exercise, 'name' | 'categoryId' | 'metric' | 'notes' | 'archived'>>,
): Promise<Exercise> {
  const existing = await exerciseRepo.getById(id);
  if (!existing) throw new Error('Exercise not found');
  const prev = { ...existing };
  const next: Exercise = {
    ...existing,
    ...patch,
    name: patch.name?.trim() ?? existing.name,
    notes: patch.notes !== undefined ? patch.notes.trim() : existing.notes,
    updatedAt: Date.now(),
  };
  await exerciseRepo.put(next);
  undoService.push('Undo exercise edit', async () => {
    await exerciseRepo.put(prev);
  });
  return next;
}

export async function deleteExercise(id: string): Promise<void> {
  const existing = await exerciseRepo.getById(id);
  if (!existing) return;
  await exerciseRepo.delete(id);
  undoService.push('Restore exercise', async () => {
    await exerciseRepo.put(existing);
  });
}

export async function createCategory(name: string, color = '#39ff88'): Promise<Category> {
  const all = await categoryRepo.getSorted();
  const now = Date.now();
  const cat: Category = {
    id: createId('cat'),
    name: name.trim(),
    sortOrder: all.length,
    color,
    createdAt: now,
    updatedAt: now,
  };
  await categoryRepo.put(cat);
  return cat;
}

export async function getCategoryMap(): Promise<Map<string, Category>> {
  const cats = await categoryRepo.getSorted();
  return new Map(cats.map((c) => [c.id, c]));
}
