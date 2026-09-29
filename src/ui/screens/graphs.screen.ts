import type { SetEntry } from '../../types';
import { listExercises, listCategories } from '../../services/exercise.service';
import { getExerciseHistory } from '../../services/workout.service';
import { listByType, latestBodyweight } from '../../services/measurement.service';
import { getStats } from '../../services/history.service';
import { getSettingsSync } from '../../services/settings.service';
import { el, clear } from '../../utils/dom';
import { debounce } from '../../utils/debounce';
import { renderLineChart, type ChartPoint } from '../components/chart';
import { iconHtml } from '../icons';

type SearchMode = 'exercise' | 'muscle';
type ChartType = '1rm' | 'erm' | 'max_weight' | 'volume';
type TimeFrame = 30 | 90 | 180 | 365 | 0;

const CHART_LABELS: Record<ChartType, string> = {
  '1rm': '1RM',
  'erm': 'e1RM',
  max_weight: 'Max Weight',
  volume: 'Volume',
};

function epley(w: number, r: number): number {
  return w * (1 + r / 30);
}

function formatDate(ymd: string): string {
  return ymd.slice(5);
}

export async function renderGraphsScreen(root: HTMLElement): Promise<void> {
  clear(root);
  const shell = el('div', { className: 'screen-enter stack' });
  const unit = getSettingsSync()?.weightUnit ?? 'kg';

  // Stats strip
  const stats = await getStats();
  shell.appendChild(
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

  // Bodyweight chart
  const bw = await listByType('bodyweight');
  const bwPanel = el('div', { className: 'panel panel-pad stack' });
  bwPanel.appendChild(el('div', { style: 'font-weight:650', textContent: 'Bodyweight' }));
  const latest = await latestBodyweight();
  if (latest) {
    bwPanel.appendChild(
      el('div', {
        style: 'color:var(--text-2);font-size:0.88rem',
        textContent: `Latest: ${latest.value} ${latest.unit}`,
      }),
    );
  }
  const bwSeries = bw
    .slice()
    .reverse()
    .map((m) => ({ xLabel: formatDate(m.date), y: m.value, date: m.date }));
  bwPanel.appendChild(renderLineChart(bwSeries.slice(-30), { unit }));
  shell.appendChild(bwPanel);

  // Exercise panel
  const exPanel = el('div', { className: 'panel panel-pad stack' });

  // Mode toggle
  const modeBar = el('div', {
    style: 'display:flex;gap:0;margin-bottom:0.5rem;border-radius:6px;overflow:hidden;border:1px solid var(--border-subtle)',
  });
  let searchMode: SearchMode = 'exercise';
  const modeBtns: Record<SearchMode, HTMLElement> = { exercise: null!, muscle: null! };
  let currentEx: { id: string; name: string } | null = null;

  const setMode = (mode: SearchMode) => {
    searchMode = mode;
    currentEx = null;
    for (const [k, btn] of Object.entries(modeBtns)) {
      btn.style.background = k === mode ? 'var(--accent)' : 'transparent';
      btn.style.color = k === mode ? 'var(--text-inv)' : 'var(--text-2)';
    }
    renderSearchMode(mode);
  };

  for (const [key, label] of [['exercise', 'Exercises'], ['muscle', 'Muscle Groups']] as const) {
    const btn = el('button', {
      type: 'button',
      style: 'flex:1;padding:0.4rem;font-size:0.8rem;font-weight:600;border:none;cursor:pointer;transition:0.15s',
      textContent: label,
    }) as HTMLElement;
    btn.addEventListener('click', () => setMode(key as SearchMode));
    modeBtns[key as SearchMode] = btn;
    modeBar.appendChild(btn);
  }
  exPanel.appendChild(modeBar);

  // Search / results area
  const searchWrap = el('div', { className: 'search-bar' });
  searchWrap.innerHTML = `<span class="icon">${iconHtml('search')}</span>`;
  const input = el('input', {
    type: 'search',
    placeholder: 'Find exercise…',
    'aria-label': 'Find exercise',
  }) as HTMLInputElement;
  searchWrap.appendChild(input);
  const results = el('div', { className: 'list' });
  const chartHost = el('div');
  const detailPanel = el('div', { style: 'display:none' });
  exPanel.append(searchWrap, results, chartHost, detailPanel);
  shell.appendChild(exPanel);

  // Chart controls
  const controls = el('div', { style: 'display:flex;gap:0.3rem;align-items:center;flex-wrap:wrap;margin-top:0.3rem' });
  let chartType: ChartType = 'max_weight';
  let timeFrame: TimeFrame = 0;

  const repaintControls = () => {
    clear(controls);
    controls.appendChild(el('span', { style: 'font-size:0.75rem;color:var(--text-3);font-weight:600;margin-right:0.2rem', textContent: 'Type:' }));
    for (const [key, label] of Object.entries(CHART_LABELS)) {
      const btn = el('button', {
        type: 'button',
        style: `padding:0.2rem 0.45rem;font-size:0.72rem;font-weight:600;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;background:${key === chartType ? 'var(--accent)' : 'transparent'};color:${key === chartType ? 'var(--text-inv)' : 'var(--text-2)'}`,
        textContent: label,
      });
      btn.addEventListener('click', () => {
        chartType = key as ChartType;
        repaintControls();
        if (currentEx) renderChart(currentEx.id, currentEx.name);
      });
      controls.appendChild(btn);
    }
    controls.appendChild(el('span', { style: 'font-size:0.75rem;color:var(--text-3);font-weight:600;margin:0 0.2rem 0 0.5rem', textContent: 'Range:' }));
    for (const [key, label] of [['30', '1m'], ['90', '3m'], ['180', '6m'], ['365', '1y'], ['0', 'All']] as const) {
      const btn = el('button', {
        type: 'button',
        style: `padding:0.2rem 0.45rem;font-size:0.72rem;font-weight:600;border:1px solid var(--border-subtle);border-radius:4px;cursor:pointer;background:${String(timeFrame) === key ? 'var(--accent)' : 'transparent'};color:${String(timeFrame) === key ? 'var(--text-inv)' : 'var(--text-2)'}`,
        textContent: label,
      });
      btn.addEventListener('click', () => {
        timeFrame = parseInt(key) as TimeFrame;
        repaintControls();
        if (currentEx) renderChart(currentEx.id, currentEx.name);
      });
      controls.appendChild(btn);
    }
  };

  const detailCache = new Map<string, Array<{ set: SetEntry; date: string; workoutId: string }>>();

  const renderDetail = (raw: Array<{ set: SetEntry; date: string; workoutId: string }>, dateStr: string) => {
    clear(detailPanel);
    const daySets = raw.filter((r) => r.date === dateStr);
    if (daySets.length === 0) {
      detailPanel.style.display = 'none';
      return;
    }

    const weights = daySets.map((r) => r.set.weight).filter((w): w is number => w !== null);
    const weightedSets = daySets.filter((r) => r.set.weight !== null && r.set.reps !== null) as Array<{
      set: { weight: number; reps: number };
      date: string;
      workoutId: string;
    }>;

    const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;
    const maxErm = weightedSets.length > 0
      ? Math.max(...weightedSets.map((r) => epley(r.set.weight, r.set.reps)))
      : 0;
    const max1RM = weightedSets.filter((r) => r.set.reps === 1).length > 0
      ? Math.max(...weightedSets.filter((r) => r.set.reps === 1).map((r) => r.set.weight))
      : 0;
    const volume = daySets.reduce((s, r) => s + (r.set.weight ?? 0) * (r.set.reps ?? 0), 0);

    const card = el('div', {
      className: 'panel panel-pad',
      style: 'margin-top:0.4rem;font-size:0.82rem;line-height:1.6',
    });
    card.appendChild(el('div', { style: 'font-weight:650;margin-bottom:0.25rem', textContent: dateStr }));
    const rows: string[] = [];
    if (maxWeight > 0) rows.push(`Max weight: ${maxWeight} ${unit}`);
    if (max1RM > 0) rows.push(`1RM: ${max1RM} ${unit}`);
    if (maxErm > 0) rows.push(`e1RM: ${Math.round(maxErm * 10) / 10} ${unit}`);
    if (volume > 0) rows.push(`Volume: ${volume} ${unit}×reps`);
    if (daySets.length > 0) {
      const setDesc = daySets
        .sort((a, b) => a.set.setNumber - b.set.setNumber)
        .map((r) => {
          const w = r.set.weight ?? 0;
          const reps = r.set.reps ?? 0;
          return w > 0 ? `${w}×${reps}` : `${reps}`;
        })
        .join(' · ');
      rows.push(`Sets: ${setDesc}`);
    }
    for (const r of rows) {
      card.appendChild(el('div', { textContent: r }));
    }

    detailPanel.style.display = '';
    detailPanel.appendChild(card);

    // Auto-scroll
    detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const renderChart = async (exId: string, exName: string) => {
    currentEx = { id: exId, name: exName };
    detailPanel.style.display = 'none';
    clear(chartHost);
    chartHost.appendChild(controls);
    repaintControls();

    const raw = await getExerciseHistory(exId, 500);
    detailCache.set(exId, raw);

    const now = new Date();
    const cutoff = timeFrame > 0 ? new Date(now.getTime() - timeFrame * 86400000).toISOString().slice(0, 10) : '';

    const byDay = new Map<string, number[]>();
    const weightReps = new Map<string, Array<{ weight: number; reps: number }>>();

    for (const h of raw) {
      if (h.set.isWarmup) continue;
      if (cutoff && h.date < cutoff) continue;
      const key = formatDate(h.date);
      if (chartType === 'volume') {
        if (h.set.weight && h.set.reps) {
          const vol = h.set.weight * h.set.reps;
          byDay.set(key, [...(byDay.get(key) ?? []), vol]);
        }
      } else {
        if (!weightReps.has(key)) weightReps.set(key, []);
        const arr = weightReps.get(key)!;
        if (h.set.weight) arr.push({ weight: h.set.weight, reps: h.set.reps ?? 0 });
      }
    }

    let series: ChartPoint[];
    // Build a map from xLabel (MM-DD) to full date for the first occurrence
    const labelToDate = new Map<string, string>();
    for (const h of raw) {
      if (h.set.isWarmup) continue;
      const key = formatDate(h.date);
      if (!labelToDate.has(key)) labelToDate.set(key, h.date);
    }

    if (chartType === 'volume') {
      series = Array.from(byDay.entries())
        .map(([xLabel, vals]) => ({ xLabel, y: vals.reduce((a, b) => a + b, 0), date: labelToDate.get(xLabel) }))
        .sort((a, b) => a.xLabel.localeCompare(b.xLabel));
    } else {
      series = Array.from(weightReps.entries())
        .map(([xLabel, entries]) => {
          let y: number;
          if (chartType === '1rm') {
            y = Math.max(...entries.filter((e) => e.reps === 1).map((e) => e.weight), 0);
          } else if (chartType === 'erm') {
            y = Math.max(...entries.map((e) => epley(e.weight, e.reps)));
          } else {
            y = Math.max(...entries.map((e) => e.weight));
          }
          return { xLabel, y, date: labelToDate.get(xLabel) };
        })
        .sort((a, b) => a.xLabel.localeCompare(b.xLabel));
    }

    chartHost.appendChild(el('div', { style: 'font-size:0.88rem;color:var(--text-2);margin:0.35rem 0', textContent: `${exName} — ${CHART_LABELS[chartType]}` }));
    chartHost.appendChild(
      renderLineChart(series.slice(-Math.min(series.length, 24)), {
        unit,
        onPointClick: (pt) => {
          const cached = detailCache.get(exId);
          if (cached && pt.date) renderDetail(cached, pt.date);
        },
      }),
    );
  };

  const renderSearchMode = async (mode: SearchMode) => {
    currentEx = null;
    detailPanel.style.display = 'none';
    clear(results);
    clear(chartHost);
    chartHost.appendChild(
      el('div', {
        style: 'color:var(--text-3);font-size:0.85rem;padding:0.5rem 0',
        textContent: mode === 'exercise' ? 'Search an exercise to view progress.' : 'Select a muscle group.',
      }),
    );
    input.value = '';
    input.placeholder = mode === 'exercise' ? 'Find exercise…' : 'Filter muscle groups…';
    if (mode === 'muscle') {
      const cats = await listCategories();
      for (const cat of cats) {
        const section = el('div', { style: 'margin-bottom:0.3rem' });
        const catHead = el('div', {
          style: 'font-weight:600;font-size:0.82rem;color:var(--text-2);padding:0.3rem 0',
          textContent: cat.name,
        });
        section.appendChild(catHead);
        const exs = await listExercises({ categoryId: cat.id });
        for (const ex of exs.slice(0, 6)) {
          const btn = el('button', { type: 'button', className: 'list-item', style: 'padding:0.3rem 0.5rem;font-size:0.82rem' });
          btn.appendChild(el('div', { className: 'title', textContent: ex.name }));
          btn.addEventListener('click', () => void renderChart(ex.id, ex.name));
          section.appendChild(btn);
        }
        if (exs.length > 6) {
          const more = el('div', { style: 'font-size:0.75rem;color:var(--text-3);padding:0.2rem 0.5rem', textContent: `+${exs.length - 6} more…` });
          section.appendChild(more);
        }
        results.appendChild(section);
      }
    }
  };

  // Exercise search
  const paintResults = async (q: string) => {
    if (searchMode !== 'exercise') return;
    currentEx = null;
    detailPanel.style.display = 'none';
    clear(results);
    clear(chartHost);
    if (!q.trim()) {
      chartHost.appendChild(el('div', { style: 'color:var(--text-3);font-size:0.85rem;padding:0.5rem 0', textContent: 'Search an exercise to view progress.' }));
      return;
    }
    const items = await listExercises({ query: q });
    for (const ex of items.slice(0, 8)) {
      const btn = el('button', { type: 'button', className: 'list-item' });
      btn.appendChild(el('div', { className: 'title', textContent: ex.name }));
      btn.addEventListener('click', () => void renderChart(ex.id, ex.name));
      results.appendChild(btn);
    }
  };

  input.addEventListener('input', debounce(() => void paintResults(input.value), 120));

  // Init
  setMode('exercise');

  root.appendChild(shell);
}
