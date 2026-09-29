import { formatBackupAge } from '../../services/backup-reminder.service';
import {
  applyRuntimeSettings,
  getSettingsSync,
  loadSettings,
  updateSettings,
} from '../../services/settings.service';
import { exportToJsonFile, importFromJson, resetAndReseed } from '../../services/export.service';
import { restTimerService } from '../../services/timer.service';
import { undoService } from '../../services/undo.service';
import type { AppSettings, DistanceUnit, WeightUnit } from '../../types';
import { APP_VERSION } from '../../version';
import { el, clear } from '../../utils/dom';
import { confirmDialog } from '../modal';
import { router } from '../router';
import { toast } from '../toast';
import { RELEASE_NOTES } from '../../data/release-notes';

export async function renderSettingsScreen(root: HTMLElement): Promise<void> {
  clear(root);
  let settings = (await loadSettings()) ?? getSettingsSync()!;
  const shell = el('div', { className: 'screen-enter' });

  const paint = () => {
    clear(shell);

    // Quick links
    shell.appendChild(
      group('Library', [
        navRow('Measurements & bodyweight', 'Track body metrics', () => router.navigate('measurements')),
        navRow('Templates', 'Reusable workout plans', () => router.navigate('templates', {})),
        navRow('Programs', 'Structured training programs', () => router.navigate('programs')),
      ]),
    );

    shell.appendChild(
      group('Units', [
        selectRow('Weight unit', settings.weightUnit, [
          { value: 'kg', label: 'Kilograms (kg)' },
          { value: 'lb', label: 'Pounds (lb)' },
        ], async (v) => {
          settings = await updateSettings({ weightUnit: v as WeightUnit });
          paint();
        }),
        selectRow('Distance unit', settings.distanceUnit, [
          { value: 'km', label: 'Kilometers' },
          { value: 'mi', label: 'Miles' },
          { value: 'm', label: 'Meters' },
        ], async (v) => {
          settings = await updateSettings({ distanceUnit: v as DistanceUnit });
          paint();
        }),
      ]),
    );

    shell.appendChild(
      group('Rest timer', [
        selectRow(
          'Default rest',
          String(settings.restTimerSec),
          [60, 90, 120, 150, 180, 240, 300].map((s) => ({
            value: String(s),
            label: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
          })),
          async (v) => {
            settings = await updateSettings({ restTimerSec: Number(v) });
            paint();
          },
        ),
        toggleRow('Auto-start after set', settings.autoStartRest, async (on) => {
          settings = await updateSettings({ autoStartRest: on });
        }),
        actionRow('Test rest timer', () => {
          restTimerService.start(settings.restTimerSec);
          toast('Rest timer started');
        }),
      ]),
    );

    shell.appendChild(
      group('Preferences', [
        selectRow(
          'Week starts on',
          String(settings.weekStartsOn),
          [
            { value: '1', label: 'Monday' },
            { value: '0', label: 'Sunday' },
          ],
          async (v) => {
            settings = await updateSettings({ weekStartsOn: Number(v) as 0 | 1 });
            paint();
          },
        ),
        toggleRow('Haptics / vibration', settings.haptics, async (on) => {
          settings = await updateSettings({ haptics: on });
        }),
        toggleRow('Confirm deletes', settings.confirmDelete, async (on) => {
          settings = await updateSettings({ confirmDelete: on });
        }),
        toggleRow('Keep screen on', settings.keepScreenOn, async (on) => {
          settings = await updateSettings({ keepScreenOn: on });
          applyRuntimeSettings(settings);
        }),
      ]),
    );

    shell.appendChild(
      group('Data', [
        infoRow(
          'Local backups',
          `${formatBackupAge(settings)}. Reminders every 7 days. Restore via Import if storage is lost.`,
        ),
        actionRow('Export JSON backup', async () => {
          await exportToJsonFile();
          settings = await loadSettings();
          toast('Export downloaded — keep the file safe');
          paint();
        }),
        actionRow('Import JSON backup', () => {
          const input = el('input', {
            type: 'file',
            accept: 'application/json,.json,.matrixnotes.json',
          }) as HTMLInputElement;
          input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
              const text = await file.text();
              const replace = await confirmDialog({
                title: 'Replace all data?',
                message:
                  'This will wipe current workouts and import the backup (including FitNotes → MatrixNotes converted JSON).',
                confirmLabel: 'Import & replace',
                danger: true,
              });
              if (!replace) return;
              await importFromJson(text, 'replace');
              toast('Import complete');
              router.navigate('home');
            } catch (e) {
              toast(e instanceof Error ? e.message : 'Import failed');
            }
          });
          input.click();
        }),
        actionRow('Undo last action', async () => {
          if (!undoService.canUndo()) {
            toast('Nothing to undo');
            return;
          }
          const label = await undoService.undo();
          toast(`Undid: ${label}`);
        }),
        actionRow('Reset to defaults', async () => {
          const ok = await confirmDialog({
            title: 'Reset all data?',
            message: 'Deletes workouts, custom exercises, and settings. Restores default exercise catalog.',
            confirmLabel: 'Reset',
            danger: true,
          });
          if (!ok) return;
          await resetAndReseed();
          settings = await loadSettings();
          toast('Reset complete');
          paint();
        }),
      ]),
    );

    shell.appendChild(
      group('About', [
        infoRow('Version', APP_VERSION),
        infoRow('Release', `${RELEASE_NOTES[0]?.title ?? ''} (${RELEASE_NOTES[0]?.date ?? ''})`),
        navRow('Release notes & hotfixes', 'What\'s new in each version', () => router.navigate('release-notes')),
      ]),
    );

    shell.appendChild(
      el('div', {
        style: 'text-align:center;color:var(--text-3);font-size:0.78rem;padding:1rem 0 2rem',
        textContent: 'MatrixNotes · Offline · Local only',
      }),
    );
  };

  paint();
  root.appendChild(shell);
}

function group(title: string, rows: HTMLElement[]): HTMLElement {
  const g = el('div', { className: 'settings-group' });
  g.appendChild(el('h2', { textContent: title }));
  for (const r of rows) g.appendChild(r);
  return g;
}

function navRow(label: string, hint: string, onClick: () => void): HTMLElement {
  const row = el('button', { type: 'button', className: 'settings-row', style: 'width:100%;text-align:left' });
  const left = el('div');
  left.append(
    el('div', { className: 'label', textContent: label }),
    el('div', { className: 'hint', textContent: hint }),
  );
  row.append(left, el('div', { textContent: '›', style: 'color:var(--text-3)' }));
  row.addEventListener('click', onClick);
  return row;
}

function actionRow(label: string, onClick: () => void | Promise<void>): HTMLElement {
  const row = el('button', { type: 'button', className: 'settings-row', style: 'width:100%;text-align:left' });
  row.appendChild(el('div', { className: 'label', textContent: label }));
  row.addEventListener('click', () => void onClick());
  return row;
}

function infoRow(label: string, hint: string): HTMLElement {
  const row = el('div', { className: 'settings-row' });
  const left = el('div');
  left.append(
    el('div', { className: 'label', textContent: label }),
    el('div', { className: 'hint', textContent: hint }),
  );
  row.appendChild(left);
  return row;
}

function toggleRow(label: string, value: boolean, onChange: (v: boolean) => void | Promise<void>): HTMLElement {
  const row = el('div', { className: 'settings-row' });
  const labelDiv = el('div', { className: 'label', textContent: label });
  row.appendChild(labelDiv);
  const sw = el('label', { className: 'switch' });
  const input = el('input', { type: 'checkbox', 'aria-labelledby': '' }) as HTMLInputElement;
  input.setAttribute('aria-labelledby', labelDiv.id || (labelDiv.id = 'lbl-' + Math.random().toString(36).slice(2, 8)));
  input.checked = value;
  input.addEventListener('change', () => void onChange(input.checked));
  sw.append(input, el('span'));
  row.appendChild(sw);
  return row;
}

function selectRow(
  label: string,
  value: string,
  options: Array<{ value: string; label: string }>,
  onChange: (v: string) => void | Promise<void>,
): HTMLElement {
  const row = el('div', { className: 'settings-row' });
  const labelDiv = el('div', { className: 'label', textContent: label });
  row.appendChild(labelDiv);
  const sel = el('select', { 'aria-labelledby': '', style: 'width:auto;min-width:120px;flex:0 1 auto' }) as HTMLSelectElement;
  sel.setAttribute('aria-labelledby', labelDiv.id || (labelDiv.id = 'lbl-' + Math.random().toString(36).slice(2, 8)));
  for (const o of options) {
    const opt = el('option', { value: o.value, textContent: o.label }) as HTMLOptionElement;
    if (o.value === value) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => void onChange(sel.value));
  row.appendChild(sel);
  return row;
}

// keep type import used for documentation
export type SettingsShape = AppSettings;
