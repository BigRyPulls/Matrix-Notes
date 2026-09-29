import { createExercise, listCategories, listExercises } from '../../services/exercise.service';
import { addExerciseToWorkout } from '../../services/workout.service';
import type { Category, Exercise, ExerciseMetric } from '../../types';
import { debounce } from '../../utils/debounce';
import { el, clear } from '../../utils/dom';
import { openModal } from '../modal';
import { router } from '../router';
import { toast } from '../toast';
import { iconHtml } from '../icons';

const METRICS: Array<{ id: ExerciseMetric; label: string }> = [
  { id: 'weight_reps', label: 'Weight × Reps' },
  { id: 'bodyweight_reps', label: 'Bodyweight × Reps' },
  { id: 'duration', label: 'Duration' },
  { id: 'distance', label: 'Distance' },
  { id: 'weight_duration', label: 'Weight × Duration' },
];

export async function renderExercisesScreen(root: HTMLElement): Promise<void> {
  clear(root);
  const shell = el('div', { className: 'screen-enter stack' });
  const searchWrap = el('div', { className: 'search-bar' });
  searchWrap.innerHTML = `<span class="icon">${iconHtml('search')}</span>`;
  const input = el('input', {
    type: 'search',
    placeholder: 'Search exercises',
    'aria-label': 'Search exercises',
    autocomplete: 'off',
    enterkeyhint: 'search',
  }) as HTMLInputElement;
  searchWrap.appendChild(input);

  const chipsHost = el('div', { className: 'chips' });
  const listHost = el('div', { className: 'list' });
  const addBtn = el('button', {
    type: 'button',
    className: 'btn btn-primary btn-block',
    textContent: '+ New exercise',
  });

  shell.append(searchWrap, chipsHost, listHost, addBtn);
  root.appendChild(shell);

  const categories = await listCategories();
  let activeCat: string | null = null;
  let query = '';

  const paintChips = () => {
    renderCategoryChips(chipsHost, categories, activeCat, (catId) => {
      activeCat = catId;
      paintChips();
      void paintList();
    });
  };

  const paintList = async () => {
    const items = await listExercises({
      categoryId: activeCat ?? undefined,
      query: query || undefined,
    });
    clear(listHost);
    if (items.length === 0) {
      listHost.appendChild(
        el('div', { className: 'empty' }, [
          el('h3', { textContent: 'No exercises' }),
          el('p', { textContent: 'Try another search or add a custom exercise.' }),
        ]),
      );
      return;
    }
    const catMap = new Map(categories.map((c) => [c.id, c]));
    for (const ex of items) {
      listHost.appendChild(exerciseRow(ex, catMap.get(ex.categoryId)));
    }
  };

  input.addEventListener(
    'input',
    debounce(() => {
      query = input.value;
      void paintList();
    }, 120),
  );

  addBtn.addEventListener('click', () => {
    showCreateExercise(categories, (created) => {
      if (created) router.navigate('exercise-detail', { id: created.id });
      else void paintList();
    });
  });

  paintChips();
  await paintList();
}

function exerciseRow(ex: Exercise, cat?: Category): HTMLElement {
  const btn = el('button', { type: 'button', className: 'list-item' });
  const mid = el('div', { style: 'flex:1;min-width:0' });
  mid.append(
    el('div', { className: 'title', textContent: ex.name }),
    el('div', { className: 'meta', textContent: cat?.name ?? '—' }),
  );
  btn.append(mid, el('div', { className: 'chev', textContent: '›' }));
  btn.addEventListener('click', () => router.navigate('exercise-detail', { id: ex.id }));
  return btn;
}

function showCreateExercise(categories: Category[], onDone: (created?: Exercise) => void, prefillName?: string): void {
  const form = el('div', { className: 'stack' });
  const name = el('input', { placeholder: 'Exercise name', 'aria-label': 'Exercise name' }) as HTMLInputElement;
  if (prefillName) name.value = prefillName;
  const cat = el('select', { 'aria-label': 'Category' }) as HTMLSelectElement;
  for (const c of categories) {
    cat.appendChild(el('option', { value: c.id, textContent: c.name }));
  }
  const metric = el('select', { 'aria-label': 'Metric' }) as HTMLSelectElement;
  for (const m of METRICS) {
    metric.appendChild(el('option', { value: m.id, textContent: m.label }));
  }
  form.append(
    el('div', { className: 'field' }, [el('label', { textContent: 'Name' }), name]),
    el('div', { className: 'field' }, [el('label', { textContent: 'Category' }), cat]),
    el('div', { className: 'field' }, [el('label', { textContent: 'Type' }), metric]),
  );

  openModal({
    title: 'New exercise',
    content: form,
    center: true,
    actions: [
      { label: 'Cancel', variant: 'ghost' },
      {
        label: 'Create',
        variant: 'primary',
        onClick: async () => {
          if (!name.value.trim()) {
            toast('Name required');
            throw new Error('validation');
          }
          const created = await createExercise({
            name: name.value,
            categoryId: cat.value,
            metric: metric.value as ExerciseMetric,
          });
          toast('Exercise created');
          onDone(created);
        },
      },
    ],
  });
}

export async function renderPickExerciseScreen(
  root: HTMLElement,
  params: Record<string, string>,
): Promise<void> {
  clear(root);
  const workoutId = params['workoutId'];
  if (!workoutId) {
    root.appendChild(el('div', { className: 'empty', textContent: 'Missing workout' }));
    return;
  }

  const shell = el('div', { className: 'screen-enter stack' });
  const searchWrap = el('div', { className: 'search-bar' });
  searchWrap.innerHTML = `<span class="icon">${iconHtml('search')}</span>`;
  const input = el('input', {
    type: 'search',
    placeholder: 'Search to add…',
    'aria-label': 'Search exercises',
    autocomplete: 'off',
  }) as HTMLInputElement;
  searchWrap.appendChild(input);
  const chipsHost = el('div', { className: 'chips' });
  const listHost = el('div', { className: 'list' });
  shell.append(searchWrap, chipsHost, listHost);
  root.appendChild(shell);

  const categories = await listCategories();
  let activeCat: string | null = null;
  let query = '';

  const paintChips = () => {
    renderCategoryChips(chipsHost, categories, activeCat, (catId) => {
      activeCat = catId;
      paintChips();
      void paintList();
    });
  };

  const paintList = async () => {
    const items = await listExercises({
      categoryId: activeCat ?? undefined,
      query: query || undefined,
    });
    clear(listHost);
    for (const ex of items) {
      const btn = el('button', { type: 'button', className: 'list-item' });
      btn.append(
        el('div', { style: 'flex:1' }, [
          el('div', { className: 'title', textContent: ex.name }),
          el('div', {
            className: 'meta',
            textContent: categories.find((c) => c.id === ex.categoryId)?.name ?? '',
          }),
        ]),
      );
      btn.addEventListener('click', async () => {
        await addExerciseToWorkout(workoutId, ex.id);
        toast(`Added ${ex.name}`);
        router.navigate('workout', { id: workoutId });
      });
      listHost.appendChild(btn);
    }
    if (items.length === 0 && query.trim()) {
      const createBtn = el('button', {
        type: 'button',
        className: 'btn btn-primary btn-block',
        textContent: `Create "${query}"`,
      });
      createBtn.addEventListener('click', () => {
        showCreateExercise(categories, async (created) => {
          if (!created) return;
          await addExerciseToWorkout(workoutId, created.id);
          toast(`Added ${created.name}`);
          router.navigate('workout', { id: workoutId });
        }, query.trim());
      });
      listHost.appendChild(createBtn);
    }
  };

  input.addEventListener(
    'input',
    debounce(() => {
      query = input.value;
      void paintList();
    }, 100),
  );
  // autofocus for speed
  window.setTimeout(() => input.focus(), 50);
  paintChips();
  await paintList();
}

function renderCategoryChips(
  host: HTMLElement,
  categories: Category[],
  activeCat: string | null,
  onSelect: (catId: string | null) => void,
): void {
  clear(host);
  const all = el('button', {
    type: 'button',
    className: `chip${activeCat == null ? ' active' : ''}`,
    textContent: 'All',
  });
  all.addEventListener('click', () => onSelect(null));
  host.appendChild(all);
  for (const c of categories) {
    const chip = el('button', {
      type: 'button',
      className: `chip${activeCat === c.id ? ' active' : ''}`,
    });
    const dot = el('span', { className: `mg-dot mg-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` });
    chip.append(dot, document.createTextNode(' ' + c.name));
    chip.addEventListener('click', () => onSelect(c.id));
    host.appendChild(chip);
  }
}
