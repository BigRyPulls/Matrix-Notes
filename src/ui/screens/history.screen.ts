import { listWorkoutsWithCounts } from '../../services/history.service';
import { deleteWorkout, duplicateWorkout } from '../../services/workout.service';
import { formatDisplayDate, toDateKey } from '../../utils/date';
import { el, clear } from '../../utils/dom';
import { attachGestures } from '../../utils/gestures';
import { confirmDialog, openModal } from '../modal';
import { router } from '../router';
import { toast } from '../toast';
import { undoService } from '../../services/undo.service';
import type { Workout } from '../../types';

export async function renderHistoryScreen(root: HTMLElement): Promise<void> {
  clear(root);
  const shell = el('div', { className: 'screen-enter stack' });
  const list = el('div', { className: 'list' });
  shell.appendChild(list);
  root.appendChild(shell);

  const rows = await listWorkoutsWithCounts(120);
  if (rows.length === 0) {
    list.appendChild(
      el('div', { className: 'empty' }, [
        el('h3', { textContent: 'No history yet' }),
        el('p', { textContent: 'Complete a workout and it will show up here.' }),
      ]),
    );
    return;
  }

  for (const row of rows) {
    list.appendChild(historyRow(row.workout, row.exerciseCount, row.setCount));
  }
}

function historyRow(w: Workout, exCount: number, setCount: number): HTMLElement {
  const item = el('div', { className: 'list-item', tabindex: '0', role: 'button', 'aria-label': `Open ${w.name}` });
  const mid = el('div', { style: 'flex:1;min-width:0;text-align:left' });
  mid.append(
    el('div', { className: 'title', textContent: w.name }),
    el('div', {
      className: 'meta',
      textContent: `${formatDisplayDate(w.date)} · ${exCount} exercises · ${setCount} sets`,
    }),
  );
  const moreBtn = el('button', {
    type: 'button',
    className: 'btn-icon',
    'aria-label': 'More options',
    style: 'flex:0 0 auto;width:36px;height:36px;font-size:1.2rem;line-height:1',
    textContent: '⋮',
  });
  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showWorkoutContextMenu(w);
  });
  item.append(mid, moreBtn);
  item.addEventListener('click', () => router.navigate('workout', { id: w.id }));
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.navigate('workout', { id: w.id });
    }
  });
  item.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showWorkoutContextMenu(w);
  });

  attachGestures(item, {
    onLongPress: () => showWorkoutContextMenu(w),
  });

  return item;
}

function showWorkoutContextMenu(w: Workout): void {
  const content = el('div', { className: 'stack' });
  const { close } = openModal({ title: w.name, content });
  const mk = (label: string, fn: () => void, danger = false) => {
    const b = el('button', {
      type: 'button',
      className: 'list-item',
      textContent: label,
      style: danger ? 'color:var(--danger)' : '',
    });
    b.addEventListener('click', fn);
    return b;
  };
  content.append(
    mk('Open', () => {
      close();
      router.navigate('workout', { id: w.id });
    }),
    mk('Duplicate to today', async () => {
      close();
      const clone = await duplicateWorkout(w.id, toDateKey());
      toast('Workout duplicated');
      router.navigate('workout', { id: clone.id });
    }),
    mk(
      'Delete',
      async () => {
        close();
        const ok = await confirmDialog({
          title: 'Delete workout?',
          message: 'Sets and exercises for this session will be removed.',
          danger: true,
          confirmLabel: 'Delete',
        });
        if (!ok) return;
        await deleteWorkout(w.id);
        toast({
          message: 'Deleted',
          actionLabel: 'Undo',
          onAction: () => void undoService.undo().then(() => router.navigate('history', {}, true)),
        });
        router.navigate('history', {}, true);
      },
      true,
    ),
  );
}
