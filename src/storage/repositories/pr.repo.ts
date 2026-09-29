import type { PersonalRecord } from '../../types';
import { BaseRepository } from './base.repo';
import { getDb } from '../db';

class PersonalRecordRepository extends BaseRepository<PersonalRecord> {
  protected readonly storeName = 'personalRecords' as const;

  async getByExercise(exerciseId: string): Promise<PersonalRecord[]> {
    const db = await getDb();
    return db.getAllFromIndex('personalRecords', 'by-exercise', exerciseId);
  }

  async getLatestByKind(
    exerciseId: string,
    kind: PersonalRecord['kind'],
  ): Promise<PersonalRecord | undefined> {
    const list = await this.getByExercise(exerciseId);
    return list
      .filter((p) => p.kind === kind)
      .sort((a, b) => b.achievedAt - a.achievedAt)[0];
  }

  async replaceForExercise(exerciseId: string, records: PersonalRecord[]): Promise<void> {
    const existing = await this.getByExercise(exerciseId);
    const db = await getDb();
    const tx = db.transaction('personalRecords', 'readwrite');
    await Promise.all(existing.map((e) => tx.store.delete(e.id)));
    await Promise.all(records.map((r) => tx.store.put(r)));
    await tx.done;
  }
}

export const prRepo = new PersonalRecordRepository();
