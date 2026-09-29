import { DEFAULT_CATALOG } from '../data/default-exercises';
import type { Category, Exercise } from '../types';
import { createId } from '../utils/id';
import { categoryRepo, exerciseRepo, settingsRepo } from '../storage/repositories';

const SEED_FLAG = 'matrixnotes_seeded_v1';

export async function ensureSeeded(): Promise<void> {
  // Always ensure settings exist
  await settingsRepo.get();

  const catCount = await categoryRepo.count();
  if (catCount > 0) {
    try {
      localStorage.setItem(SEED_FLAG, '1');
    } catch {
      /* ignore */
    }
    return;
  }

  const now = Date.now();
  const categories: Category[] = [];
  const exercises: Exercise[] = [];

  DEFAULT_CATALOG.forEach((seed, i) => {
    const catId = createId('cat');
    categories.push({
      id: catId,
      name: seed.name,
      sortOrder: i,
      color: seed.color,
      createdAt: now,
      updatedAt: now,
    });
    for (const ex of seed.exercises) {
      exercises.push({
        id: createId('ex'),
        name: ex.name,
        categoryId: catId,
        metric: ex.metric,
        notes: '',
        isCustom: false,
        archived: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  await categoryRepo.putMany(categories);
  await exerciseRepo.putMany(exercises);
  try {
    localStorage.setItem(SEED_FLAG, '1');
  } catch {
    /* ignore */
  }
}
