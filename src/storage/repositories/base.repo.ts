import type { MatrixDB } from '../db';
import { getDb } from '../db';

export type ObjectStoreName =
  | 'categories'
  | 'exercises'
  | 'workouts'
  | 'workoutExercises'
  | 'sets'
  | 'templates'
  | 'templateExercises'
  | 'measurements'
  | 'personalRecords'
  | 'settings';

/** Minimal typed repository helpers over idb. */
export abstract class BaseRepository<T extends { id: string }> {
  protected abstract readonly storeName: ObjectStoreName;

  protected async db(): Promise<MatrixDB> {
    return getDb();
  }

  async getAll(): Promise<T[]> {
    const db = await this.db();
    // idb store generics are fixed on the DB schema; cast at the boundary.
    return (await db.getAll(this.storeName as 'categories')) as unknown as T[];
  }

  async getById(id: string): Promise<T | undefined> {
    const db = await this.db();
    return (await db.get(this.storeName as 'categories', id)) as unknown as T | undefined;
  }

  async put(entity: T): Promise<void> {
    const db = await this.db();
    await db.put(this.storeName as 'categories', entity as never);
  }

  async putMany(entities: T[]): Promise<void> {
    if (entities.length === 0) return;
    const db = await this.db();
    const tx = db.transaction(this.storeName as 'categories', 'readwrite');
    await Promise.all(entities.map((e) => tx.store.put(e as never)));
    await tx.done;
  }

  async delete(id: string): Promise<void> {
    const db = await this.db();
    await db.delete(this.storeName as 'categories', id);
  }

  async count(): Promise<number> {
    const db = await this.db();
    return db.count(this.storeName as 'categories');
  }
}
