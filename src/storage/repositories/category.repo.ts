import type { Category } from '../../types';
import { BaseRepository } from './base.repo';
import { getDb } from '../db';

class CategoryRepository extends BaseRepository<Category> {
  protected readonly storeName = 'categories' as const;

  async getSorted(): Promise<Category[]> {
    const db = await getDb();
    return db.getAllFromIndex('categories', 'by-sort');
  }

  async getByName(name: string): Promise<Category | undefined> {
    const all = await this.getAll();
    const lower = name.toLowerCase();
    return all.find((c) => c.name.toLowerCase() === lower);
  }

  async deleteCascade(id: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['categories', 'exercises'], 'readwrite');
    await tx.objectStore('categories').delete(id);
    const exIdx = tx.objectStore('exercises').index('by-category');
    let cursor = await exIdx.openCursor(id);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}

export const categoryRepo = new CategoryRepository();
