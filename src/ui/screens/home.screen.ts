import { getMonthSummaries, getStats, getWorkoutDates, getWorkoutMuscleGroups } from '../../services/history.service';
import { getOrCreateWorkoutForDate, createWorkout, copyPreviousWorkout } from '../../services/workout.service';
import { getSettingsSync } from '../../services/settings.service';
import { formatFullDate, formatRelativeDay, toDateKey } from '../../utils/date';
import { el, clear } from '../../utils/dom';
import { renderCalendar } from '../components/calendar';
import { router } from '../router';
import { toast } from '../toast';
import { openModal } from '../modal';

export async function renderHomeScreen(root: HTMLElement): Promise<void> {
  clear(root);
  const today = toDateKey();
  let month = today;
  let selected = today;
  const settings = getSettingsSync();
  const weekStartsOn = settings?.weekStartsOn ?? 1;

  const shell = el('div', { className: 'screen-enter stack' });
  const statsHost = el('div');
  const calHost = el('div');
  const dayHost = el('div');
  shell.append(statsHost, calHost, dayHost);
  root.appendChild(shell);

  const stats = await getStats();
  statsHost.replaceChildren(
    el('div', { className: 'stats-strip' }, [
      el('div', { className: 'stat' }, [
        el('div', { className: 'n', textContent: String(stats.totalWorkouts) }),
        el('div', { className: 'l', textContent: 'Workouts' }),
      ]),
      el('div', { className: 'stat' }, [
        el('div', { className: 'n', textContent: String(stats.totalSets) }),
        el('div', { className: 'l', textContent: 'Sets' }),
      ]),
      el('div', { className: 'stat' }, [
        el('div', { className: 'n', textContent: String(stats.streak) }),
        el('div', { className: 'l', textContent: 'Streak' }),
      ]),
    ]),
  );

  let calRoot: HTMLElement | null = null;

  function selectDateInPlace(d: string): void {
    const prev = selected;
    selected = d;
    if (!calRoot) return;
    for (const btn of calRoot.querySelectorAll<HTMLElement>('.cal-day')) {
      const date = btn.getAttribute('aria-label');
      if (date === prev) {
        btn.classList.remove('selected');
        btn.setAttribute('aria-pressed', 'false');
      }
      if (date === d) {
        btn.classList.add('selected');
        btn.setAttribute('aria-pressed', 'true');
      }
    }
  }

  async function paintCalendar(): Promise<void> {
    const dates = await getWorkoutDates();
    const muscleGroups = await getWorkoutMuscleGroups();
    calRoot = renderCalendar({
      month,
      selected,
      workoutDates: dates,
      workoutMuscleGroups: muscleGroups,
      weekStartsOn,
      onSelect: (d) => {
        selectDateInPlace(d);
        void paintDay();
      },
      onDblClick: (d) => {
        void (async () => {
          const w = await getOrCreateWorkoutForDate(d);
          router.navigate('workout', { id: w.id });
        })();
      },
      onMonthChange: (m) => {
        month = m;
        void paintCalendar();
      },
    });
    calHost.replaceChildren(calRoot);
  }

  async function paintDay(): Promise<void> {
    const summaries = await getMonthSummaries(selected);
    const summary = summaries.get(selected);
    const card = el('div', { className: 'panel panel-pad stack' });
    card.appendChild(
      el('div', {}, [
        el('div', { style: 'font-weight:650;font-size:1rem', textContent: formatRelativeDay(selected) }),
        el('div', { style: 'color:var(--text-3);font-size:0.82rem;margin-top:0.15rem', textContent: formatFullDate(selected) }),
      ]),
    );

    if (summary && summary.workoutCount > 0) {
      card.appendChild(
        el('div', {
          style: 'color:var(--text-2);font-size:0.88rem',
          textContent: `${summary.exerciseCount} exercises · ${summary.setCount} sets`,
        }),
      );
      const open = el('button', { type: 'button', className: 'btn btn-primary btn-block', textContent: 'Open workout' });
      open.addEventListener('click', async () => {
        const w = await getOrCreateWorkoutForDate(selected);
        router.navigate('workout', { id: w.id });
      });
      card.appendChild(open);
    } else {
      card.appendChild(el('div', { style: 'color:var(--text-3);font-size:0.88rem', textContent: 'No sets logged this day.' }));
      const start = el('button', { type: 'button', className: 'btn btn-primary btn-block', textContent: 'Start workout' });
      start.addEventListener('click', async () => {
        const w = await getOrCreateWorkoutForDate(selected);
        router.navigate('workout', { id: w.id });
      });
      const copy = el('button', {
        type: 'button',
        className: 'btn btn-ghost btn-block',
        textContent: 'Copy previous workout',
      });
      copy.addEventListener('click', async () => {
        const w = await copyPreviousWorkout(selected);
        if (!w) {
          toast('No previous workout found');
          return;
        }
        toast('Copied previous exercises');
        router.navigate('workout', { id: w.id });
      });
      const extra = el('button', {
        type: 'button',
        className: 'btn btn-accent btn-block',
        textContent: 'More options',
      });
      extra.addEventListener('click', () => showDayMenu(selected));
      card.append(start, copy, extra);
    }

    dayHost.replaceChildren(card);
  }

  await paintCalendar();
  await paintDay();
}

function showDayMenu(date: string): void {
  const content = el('div', { className: 'stack' });
  const mk = (label: string, fn: () => void) => {
    const b = el('button', { type: 'button', className: 'list-item', textContent: label });
    b.addEventListener('click', fn);
    return b;
  };
  const { close } = openModal({
    title: 'Day options',
    content,
  });
  content.append(
    mk('Start empty workout', async () => {
      close();
      const w = await createWorkout(date);
      router.navigate('workout', { id: w.id });
    }),
    mk('Copy previous structure', async () => {
      close();
      const w = await copyPreviousWorkout(date);
      if (!w) toast('No previous workout');
      else router.navigate('workout', { id: w.id });
    }),
    mk('Use template', () => {
      close();
      router.navigate('templates', { date });
    }),
  );
}
