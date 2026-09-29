import type { RouteState, ScreenId } from '../types';
import { el, clear } from '../utils/dom';
import { iconHtml, type IconName } from './icons';
import { router } from './router';
import { renderHomeScreen } from './screens/home.screen';
import { renderWorkoutScreen } from './screens/workout.screen';
import { renderExercisesScreen, renderPickExerciseScreen } from './screens/exercises.screen';
import { renderExerciseDetailScreen } from './screens/exercise-detail.screen';
import { renderHistoryScreen } from './screens/history.screen';
import { renderGraphsScreen } from './screens/graphs.screen';
import { renderSettingsScreen } from './screens/settings.screen';
import { renderMeasurementsScreen } from './screens/measurements.screen';
import { renderTemplatesScreen } from './screens/templates.screen';
import { renderProgramsScreen } from './screens/programs.screen';
import { renderProgramDetailScreen } from './screens/program-detail.screen';
import { renderProgramSessionScreen } from './screens/program-session.screen';
import { renderProgramCreatorScreen } from './screens/program-creator.screen';
import { renderReleaseNotesScreen } from './screens/release-notes.screen';
import { getOrCreateWorkoutForDate } from '../services/workout.service';
import { toDateKey } from '../utils/date';
import { undoService } from '../services/undo.service';
import { toast } from './toast';

interface NavItem {
  id: ScreenId;
  label: string;
  icon: IconName;
  match: ScreenId[];
}

const NAV: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', match: ['home'] },
  { id: 'exercises', label: 'Exercises', icon: 'dumbbell', match: ['exercises', 'exercise-detail', 'edit-exercise'] },
  { id: 'history', label: 'History', icon: 'history', match: ['history', 'workout', 'pick-exercise'] },
  { id: 'graphs', label: 'Graphs', icon: 'chart', match: ['graphs'] },
  { id: 'settings', label: 'More', icon: 'more', match: ['settings', 'measurements', 'templates', 'release-notes'] },
];

const TITLES: Partial<Record<ScreenId, string>> = {
  home: 'MatrixNotes',
  workout: 'Workout',
  exercises: 'Exercises',
  'exercise-detail': 'Exercise',
  history: 'History',
  graphs: 'Graphs',
  settings: 'More',
  measurements: 'Measurements',
  templates: 'Templates',
  'pick-exercise': 'Add exercise',
  'edit-exercise': 'Edit exercise',
  programs: 'Programs',
  'program-detail': 'Program',
  'program-session': 'Session',
  'program-creator': 'Create Program',
  'release-notes': 'Release Notes',
};

let _setHeaderExtra: ((el: HTMLElement | null) => void) | null = null;

export function setHeaderExtraContent(el: HTMLElement | null): void {
  _setHeaderExtra?.(el);
}

export function mountAppShell(appRoot: HTMLElement): void {
  clear(appRoot);
  const shell = el('div', { className: 'app-shell' });
  const header = el('header', { className: 'app-header' });
  const backBtn = el('button', {
    type: 'button',
    className: 'btn-icon back-btn hidden',
    'aria-label': 'Back',
  });
  backBtn.innerHTML = iconHtml('back');
  backBtn.addEventListener('click', () => router.back());

  const titleWrap = el('div', { style: 'flex:1;min-width:0' });
  const title = el('h1', { textContent: 'MatrixNotes' });
  const subtitle = el('span', { className: 'subtitle hidden' });
  titleWrap.append(title, subtitle);

  const actionBtn = el('button', {
    type: 'button',
    className: 'btn-icon',
    'aria-label': 'Quick workout',
    title: 'Today\'s workout',
  });
  actionBtn.innerHTML = iconHtml('plus');
  actionBtn.addEventListener('click', async () => {
    const w = await getOrCreateWorkoutForDate(toDateKey());
    router.navigate('workout', { id: w.id });
  });

  const headerExtra = el('div', { className: 'header-extra' });
  header.append(backBtn, titleWrap, actionBtn, headerExtra);
  _setHeaderExtra = (el) => {
    clear(headerExtra);
    if (el) headerExtra.appendChild(el);
  };

  const main = el('main', { className: 'app-main', id: 'main', tabindex: '-1' });
  const skipLink = el('a', { href: '#main', className: 'skip-link', textContent: 'Skip to content' });
  shell.appendChild(skipLink);
  const nav = el('nav', { className: 'bottom-nav', 'aria-label': 'Primary' });

  for (const item of NAV) {
    const btn = el('button', {
      type: 'button',
      className: 'nav-item',
      'data-nav': item.id,
      'aria-label': item.label,
    });
    btn.innerHTML = `${iconHtml(item.icon)}<span>${item.label}</span>`;
    btn.addEventListener('click', () => router.navigate(item.id));
    nav.appendChild(btn);
  }

  shell.append(header, main, nav);
  appRoot.appendChild(shell);

  let renderGen = 0;

  const render = async (route: RouteState) => {
    const gen = ++renderGen;

    // nav active state
    for (const btn of nav.querySelectorAll<HTMLElement>('.nav-item')) {
      const id = btn.dataset['nav'] as ScreenId;
      const def = NAV.find((n) => n.id === id);
      btn.classList.toggle('active', !!def?.match.includes(route.screen));
    }

    const showBack = !['home', 'exercises', 'history', 'graphs', 'settings', 'programs'].includes(route.screen);
    backBtn.classList.toggle('hidden', !showBack);
    const isWorkout = route.screen === 'workout';
    actionBtn.classList.toggle('hidden', isWorkout);
    if (!isWorkout) {
      clear(headerExtra);
    }
    title.textContent = TITLES[route.screen] ?? 'MatrixNotes';
    subtitle.classList.add('hidden');

    clear(main);
    const mount = el('div');
    main.appendChild(mount);
    main.classList.remove('screen-enter');
    // force reflow for animation
    void main.offsetWidth;

    try {
      switch (route.screen) {
        case 'home':
          await renderHomeScreen(mount);
          break;
        case 'workout':
          await renderWorkoutScreen(mount, route.params);
          break;
        case 'exercises':
          await renderExercisesScreen(mount);
          break;
        case 'pick-exercise':
          await renderPickExerciseScreen(mount, route.params);
          break;
        case 'exercise-detail':
          await renderExerciseDetailScreen(mount, route.params);
          break;
        case 'history':
          await renderHistoryScreen(mount);
          break;
        case 'graphs':
          await renderGraphsScreen(mount);
          break;
        case 'settings':
          await renderSettingsScreen(mount);
          break;
        case 'measurements':
          await renderMeasurementsScreen(mount);
          break;
        case 'templates':
          await renderTemplatesScreen(mount, route.params);
          break;
        case 'programs':
          await renderProgramsScreen(mount);
          break;
        case 'program-detail':
          await renderProgramDetailScreen(mount, route.params);
          break;
        case 'program-session':
          await renderProgramSessionScreen(mount, route.params);
          break;
        case 'program-creator':
          await renderProgramCreatorScreen(mount);
          break;
        case 'release-notes':
          await renderReleaseNotesScreen(mount);
          break;
        default:
          mount.appendChild(el('div', { className: 'empty', textContent: 'Screen not found' }));
      }
    } catch (err) {
      if (gen !== renderGen) return;
      console.error(err);
      clear(mount);
      mount.appendChild(
        el('div', { className: 'empty' }, [
          el('h3', { textContent: 'Something went wrong' }),
          el('p', { textContent: err instanceof Error ? err.message : 'Unknown error' }),
        ]),
      );
    }

    // Newer navigation already replaced `main` contents — this mount is detached.
    if (gen !== renderGen) return;
    main.classList.add('screen-enter');
    main.scrollTop = 0;
  };

  router.subscribe((r) => void render(r));
  void render(router.get());

  // Desktop shortcuts
  window.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'u' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void undoService.undo().then((label) => {
        if (label) toast(`Undid: ${label}`);
        else toast('Nothing to undo');
      });
    }
    if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      void getOrCreateWorkoutForDate(toDateKey()).then((w) => router.navigate('workout', { id: w.id }));
    }
    if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
      const search = document.querySelector<HTMLInputElement>('input[type="search"]');
      if (search) {
        e.preventDefault();
        search.focus();
      }
    }
  });
}
