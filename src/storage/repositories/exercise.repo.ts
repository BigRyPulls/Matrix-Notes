import type { Exercise } from '../../types';
import { BaseRepository } from './base.repo';
import { getDb } from '../db';

class ExerciseRepository extends BaseRepository<Exercise> {
  protected readonly storeName = 'exercises' as const;

  async getByCategory(categoryId: string): Promise<Exercise[]> {
    const db = await getDb();
    const list = await db.getAllFromIndex('exercises', 'by-category', categoryId);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  async search(query: string, includeArchived = false): Promise<Exercise[]> {
    const q = query.trim().toLowerCase();
    const all = await this.getAll();
    return all
      .filter((e) => (includeArchived || !e.archived) && (!q || e.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getActive(): Promise<Exercise[]> {
    const all = await this.getAll();
    return all.filter((e) => !e.archived).sort((a, b) => a.name.localeCompare(b.name));
  }
}

export const exerciseRepo = new ExerciseRepository();
