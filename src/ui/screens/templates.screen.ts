import {
  applyTemplate,
  deleteTemplate,
  listTemplates,
} from '../../services/workout.service';
import { toDateKey } from '../../utils/date';
import { el, clear } from '../../utils/dom';
import { confirmDialog } from '../modal';
import { router } from '../router';
import { toast } from '../toast';

export async function renderTemplatesScreen(
  root: HTMLElement,
  params: Record<string, string>,
): Promise<void> {
  clear(root);
  const date = params['date'] || toDateKey();
  const shell = el('div', { className: 'screen-enter stack' });
  shell.appendChild(
    el('div', {
      style: 'color:var(--text-3);font-size:0.85rem',
      textContent: params['date']
        ? `Applying to ${date}`
        : 'Tap a template to start it today. Save templates from any workout.',
    }),
  );
  const list = el('div', { className: 'list' });
  shell.appendChild(list);
  root.appendChild(shell);

  const templates = await listTemplates();
  if (templates.length === 0) {
    list.appendChild(
      el('div', { className: 'empty' }, [
        el('h3', { textContent: 'No templates' }),
        el('p', { textContent: 'Open a workout and use “Save template”.' }),
      ]),
    );
    return;
  }

  for (const t of templates) {
    const row = el('div', { className: 'list-item', style: 'cursor:pointer' });
    const mid = el('div', { style: 'flex:1' });
    mid.append(
      el('div', { className: 'title', textContent: t.name }),
      el('div', { className: 'meta', textContent: t.notes || 'Workout template' }),
    );
    const del = el('button', {
      type: 'button',
      className: 'btn btn-sm btn-danger',
      textContent: 'Del',
      style: 'flex:0 0 auto',
    });
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = await confirmDialog({
        title: 'Delete template?',
        message: t.name,
        danger: true,
        confirmLabel: 'Delete',
      });
      if (!ok) return;
      await deleteTemplate(t.id);
      toast('Template deleted');
      router.navigate('templates', params['date'] ? { date } : {}, true);
    });
    row.append(mid, del);
    row.addEventListener('click', async () => {
      const w = await applyTemplate(t.id, date);
      toast(`Started “${t.name}”`);
      router.navigate('workout', { id: w.id });
    });
    list.appendChild(row);
  }
}
