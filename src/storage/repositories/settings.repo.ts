import type { AppSettings } from '../../types';
import { getDb } from '../db';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings',
  weightUnit: 'kg',
  distanceUnit: 'km',
  restTimerSec: 90,
  autoStartRest: false,
  showWarmupSets: true,
  defaultWorkoutName: 'Workout',
  weekStartsOn: 1,
  haptics: true,
  confirmDelete: true,
  keepScreenOn: false,
  firstOpenAt: 0,
  backupIntroSeen: false,
  lastBackupAt: 0,
  lastBackupPromptAt: 0,
  updatedAt: 0,
};

class SettingsRepository {
  async get(): Promise<AppSettings> {
    const db = await getDb();
    const existing = await db.get('settings', 'settings');
    if (existing) return { ...DEFAULT_SETTINGS, ...existing };
    const seed: AppSettings = { ...DEFAULT_SETTINGS, updatedAt: Date.now() };
    await db.put('settings', seed);
    return seed;
  }

  async save(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const next: AppSettings = {
      ...current,
      ...partial,
      id: 'settings',
      updatedAt: Date.now(),
    };
    const db = await getDb();
    await db.put('settings', next);
    return next;
  }
}

export const settingsRepo = new SettingsRepository();
