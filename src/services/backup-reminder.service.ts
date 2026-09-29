import type { AppSettings } from '../types';
import { loadSettings, updateSettings } from './settings.service';

/** 7 days in ms */
export const BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export type BackupPromptKind = 'intro' | 'reminder' | null;

/** Ensure first-open timestamp is recorded once. */
export async function ensureFirstOpenTracked(): Promise<AppSettings> {
  const s = await loadSettings();
  if (s.firstOpenAt > 0) return s;
  return updateSettings({ firstOpenAt: Date.now() });
}

/**
 * Decide which overlay to show on this session open.
 * - intro: first visit education
 * - reminder: every ~7 days after first open / last backup / last dismiss
 */
export async function getBackupPromptKind(): Promise<BackupPromptKind> {
  const s = await ensureFirstOpenTracked();
  if (!s.backupIntroSeen) return 'intro';

  const now = Date.now();
  const anchor = Math.max(s.lastBackupAt, s.lastBackupPromptAt, s.firstOpenAt);
  if (anchor <= 0) return 'reminder';
  if (now - anchor >= BACKUP_INTERVAL_MS) return 'reminder';
  return null;
}

export async function markBackupIntroSeen(): Promise<void> {
  await updateSettings({ backupIntroSeen: true });
}

/** User dismissed the weekly reminder without exporting — wait another 7 days. */
export async function markBackupPromptDismissed(): Promise<void> {
  await updateSettings({ lastBackupPromptAt: Date.now() });
}

/** Successful JSON export — next reminder in 7 days. */
export async function markBackupCompleted(): Promise<void> {
  const now = Date.now();
  await updateSettings({
    lastBackupAt: now,
    lastBackupPromptAt: now,
    backupIntroSeen: true,
  });
}

export function formatBackupAge(settings: AppSettings): string {
  if (!settings.lastBackupAt) return 'Never backed up on this device';
  const days = Math.floor((Date.now() - settings.lastBackupAt) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Last backup: today';
  if (days === 1) return 'Last backup: yesterday';
  return `Last backup: ${days} days ago`;
}
