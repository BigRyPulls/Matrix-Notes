import './styles/main.css';
import { getBackupPromptKind } from './services/backup-reminder.service';
import { ensureSeeded } from './services/seed.service';
import { loadSettings, applyRuntimeSettings } from './services/settings.service';
import { getDb } from './storage/db';
import { router } from './ui/router';
import { mountAppShell } from './ui/app-shell';
import { showBackupIntroOverlay, showBackupReminderOverlay } from './ui/backup-overlay';
import { registerPwa } from './pwa/register';

function showBootError(bootEl: HTMLElement | null, message: string): void {
  if (!bootEl) return;
  bootEl.removeAttribute('hidden');
  bootEl.style.opacity = '1';
  bootEl.innerHTML = '';
  const msg = document.createElement('div');
  msg.style.cssText =
    'color:#ff6b6b;font-family:system-ui;padding:1.5rem;text-align:center;max-width:20rem;line-height:1.4';
  msg.textContent = message;
  bootEl.appendChild(msg);
}

async function boot(): Promise<void> {
  const bootEl = document.getElementById('boot');
  // Safety: never leave the splash forever if storage hangs (rare Safari cases)
  const watchdog = window.setTimeout(() => {
    showBootError(bootEl, 'Still starting… If this persists, hard-refresh or try npm run preview.');
  }, 8000);

  try {
    await getDb();
    await ensureSeeded();
    const settings = await loadSettings();
    applyRuntimeSettings(settings);

    router.init();
    const app = document.getElementById('app');
    if (!app) throw new Error('#app missing');
    mountAppShell(app);
    registerPwa();

    // After UI is up, educate / remind about offline-only backups
    window.setTimeout(() => {
      void (async () => {
        const kind = await getBackupPromptKind();
        if (kind === 'intro') await showBackupIntroOverlay();
        else if (kind === 'reminder') await showBackupReminderOverlay('MatrixNotes');
      })();
    }, 450);
  } catch (err) {
    console.error('Boot failed', err);
    clearTimeout(watchdog);
    showBootError(bootEl, err instanceof Error ? err.message : 'Failed to start MatrixNotes');
    return;
  }

  clearTimeout(watchdog);
  if (bootEl) {
    bootEl.style.opacity = '0';
    window.setTimeout(() => bootEl.setAttribute('hidden', ''), 260);
  }
}

void boot();
