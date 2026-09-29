import type { ExerciseMetric, SetEntry, WorkoutExercise } from '../../types';
import {
  addSet,
  copyWorkoutToToday,
  deleteSet,
  deleteWorkout,
  getOrCreateWorkoutForDate,
  getLastPerformance,
  getWorkoutBundle,
  removeWorkoutExercise,
  reorderExercises,
  saveWorkoutAsTemplate,
  updateSet,
  updateWorkout,
  type WorkoutBundle,
} from '../../services/workout.service';
import { getSettingsSync } from '../../services/settings.service';
import { formatRelativeDay, toDateKey } from '../../utils/date';
import { formatSetSummary, parseNumberInput } from '../../utils/format';
import { el, clear, haptics } from '../../utils/dom';
import { mountRestTimer } from '../components/rest-timer';
import { confirmDialog, openModal } from '../modal';
import { router } from '../router';
import { toast } from '../toast';
import { undoService } from '../../services/undo.service';
import { sessionTimerService } from '../../services/session-timer.service';
import { setHeaderExtraContent } from '../app-shell';
import { iconHtml } from '../icons';

export async function renderWorkoutScreen(root: HTMLElement, params: Record<string, string>): Promise<void> {
  clear(root);
  const id = params['id'];
  if (!id) {
    root.appendChild(el('div', { className: 'empty', textContent: 'Workout not found' }));
    return;
  }

  let bundle = await getWorkoutBundle(id);
  if (!bundle) {
    root.appendChild(el('div', { className: 'empty', textContent: 'Workout not found' }));
    return;
  }

  const settings = getSettingsSync();
  const unit = settings?.weightUnit ?? 'kg';
  const shell = el('div', { className: 'screen-enter' });
  const unsubTimer = mountRestTimer(shell);
  const body = el('div', { className: 'stack' });
  shell.appendChild(body);
  root.appendChild(shell);

  const cleanupFns: Array<() => void> = [unsubTimer];
  const tbodyRefs = new Map<string, HTMLElement>();
  const observer = new MutationObserver(() => {
    if (!document.body.contains(shell)) {
      cleanupFns.forEach((f) => f());
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  async function reloadBlock(weId: string): Promise<void> {
    bundle = await getWorkoutBundle(id!);
    if (!bundle) return;
    const tbody = tbodyRefs.get(weId);
    if (!tbody) { paint(); return; }
    const block = bundle.exercises.find((b) => b.workoutExercise.id === weId);
    if (!block) { paint(); return; }
    const metric = block.workoutExercise.metric;
    const blockReload = () => reloadBlock(weId);
    clear(tbody);
    for (const set of block.sets) {
      tbody.appendChild(renderSetRow(set, metric, unit, blockReload));
    }
  }

  function paint(): void {
    if (!bundle) return;
    clear(body);
    cleanupFns.splice(1).forEach((f) => f());
    tbodyRefs.clear();

    const frag = document.createDocumentFragment();

    const head = el('div', { className: 'panel panel-pad' });
    const nameBtn = el('button', {
      type: 'button',
      className: 'btn-ghost',
      style: 'font-weight:700;font-size:1.05rem;padding:0;min-height:auto;border:none;text-align:left',
      textContent: bundle.workout.name,
    });
    nameBtn.addEventListener('click', () => void editWorkoutMeta(bundle!));
    const dateRow = el('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;margin-top:0.2rem',
    });
    const dateEl = el('div', {
      style: 'color:var(--text-3);font-size:0.82rem',
      textContent: formatRelativeDay(bundle.workout.date),
    });
    const reorderBtn = el('button', {
      type: 'button',
      className: 'btn-ghost',
      style: 'font-size:0.78rem;padding:0;min-height:auto;border:none;color:var(--accent)',
      textContent: 'Reorder',
    });
    reorderBtn.addEventListener('click', () => openReorderModal(bundle!));
    dateRow.append(dateEl, reorderBtn);
    head.append(nameBtn, dateRow);
    frag.appendChild(head);

    if (bundle.exercises.length === 0) {
      frag.appendChild(
        el('div', { className: 'empty' }, [
          el('h3', { textContent: 'No exercises yet' }),
          el('p', { textContent: 'Add an exercise to start logging sets.' }),
        ]),
      );
    }

    for (const block of bundle.exercises) {
      const weId = block.workoutExercise.id;
      const blockReload = () => reloadBlock(weId);
      const card = renderExerciseBlock(block, unit, blockReload, cleanupFns);
      const tbody = card.querySelector<HTMLElement>('.set-table tbody');
      if (tbody) tbodyRefs.set(weId, tbody);
      frag.appendChild(card);
    }

    const addBtn = el('button', {
      type: 'button',
      className: 'btn btn-primary btn-block',
      textContent: '+ Add exercise',
    });
    addBtn.addEventListener('click', () => {
      router.navigate('pick-exercise', { workoutId: id! });
    });
    frag.appendChild(addBtn);

    const tools = el('div', { className: 'row' });
    const tpl = el('button', { type: 'button', className: 'btn btn-ghost', textContent: 'Save template' });
    tpl.addEventListener('click', async () => {
      const name = bundle!.workout.name;
      await saveWorkoutAsTemplate(id!, name);
      toast('Template saved');
    });
    const del = el('button', { type: 'button', className: 'btn btn-danger', textContent: 'Delete' });
    del.addEventListener('click', async () => {
      const ok = settings?.confirmDelete
        ? await confirmDialog({ title: 'Delete workout?', message: 'This cannot be undone without Undo.', danger: true, confirmLabel: 'Delete' })
        : true;
      if (!ok) return;
      await deleteWorkout(id!);
      toast({
        message: 'Workout deleted',
        actionLabel: 'Undo',
        onAction: () => void undoService.undo().then(() => router.navigate('home')),
      });
      router.navigate('home');
    });
    tools.append(tpl, del);
    frag.appendChild(tools);

    const endBtn = el('button', {
      type: 'button',
      className: 'btn btn-primary btn-block',
      textContent: 'End Workout',
      style: 'margin-top:0.5rem',
    });
    endBtn.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: 'End workout?', message: 'This will mark the session as finished.', confirmLabel: 'End workout' });
      if (!ok) return;
      await updateWorkout(id!, { finishedAt: Date.now() });
      sessionTimerService.stop();
      endBtn.disabled = true;
      endBtn.textContent = 'Workout ended ✓';
      endBtn.classList.remove('btn-primary');
      endBtn.classList.add('btn-accent');
      toast('Workout ended');
    });
    frag.appendChild(endBtn);

    body.appendChild(frag);
  }

  paint();

  // Auto-scroll to last exercise with logged sets
  const currentBundle = bundle;
  requestAnimationFrame(() => {
    if (!currentBundle) return;
    const active = currentBundle.exercises.filter((b) => b.sets.length > 0);
    if (active.length > 0) {
      const last = active[active.length - 1]!;
      const target = body.querySelector<HTMLElement>(`[data-we-id="${last.workoutExercise.id}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  // Header right-side content: session timer + start button + workout options menu
  const right = el('div', { style: 'display:flex;align-items:center;gap:0.35rem' });
  const timerDisplay = el('span', {
    style: 'font-family:var(--font-mono);font-size:0.85rem;color:var(--accent);min-width:3.5rem;text-align:right',
    textContent: '0:00',
  });
  const startBtn = el('button', {
    type: 'button', className: 'btn btn-sm btn-primary',
    style: 'font-size:0.72rem;padding:0.15rem 0.4rem;min-height:auto;' + (sessionTimerService.isRunning() ? 'display:none' : ''),
    textContent: 'Start',
  });
  startBtn.addEventListener('click', () => {
    sessionTimerService.start();
    startBtn.style.display = 'none';
  });
  const headerMoreBtn = el('button', {
    type: 'button', className: 'btn-icon',
    'aria-label': 'Workout options', textContent: '⋮',
  });
  headerMoreBtn.addEventListener('click', () => {
    showWorkoutMenu(id!);
  });
  right.append(timerDisplay, startBtn, headerMoreBtn);
  setHeaderExtraContent(right);

  const unsubSessionTimer = sessionTimerService.subscribe((elapsed) => {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    timerDisplay.textContent = `${m}:${String(s).padStart(2, '0')}`;
    if (elapsed > 0) startBtn.style.display = 'none';
  });
  cleanupFns.push(unsubSessionTimer);
  cleanupFns.push(() => setHeaderExtraContent(null));
}

function showWorkoutMenu(workoutId: string): void {
  const content = el('div', { className: 'stack' });
  const copyBtn = el('button', { type: 'button', className: 'list-item', textContent: 'Copy to Today' });
  let modalClose: (() => void) | null = null;
  copyBtn.addEventListener('click', async () => {
    modalClose?.();
    await copyWorkoutToToday(workoutId);
    const today = toDateKey();
    const w = await getOrCreateWorkoutForDate(today);
    toast('Copied to today\'s workout');
    router.navigate('workout', { id: w.id });
  });
  content.appendChild(copyBtn);
  const m = openModal({ title: 'Workout options', content });
  modalClose = m.close;
}

function openReorderModal(bundle: WorkoutBundle): void {
  const ids = bundle.exercises.map((b) => b.workoutExercise.id);
  const names = bundle.exercises.map((b) => b.workoutExercise.exerciseName);

  const content = el('div', { className: 'stack', style: 'max-height:70vh;overflow-y:auto' });
  const list = el('div', { className: 'list' });

  function paintList(): void {
    clear(list);
    for (let i = 0; i < ids.length; i++) {
      const row = el('div', {
        style: 'display:flex;align-items:center;gap:0.35rem;padding:0.5rem 0;border-bottom:1px solid var(--border-subtle)',
      });
      const label = el('span', {
        style: 'flex:1;font-size:0.9rem;font-weight:500',
        textContent: `${i + 1}. ${names[i]}`,
      });
      row.appendChild(label);

      const upBtn = el('button', {
        type: 'button',
        className: 'btn-icon',
        'aria-label': 'Move up',
        style: 'width:36px;min-width:36px;height:36px;font-size:1rem;font-weight:700',
        textContent: '▲',
      });
      upBtn.disabled = i === 0;
      upBtn.style.opacity = i === 0 ? '0.3' : '';
      const idx = i;
      upBtn.addEventListener('click', () => {
        if (idx === 0) return;
        [ids[idx], ids[idx - 1]] = [ids[idx - 1]!, ids[idx]!];
        [names[idx], names[idx - 1]] = [names[idx - 1]!, names[idx]!];
        paintList();
      });
      row.appendChild(upBtn);

      const dnBtn = el('button', {
        type: 'button',
        className: 'btn-icon',
        'aria-label': 'Move down',
        style: 'width:36px;min-width:36px;height:36px;font-size:1rem;font-weight:700',
        textContent: '▼',
      });
      dnBtn.disabled = i === ids.length - 1;
      dnBtn.style.opacity = i === ids.length - 1 ? '0.3' : '';
      dnBtn.addEventListener('click', () => {
        if (idx === ids.length - 1) return;
        [ids[idx], ids[idx + 1]] = [ids[idx + 1]!, ids[idx]!];
        [names[idx], names[idx + 1]] = [names[idx + 1]!, names[idx]!];
        paintList();
      });
      row.appendChild(dnBtn);

      list.appendChild(row);
    }
  }
  paintList();
  content.appendChild(list);

  const { close } = openModal({
    title: 'Reorder exercises',
    content,
    center: true,
    actions: [
      {
        label: 'Cancel',
        variant: 'ghost',
        onClick: () => close(),
      },
      {
        label: 'Apply',
        variant: 'primary',
        onClick: async () => {
          await reorderExercises(bundle.workout.id, ids);
          close();
          router.navigate('workout', { id: bundle.workout.id }, true);
        },
      },
    ],
  });
}

function renderExerciseBlock(
  block: {
    workoutExercise: WorkoutExercise;
    sets: SetEntry[];
    exercise?: { metric: ExerciseMetric };
  },
  unit: 'kg' | 'lb',
  reload: () => Promise<void>,
  _cleanupFns: Array<() => void>,
): HTMLElement {
  const we = block.workoutExercise;
  const metric = we.metric;
  const card = el('div', { className: 'panel exercise-block', 'data-we-id': we.id });
  const head = el('div', { className: 'exercise-block-head' });
  const titles = el('div', { style: 'flex:1;min-width:0' });
  const titleBtn = el('button', {
    type: 'button',
    style: 'font-weight:700;font-size:1rem;text-align:left;border:none;background:none;color:inherit;padding:0',
    textContent: we.exerciseName,
  });
  titleBtn.addEventListener('click', () => router.navigate('exercise-detail', { id: we.exerciseId }));
  titles.appendChild(titleBtn);
  const lastHost = el('div', { className: 'last', textContent: 'Loading…' });
  titles.appendChild(lastHost);
  void getLastPerformance(we.exerciseId).then((sets) => {
    if (sets.length === 0) {
      lastHost.textContent = 'No history';
      return;
    }
    const best = sets.filter((s) => !s.isWarmup).at(-1) ?? sets[sets.length - 1]!;
    lastHost.textContent = `Last: ${formatSetSummary(metric, best.weight, best.reps, best.durationSec, best.distance, unit)}`;
  });

  const delBtn = el('button', { type: 'button', className: 'btn-icon', 'aria-label': 'Remove exercise', style: 'width:36px;min-width:36px;height:36px' });
  delBtn.innerHTML = iconHtml('trash');
  delBtn.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Remove exercise?',
      message: `Remove ${we.exerciseName} and its sets from this workout?`,
      danger: true,
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    await removeWorkoutExercise(we.id);
    toast({ message: 'Exercise removed', actionLabel: 'Undo', onAction: () => void undoService.undo().then(reload) });
    await reload();
  });
  head.append(titles, delBtn);
  card.appendChild(head);

  const body = el('div', { className: 'exercise-block-body' });
  const table = el('table', { className: 'set-table' });
  const thead = el('thead');
  const headRow = el('tr');
  headRow.append(
    el('th', { textContent: '#' }),
    ...metricHeaders(metric).map((h) => el('th', { textContent: h })),
    el('th', { textContent: '' }),
  );
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = el('tbody');

  for (const set of block.sets) {
    tbody.appendChild(renderSetRow(set, metric, unit, reload));
  }
  table.appendChild(tbody);
  body.appendChild(table);

  // Quick add form
  const form = el('div', { className: 'row', style: 'margin-top:0.55rem;align-items:stretch' });
  const inputs = createMetricInputs(metric, block.sets);
  const logBtn = el('button', {
    type: 'button',
    className: 'btn btn-primary',
    style: 'flex:0 0 auto;min-width:72px',
    textContent: 'Log',
  });

  const doLog = async (warmup = false) => {
    const values = readMetricInputs(inputs, metric);
    const { isPR } = await addSet({
      workoutExerciseId: we.id,
      ...values,
      isWarmup: warmup,
    });
    haptics(getSettingsSync()?.haptics ?? true, isPR ? 'success' : 'light');
    if (isPR) toast('🏆 Personal record!');
    // advance defaults from just logged
    seedInputsFromValues(inputs, metric, values);
    await reload();
  };

  logBtn.addEventListener('click', () => void doLog(false));
  form.append(...inputs.nodes, logBtn);
  body.appendChild(form);

  const quick = el('div', { className: 'row', style: 'margin-top:0.4rem' });
  const warmupBtn = el('button', { type: 'button', className: 'btn btn-sm btn-ghost', textContent: 'Warm-up set' });
  warmupBtn.addEventListener('click', () => void doLog(true));
  const sameBtn = el('button', { type: 'button', className: 'btn btn-sm btn-accent', textContent: 'Repeat last' });
  sameBtn.addEventListener('click', async () => {
    const last = block.sets.at(-1);
    if (!last) {
      toast('No set to repeat');
      return;
    }
    await addSet({
      workoutExerciseId: we.id,
      weight: last.weight,
      reps: last.reps,
      durationSec: last.durationSec,
      distance: last.distance,
      isWarmup: false,
    });
    haptics(getSettingsSync()?.haptics ?? true, 'light');
    await reload();
  });
  quick.append(warmupBtn, sameBtn);
  body.appendChild(quick);

  card.appendChild(body);

  // Prefill from last set in this block or history
  if (block.sets.length > 0) {
    const last = block.sets[block.sets.length - 1]!;
    seedInputsFromValues(inputs, metric, {
      weight: last.weight,
      reps: last.reps,
      durationSec: last.durationSec,
      distance: last.distance,
    });
  } else {
    void getLastPerformance(we.exerciseId).then((hist) => {
      const last = hist.filter((s) => !s.isWarmup).at(-1) ?? hist.at(-1);
      if (!last) return;
      seedInputsFromValues(inputs, metric, {
        weight: last.weight,
        reps: last.reps,
        durationSec: last.durationSec,
        distance: last.distance,
      });
    });
  }

  return card;
}

function metricHeaders(metric: ExerciseMetric): string[] {
  switch (metric) {
    case 'weight_reps':
      return ['kg/lb', 'Reps'];
    case 'bodyweight_reps':
      return ['+W', 'Reps'];
    case 'duration':
      return ['Sec'];
    case 'distance':
      return ['Dist', 'Sec'];
    case 'weight_duration':
      return ['W', 'Sec'];
    default:
      return [];
  }
}

interface MetricInputs {
  nodes: HTMLElement[];
  weight?: HTMLInputElement;
  reps?: HTMLInputElement;
  duration?: HTMLInputElement;
  distance?: HTMLInputElement;
}

function createMetricInputs(metric: ExerciseMetric, existing: SetEntry[]): MetricInputs {
  const mk = (placeholder: string, inputMode: string, aria: string) => {
    const i = el('input', {
      className: 'set-input',
      type: 'text',
      inputmode: inputMode,
      placeholder,
      'aria-label': aria,
      autocomplete: 'off',
    }) as HTMLInputElement;
    i.addEventListener('focus', () => i.select());
    return i;
  };
  const result: MetricInputs = { nodes: [] };
  switch (metric) {
    case 'weight_reps':
    case 'bodyweight_reps': {
      result.weight = mk('W', 'decimal', 'Weight');
      result.reps = mk('R', 'numeric', 'Reps');
      result.nodes.push(result.weight, result.reps);
      break;
    }
    case 'duration': {
      result.duration = mk('Sec', 'numeric', 'Duration seconds');
      result.nodes.push(result.duration);
      break;
    }
    case 'distance': {
      result.distance = mk('Dist', 'decimal', 'Distance');
      result.duration = mk('Sec', 'numeric', 'Duration seconds');
      result.nodes.push(result.distance, result.duration);
      break;
    }
    case 'weight_duration': {
      result.weight = mk('W', 'decimal', 'Weight');
      result.duration = mk('Sec', 'numeric', 'Duration seconds');
      result.nodes.push(result.weight, result.duration);
      break;
    }
  }
  // default reps 8–12 common
  if (result.reps && existing.length === 0) result.reps.value = '8';
  return result;
}

function readMetricInputs(
  inputs: MetricInputs,
  _metric: ExerciseMetric,
): {
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
  distance: number | null;
} {
  return {
    weight: inputs.weight ? parseNumberInput(inputs.weight.value) : null,
    reps: inputs.reps ? parseNumberInput(inputs.reps.value) : null,
    durationSec: inputs.duration ? parseNumberInput(inputs.duration.value) : null,
    distance: inputs.distance ? parseNumberInput(inputs.distance.value) : null,
  };
}

function seedInputsFromValues(
  inputs: MetricInputs,
  _metric: ExerciseMetric,
  values: {
    weight?: number | null;
    reps?: number | null;
    durationSec?: number | null;
    distance?: number | null;
  },
): void {
  if (inputs.weight && values.weight != null) inputs.weight.value = String(values.weight);
  if (inputs.reps && values.reps != null) inputs.reps.value = String(values.reps);
  if (inputs.duration && values.durationSec != null) inputs.duration.value = String(values.durationSec);
  if (inputs.distance && values.distance != null) inputs.distance.value = String(values.distance);
}

function renderSetRow(
  set: SetEntry,
  metric: ExerciseMetric,
  unit: 'kg' | 'lb',
  reload: () => Promise<void>,
): HTMLElement {
  const tr = el('tr');
  if (set.isPR) tr.classList.add('pr-flash');
  tr.appendChild(el('td', { className: 'set-num', textContent: set.isWarmup ? 'W' : String(set.setNumber) }));

  const summary = formatSetSummary(metric, set.weight, set.reps, set.durationSec, set.distance, unit);
  const cell = el('td', { colSpan: String(metricHeaders(metric).length) });
  const line = el('div', { className: 'row', style: 'justify-content:flex-start;gap:0.4rem' });
  line.appendChild(el('span', { style: 'font-family:var(--font-mono);font-weight:600', textContent: summary }));
  if (set.isPR) line.appendChild(el('span', { className: 'badge badge-pr', textContent: 'PR' }));
  if (set.isWarmup) line.appendChild(el('span', { className: 'badge badge-warm', textContent: 'WU' }));
  cell.appendChild(line);
  tr.appendChild(cell);

  const actions = el('td');
  const del = el('button', { type: 'button', className: 'btn-icon', 'aria-label': 'Delete set', textContent: '×' });
  del.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Delete set?', message: 'This can be undone with Undo.', danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    await deleteSet(set.id);
    await reload();
  });
  // tap summary to edit quickly
  line.style.cursor = 'pointer';
  line.addEventListener('click', () => void editSetModal(set, metric, reload));
  actions.appendChild(del);
  tr.appendChild(actions);
  return tr;
}

async function editSetModal(set: SetEntry, metric: ExerciseMetric, reload: () => Promise<void>): Promise<void> {
  const form = el('div', { className: 'stack' });
  const inputs = createMetricInputs(metric, [set]);
  seedInputsFromValues(inputs, metric, set);
  for (const n of inputs.nodes) {
    form.appendChild(n);
  }
  openModal({
    title: 'Edit set',
    content: form,
    center: true,
    actions: [
      { label: 'Cancel', variant: 'ghost' },
      {
        label: 'Save',
        variant: 'primary',
        onClick: async () => {
          const v = readMetricInputs(inputs, metric);
          await updateSet(set.id, v);
          await reload();
        },
      },
    ],
  });
}

async function editWorkoutMeta(bundle: WorkoutBundle): Promise<void> {
  const form = el('div', { className: 'stack' });
  const name = el('input', { value: bundle.workout.name, 'aria-label': 'Workout name' }) as HTMLInputElement;
  name.addEventListener('focus', () => name.select());
  const notes = el('textarea', { 'aria-label': 'Notes' }) as HTMLTextAreaElement;
  notes.addEventListener('focus', () => notes.select());
  notes.value = bundle.workout.notes;
  form.append(
    el('div', { className: 'field' }, [el('label', { textContent: 'Name' }), name]),
    el('div', { className: 'field' }, [el('label', { textContent: 'Notes' }), notes]),
  );
  openModal({
    title: 'Edit workout',
    content: form,
    center: true,
    actions: [
      { label: 'Cancel', variant: 'ghost' },
      {
        label: 'Save',
        variant: 'primary',
        onClick: async () => {
          await updateWorkout(bundle.workout.id, { name: name.value, notes: notes.value });
          router.navigate('workout', { id: bundle.workout.id }, true);
        },
      },
    ],
  });
}
