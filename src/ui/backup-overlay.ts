import {
  markBackupCompleted,
  markBackupIntroSeen,
  markBackupPromptDismissed,
} from '../services/backup-reminder.service';
import { exportToJsonFile } from '../services/export.service';
import { el } from '../utils/dom';
import { openModal } from './modal';
import { toast } from './toast';

function body(...paragraphs: string[]): HTMLElement {
  const wrap = el('div', {
    className: 'backup-overlay-body',
    style: 'display:flex;flex-direction:column;gap:0.55rem',
  });
  for (const p of paragraphs) {
    wrap.appendChild(
      el('p', {
        style: 'margin:0;color:var(--text-2);font-size:0.92rem;line-height:1.45',
        textContent: p,
      }),
    );
  }
  return wrap;
}

/** First-run education: why backups matter + 7-day cadence. */
export function showBackupIntroOverlay(): Promise<void> {
  return new Promise((resolve) => {
    openModal({
      title: 'Protect your data',
      center: true,
      content: body(
        'MatrixNotes stores your workouts only on this device (browser storage) — not in the cloud.',
        'If Safari clears site data, storage is full, or you switch phones, those logs can be wiped permanently.',
        'From this point, every 7 days we’ll remind you to export a JSON backup. You can restore that file later from More → Import if something goes wrong.',
        'You can also export anytime from More.',
      ),
      actions: [
        {
          label: 'Got it',
          variant: 'primary',
          onClick: async () => {
            await markBackupIntroSeen();
            resolve();
          },
        },
      ],
      onClose: () => {
        void markBackupIntroSeen().then(() => resolve());
      },
    });
  });
}

/** Weekly reminder with one-tap JSON export. */
export function showBackupReminderOverlay(appLabel = 'MatrixNotes'): Promise<void> {
  return new Promise((resolve) => {
    openModal({
      title: 'Time for a backup',
      center: true,
      content: body(
        `It’s been about a week since your last backup reminder.`,
        `${appLabel} keeps data only on this phone. Export a JSON file now so you can restore everything later if Safari clears storage or you lose this device.`,
        'Tip: save the file to Files / iCloud Drive, not only Downloads.',
      ),
      actions: [
        {
          label: 'Later',
          variant: 'ghost',
          onClick: async () => {
            await markBackupPromptDismissed();
            resolve();
          },
        },
        {
          label: 'Backup to JSON',
          variant: 'primary',
          onClick: async () => {
            try {
              await exportToJsonFile();
              await markBackupCompleted();
              toast('Backup saved — keep the JSON file somewhere safe');
              resolve();
            } catch (err) {
              toast(err instanceof Error ? err.message : 'Backup failed');
              throw err;
            }
          },
        },
      ],
      onClose: () => {
        void markBackupPromptDismissed().then(() => resolve());
      },
    });
  });
}
