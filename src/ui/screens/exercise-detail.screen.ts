import { deleteExercise, getExercise, listCategories, updateExercise } from '../../services/exercise.service';
import { getExerciseHistory } from '../../services/workout.service';
import { getExercisePRs } from '../../services/pr.service';
import { getSettingsSync } from '../../services/settings.service';
import { addDays, formatDisplayDate, formatFullDate, toDateKey } from '../../utils/date';
import { formatSetSummary, trimNum } from '../../utils/format';
import { el, clear } from '../../utils/dom';
import { renderLineChart, type ChartPoint } from '../components/chart';
import { confirmDialog, openModal } from '../modal';
import { router } from '../router';
import { toast } from '../toast';
import type { ExerciseMetric, SetEntry } from '../../types';

type HistoryRow = { set: SetEntry; date: string; workoutId: string };
type ChartMetric = 'max_weight' | 'volume' | 'max_reps' | 'est_1rm' | 'max_duration' | 'max_distance';
type Timeframe = '1m' | '3m' | '6m' | '1y' | 'all';

export async function renderExerciseDetailScreen(
  root: HTMLElement,
  params: Record<string, string>,
): Promise<void> {
  clear(root);
  const id = params['id'];
  if (!id) {
    root.appendChild(el('div', { className: 'empty', textContent: 'Exercise not found' }));
    return;
  }

  const exercise = await getExercise(id);
  if (!exercise) {
    root.appendChild(el('div', { className: 'empty', textContent: 'Exercise not found' }));
    return;
  }

  const cats = await listCategories();
  const cat = cats.find((c) => c.id === exercise.categoryId);
  const unit = getSettingsSync()?.weightUnit ?? 'kg';
  const history = await getExerciseHistory(id);
  const prs = await getExercisePRs(id);

  const shell = el('div', { className: 'screen-enter stack' });

  // Header
  const head = el('div', { className: 'panel panel-pad' });
  head.append(
    el('div', { style: 'font-weight:700;font-size:1.15rem', textContent: exercise.name }),
    el('div', {
      style: 'color:var(--text-3);font-size:0.82rem;margin-top:0.25rem',
      textContent: `${cat?.name ?? '—'} · ${metricLabel(exercise.metric)}`,
    }),
  );
  if (exercise.notes) {
    head.appendChild(
      el('p', {
        style: 'margin:0.55rem 0 0;color:var(--text-2);font-size:0.9rem',
        textContent: exercise.notes,
      }),
    );
  }
  shell.appendChild(head);

  // PRs
  if (prs.length > 0) {
    const prPanel = el('div', { className: 'panel panel-pad' });
    prPanel.appendChild(
      el('div', { style: 'font-weight:650;margin-bottom:0.45rem', textContent: 'Personal records' }),
    );
    for (const pr of prs) {
      prPanel.appendChild(
        el('div', {
          className: 'row',
          style: 'justify-content:space-between;padding:0.25rem 0;font-size:0.9rem',
        }, [
          el('span', { style: 'color:var(--text-2)', textContent: prKindLabel(pr.kind) }),
          el('span', {
            style: 'font-family:var(--font-mono);font-weight:700;color:var(--pr)',
            textContent: `${trimNum(pr.value)} · ${formatDisplayDate(pr.date)}`,
          }),
        ]),
      );
    }
    shell.appendChild(prPanel);
  }

  // Chart + controls
  const chartMetrics = chartMetricsFor(exercise.metric);
  let chartMetric: ChartMetric = chartMetrics[0]!.id;
  let timeframe: Timeframe = '3m';

  const chartPanel = el('div', { className: 'panel panel-pad stack' });
  const controls = el('div', { className: 'row', style: 'gap:0.5rem;align-items:flex-end' });

  const metricField = el('div', { className: 'field', style: 'margin:0;flex:1.2' });
  metricField.appendChild(el('label', { textContent: 'Graph' }));
  const metricSelect = el('select', { 'aria-label': 'Chart metric' }) as HTMLSelectElement;
  for (const opt of chartMetrics) {
    const o = el('option', { value: opt.id, textContent: opt.label }) as HTMLOptionElement;
    if (opt.id === chartMetric) o.selected = true;
    metricSelect.appendChild(o);
  }
  metricField.appendChild(metricSelect);

  const timeField = el('div', { className: 'field', style: 'margin:0;flex:1' });
  timeField.appendChild(el('label', { textContent: 'Timeframe' }));
  const timeSelect = el('select', { 'aria-label': 'Chart timeframe' }) as HTMLSelectElement;
  for (const opt of [
    { id: '1m' as const, label: '1 month' },
    { id: '3m' as const, label: '3 months' },
    { id: '6m' as const, label: '6 months' },
    { id: '1y' as const, label: '1 year' },
    { id: 'all' as const, label: 'All time' },
  ]) {
    const o = el('option', { value: opt.id, textContent: opt.label }) as HTMLOptionElement;
    if (opt.id === timeframe) o.selected = true;
    timeSelect.appendChild(o);
  }
  timeField.appendChild(timeSelect);

  controls.append(metricField, timeField);
  const chartHost = el('div');
  chartPanel.append(controls, chartHost);
  shell.appendChild(chartPanel);

  const paintChart = () => {
    clear(chartHost);
    const series = buildChartSeries(history, exercise.metric, chartMetric, timeframe);
    const unitLabel = chartUnitFor(chartMetric, unit);
    chartHost.appendChild(renderLineChart(series, { unit: unitLabel }));
  };
  paintChart();

  metricSelect.addEventListener('change', () => {
    chartMetric = metricSelect.value as ChartMetric;
    paintChart();
  });
  timeSelect.addEventListener('change', () => {
    timeframe = timeSelect.value as Timeframe;
    paintChart();
  });

  // Full history — every workout session for this exercise
  const histPanel = el('div', { className: 'panel panel-pad' });
  histPanel.appendChild(
    el('div', { style: 'font-weight:650;margin-bottom:0.5rem', textContent: 'History' }),
  );

  const sessions = groupHistorySessions(history);
  if (sessions.length === 0) {
    histPanel.appendChild(
      el('div', {
        style: 'color:var(--text-3);font-size:0.88rem',
        textContent: 'No sets logged yet.',
      }),
    );
  } else {
    for (const session of sessions) {
      histPanel.appendChild(
        el('div', {
          style:
            'margin-top:0.7rem;margin-bottom:0.3rem;font-size:0.8rem;color:var(--text-3);font-weight:700',
          textContent: formatFullDate(session.date),
        }),
      );
      for (const set of session.sets) {
        const row = el('div', {
          className: 'row',
          style:
            'justify-content:space-between;padding:0.28rem 0;border-bottom:1px solid var(--border-subtle)',
        });
        row.append(
          el('span', {
            style: 'font-family:var(--font-mono);font-weight:600',
            textContent: formatSetSummary(
              exercise.metric,
              set.weight,
              set.reps,
              set.durationSec,
              set.distance,
              unit,
            ),
          }),
        );
        const badges = el('div', {
          className: 'row',
          style: 'flex:0;gap:0.35rem;justify-content:flex-end',
        });
        if (set.isWarmup) {
          badges.appendChild(el('span', { className: 'badge', textContent: 'W' }));
        }
        if (set.isPR) {
          badges.appendChild(el('span', { className: 'badge badge-pr', textContent: 'PR' }));
        }
        if (badges.childNodes.length) row.appendChild(badges);
        histPanel.appendChild(row);
      }
    }
  }
  shell.appendChild(histPanel);

  // Edit / Delete (once)
  const actions = el('div', { className: 'row' });
  const edit = el('button', { type: 'button', className: 'btn btn-ghost', textContent: 'Edit' });
  edit.addEventListener('click', () => {
    const form = el('div', { className: 'stack' });
    const name = el('input', { value: exercise.name, 'aria-label': 'Exercise name' }) as HTMLInputElement;
    name.addEventListener('focus', () => name.select());
    const notes = el('textarea', { 'aria-label': 'Notes' }) as HTMLTextAreaElement;
    notes.addEventListener('focus', () => notes.select());
    notes.value = exercise.notes ?? '';
    form.append(
      el('div', { className: 'field' }, [el('label', { textContent: 'Name' }), name]),
      el('div', { className: 'field' }, [el('label', { textContent: 'Notes' }), notes]),
    );
    openModal({
      title: 'Edit exercise',
      content: form,
      center: true,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Save',
          variant: 'primary',
          onClick: async () => {
            await updateExercise(id, { name: name.value, notes: notes.value });
            toast('Saved');
            router.navigate('exercise-detail', { id }, true);
          },
        },
      ],
    });
  });
  const del = el('button', { type: 'button', className: 'btn btn-danger', textContent: 'Delete' });
  del.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete exercise?',
      message:
        'History linked to past workouts remains, but the exercise will be removed from the library.',
      danger: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await deleteExercise(id);
    toast('Exercise deleted');
    router.navigate('exercises');
  });
  actions.append(edit, del);
  shell.appendChild(actions);

  root.appendChild(shell);
}

function groupHistorySessions(
  history: HistoryRow[],
): Array<{ date: string; workoutId: string; sets: SetEntry[] }> {
  const sessions: Array<{ date: string; workoutId: string; sets: SetEntry[] }> = [];
  const index = new Map<string, number>();

  for (const h of history) {
    const key = `${h.date}|${h.workoutId}`;
    let i = index.get(key);
    if (i == null) {
      i = sessions.length;
      index.set(key, i);
      sessions.push({ date: h.date, workoutId: h.workoutId, sets: [] });
    }
    sessions[i]!.sets.push(h.set);
  }

  for (const s of sessions) {
    s.sets.sort((a, b) => a.setNumber - b.setNumber || a.completedAt - b.completedAt);
  }
  return sessions;
}

function chartMetricsFor(metric: ExerciseMetric): Array<{ id: ChartMetric; label: string }> {
  switch (metric) {
    case 'duration':
      return [{ id: 'max_duration', label: 'Best duration' }];
    case 'distance':
      return [{ id: 'max_distance', label: 'Max distance' }];
    case 'weight_duration':
      return [
        { id: 'max_weight', label: 'Max weight' },
        { id: 'max_duration', label: 'Best duration' },
      ];
    case 'bodyweight_reps':
      return [
        { id: 'max_reps', label: 'Max reps' },
        { id: 'max_weight', label: 'Added weight' },
        { id: 'volume', label: 'Volume' },
      ];
    case 'weight_reps':
    default:
      return [
        { id: 'max_weight', label: 'Max weight' },
        { id: 'volume', label: 'Volume' },
        { id: 'max_reps', label: 'Max reps' },
        { id: 'est_1rm', label: 'Est. 1RM' },
      ];
  }
}

function chartUnitFor(metric: ChartMetric, weightUnit: string): string {
  switch (metric) {
    case 'max_weight':
    case 'est_1rm':
      return weightUnit;
    case 'volume':
      return weightUnit;
    case 'max_reps':
      return 'reps';
    case 'max_duration':
      return 's';
    case 'max_distance':
      return '';
    default:
      return '';
  }
}

function timeframeStart(tf: Timeframe): string | null {
  const today = toDateKey();
  switch (tf) {
    case '1m':
      return addDays(today, -30);
    case '3m':
      return addDays(today, -90);
    case '6m':
      return addDays(today, -180);
    case '1y':
      return addDays(today, -365);
    case 'all':
      return null;
  }
}

function setChartValue(metric: ChartMetric, set: SetEntry): number {
  const w = set.weight ?? 0;
  const r = set.reps ?? 0;
  switch (metric) {
    case 'max_weight':
      return w;
    case 'volume':
      return w * r;
    case 'max_reps':
      return r;
    case 'est_1rm':
      if (w <= 0) return 0;
      if (r <= 1) return w;
      // Epley
      return w * (1 + r / 30);
    case 'max_duration':
      return set.durationSec ?? 0;
    case 'max_distance':
      return set.distance ?? 0;
    default:
      return 0;
  }
}

function buildChartSeries(
  history: HistoryRow[],
  _exerciseMetric: ExerciseMetric,
  chartMetric: ChartMetric,
  timeframe: Timeframe,
): ChartPoint[] {
  const start = timeframeStart(timeframe);
  const working = history.filter((h) => !h.set.isWarmup && (!start || h.date >= start));

  // Aggregate per calendar day (chronological for the chart)
  type Agg = { max: number; sum: number };
  const byDay = new Map<string, Agg>();

  for (const h of working) {
    const v = setChartValue(chartMetric, h.set);
    if (v <= 0) continue;
    const cur = byDay.get(h.date) ?? { max: 0, sum: 0 };
    cur.max = Math.max(cur.max, v);
    cur.sum += v;
    byDay.set(h.date, cur);
  }

  const useSum = chartMetric === 'volume';
  const dates = Array.from(byDay.keys()).sort((a, b) => a.localeCompare(b));
  return dates.map((date) => {
    const agg = byDay.get(date)!;
    return {
      xLabel: date.slice(5),
      y: useSum ? Math.round(agg.sum * 10) / 10 : Math.round(agg.max * 10) / 10,
    };
  });
}

function metricLabel(m: ExerciseMetric): string {
  switch (m) {
    case 'weight_reps':
      return 'Weight × Reps';
    case 'bodyweight_reps':
      return 'Bodyweight';
    case 'duration':
      return 'Duration';
    case 'distance':
      return 'Distance';
    case 'weight_duration':
      return 'Weight × Time';
    default:
      return m;
  }
}

function prKindLabel(k: string): string {
  switch (k) {
    case 'max_weight':
      return 'Max weight';
    case 'max_reps':
      return 'Max reps';
    case 'max_volume':
      return 'Max volume';
    case 'max_distance':
      return 'Max distance';
    case 'best_duration':
      return 'Best duration';
    default:
      return k;
  }
}
