import type { AppSettings } from '../types';
import { settingsRepo } from '../storage/repositories';

let cache: AppSettings | null = null;
const listeners = new Set<(s: AppSettings) => void>();

export async function loadSettings(): Promise<AppSettings> {
  cache = await settingsRepo.get();
  return cache;
}

export function getSettingsSync(): AppSettings | null {
  return cache;
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  cache = await settingsRepo.save(partial);
  for (const l of listeners) l(cache);
  applyRuntimeSettings(cache);
  return cache;
}

export function subscribeSettings(fn: (s: AppSettings) => void): () => void {
  listeners.add(fn);
  if (cache) fn(cache);
  return () => listeners.delete(fn);
}

export function applyRuntimeSettings(s: AppSettings): void {
  // Keep screen awake when logging (Wake Lock API)
  if (s.keepScreenOn) {
    void requestWakeLock();
  } else {
    releaseWakeLock();
  }
}

let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock(): Promise<void> {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    }
  } catch {
    /* unsupported or denied */
  }
}

function releaseWakeLock(): void {
  void wakeLock?.release();
  wakeLock = null;
}
