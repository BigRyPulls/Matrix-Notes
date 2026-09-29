import type { Measurement, MeasurementType } from '../../types';
import { BaseRepository } from './base.repo';
import { getDb } from '../db';

class MeasurementRepository extends BaseRepository<Measurement> {
  protected readonly storeName = 'measurements' as const;

  async getByType(type: MeasurementType): Promise<Measurement[]> {
    const db = await getDb();
    const list = await db.getAllFromIndex('measurements', 'by-type', type);
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }

  async getByDate(date: string): Promise<Measurement[]> {
    const db = await getDb();
    return db.getAllFromIndex('measurements', 'by-date', date);
  }

  async getRecent(limit = 100): Promise<Measurement[]> {
    const all = await this.getAll();
    return all
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}

export const measurementRepo = new MeasurementRepository();
