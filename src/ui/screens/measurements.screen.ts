import {
  deleteMeasurement,
  listMeasurements,
  logMeasurement,
  measurementLabel,
} from '../../services/measurement.service';
import { getSettingsSync } from '../../services/settings.service';
import type { MeasurementType } from '../../types';
import { formatDisplayDate, toDateKey } from '../../utils/date';
import { parseNumberInput } from '../../utils/format';
import { el, clear } from '../../utils/dom';
import { confirmDialog, openModal } from '../modal';
import { toast } from '../toast';
import { undoService } from '../../services/undo.service';

const TYPES: MeasurementType[] = [
  'bodyweight',
  'bodyfat',
  'chest',
  'waist',
  'hips',
  'bicep',
  'thigh',
  'neck',
  'calf',
  'custom',
];

export async function renderMeasurementsScreen(root: HTMLElement): Promise<void> {
  clear(root);
  const shell = el('div', { className: 'screen-enter stack' });
  const listHost = el('div', { className: 'list' });
  const add = el('button', {
    type: 'button',
    className: 'btn btn-primary btn-block',
    textContent: '+ Log measurement',
  });
  shell.append(add, listHost);
  root.appendChild(shell);

  const paint = async () => {
    const items = await listMeasurements(80);
    clear(listHost);
    if (items.length === 0) {
      listHost.appendChild(
        el('div', { className: 'empty' }, [
          el('h3', { textContent: 'No measurements' }),
          el('p', { textContent: 'Log bodyweight or girth measurements here.' }),
        ]),
      );
      return;
    }
    for (const m of items) {
      const row = el('button', { type: 'button', className: 'list-item' });
      const mid = el('div', { style: 'flex:1;text-align:left' });
      mid.append(
        el('div', { className: 'title', textContent: `${m.label}: ${m.value} ${m.unit}` }),
        el('div', { className: 'meta', textContent: formatDisplayDate(m.date) }),
      );
      row.appendChild(mid);
      row.addEventListener('click', async () => {
        const ok = await confirmDialog({ title: 'Delete measurement?', message: 'This can be undone with Undo.', danger: true, confirmLabel: 'Delete' });
        if (!ok) return;
        await deleteMeasurement(m.id);
        toast({
          message: 'Deleted',
          actionLabel: 'Undo',
          onAction: () => void undoService.undo().then(paint),
        });
        await paint();
      });
      listHost.appendChild(row);
    }
  };

  add.addEventListener('click', () => {
    const form = el('div', { className: 'stack' });
    const type = el('select', { 'aria-label': 'Type' }) as HTMLSelectElement;
    for (const t of TYPES) {
      type.appendChild(el('option', { value: t, textContent: measurementLabel(t) }));
    }
    const value = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Value',
      'aria-label': 'Value',
    }) as HTMLInputElement;
    const unit = el('input', {
      type: 'text',
      value: getSettingsSync()?.weightUnit ?? 'kg',
      'aria-label': 'Unit',
    }) as HTMLInputElement;
    type.addEventListener('change', () => {
      if (type.value === 'bodyfat') unit.value = '%';
      else if (type.value === 'bodyweight') unit.value = getSettingsSync()?.weightUnit ?? 'kg';
      else unit.value = 'cm';
    });
    form.append(
      el('div', { className: 'field' }, [el('label', { textContent: 'Type' }), type]),
      el('div', { className: 'field' }, [el('label', { textContent: 'Value' }), value]),
      el('div', { className: 'field' }, [el('label', { textContent: 'Unit' }), unit]),
    );
    openModal({
      title: 'Log measurement',
      content: form,
      center: true,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Save',
          variant: 'primary',
          onClick: async () => {
            const n = parseNumberInput(value.value);
            if (n == null) {
              toast('Enter a number');
              throw new Error('validation');
            }
            await logMeasurement({
              type: type.value as MeasurementType,
              value: n,
              unit: unit.value || 'kg',
              date: toDateKey(),
            });
            toast('Saved');
            await paint();
          },
        },
      ],
    });
  });

  await paint();
}
