import { el } from '../../utils/dom';
import {
  addDays,
  daysInMonth,
  isToday,
  monthLabel,
  startOfMonth,
  toDateKey,
  weekdayOf,
} from '../../utils/date';

export interface CalendarProps {
  month: string;
  selected: string;
  workoutDates: Set<string>;
  workoutMuscleGroups?: Map<string, string[]>;
  weekStartsOn: 0 | 1;
  onSelect: (date: string) => void;
  onDblClick?: (date: string) => void;
  onMonthChange: (month: string) => void;
}

export function renderCalendar(props: CalendarProps): HTMLElement {
  let dblClickTimer: ReturnType<typeof setTimeout> | null = null;
  let lastClickedDate: string | null = null;

  const root = el('div', { className: 'panel panel-pad', role: 'group', 'aria-label': 'Workout calendar' });
  const head = el('div', { className: 'cal-head' });
  const prev = el('button', { type: 'button', className: 'btn-icon', 'aria-label': 'Previous month' }, ['‹']);
  const next = el('button', { type: 'button', className: 'btn-icon', 'aria-label': 'Next month' }, ['›']);
  const title = el('div', { textContent: monthLabel(props.month), style: 'font-weight:650' });
  prev.addEventListener('click', () => {
    const d = startOfMonth(props.month);
    const dt = new Date(d + 'T12:00:00');
    dt.setMonth(dt.getMonth() - 1);
    props.onMonthChange(toDateKey(dt));
  });
  next.addEventListener('click', () => {
    const d = startOfMonth(props.month);
    const dt = new Date(d + 'T12:00:00');
    dt.setMonth(dt.getMonth() + 1);
    props.onMonthChange(toDateKey(dt));
  });
  head.append(prev, title, next);
  root.appendChild(head);

  const grid = el('div', { className: 'cal-grid' });
  const frag = document.createDocumentFragment();
  const labels = props.weekStartsOn === 1
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (const l of labels) frag.appendChild(el('div', { className: 'cal-dow', textContent: l }));

  const start = startOfMonth(props.month);
  const dim = daysInMonth(props.month);
  let startWeekday = weekdayOf(start);
  if (props.weekStartsOn === 1) startWeekday = (startWeekday + 6) % 7;

  for (let i = 0; i < startWeekday; i++) {
    const date = addDays(start, i - startWeekday);
    frag.appendChild(dayBtn(date, props, true));
  }
  for (let d = 1; d <= dim; d++) {
    const date = `${start.slice(0, 8)}${String(d).padStart(2, '0')}`;
    frag.appendChild(dayBtn(date, props, false));
  }
  const filled = startWeekday + dim;
  const trailing = (7 - (filled % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    const date = addDays(`${start.slice(0, 8)}${String(dim).padStart(2, '0')}`, i);
    frag.appendChild(dayBtn(date, props, true));
  }
  grid.appendChild(frag);

  root.appendChild(grid);

  grid.addEventListener('keydown', (e) => {
    const days = grid.querySelectorAll<HTMLButtonElement>('.cal-day:not(.muted)');
    const currentIndex = Array.from(days).indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex === -1) return;
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') nextIndex = Math.min(currentIndex + 1, days.length - 1);
    else if (e.key === 'ArrowLeft') nextIndex = Math.max(currentIndex - 1, 0);
    else if (e.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 7, days.length - 1);
    else if (e.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 7, 0);
    else return;
    e.preventDefault();
    days[nextIndex]?.focus();
  });

  return root;

  function dayBtn(date: string, props: CalendarProps, muted: boolean): HTMLElement {
    const day = Number(date.slice(8));
    const classes = ['cal-day'];
    if (muted) classes.push('muted');
    if (isToday(date)) classes.push('today');
    if (date === props.selected) classes.push('selected');
    if (props.workoutDates.has(date)) classes.push('has-workout');
    if (props.workoutMuscleGroups?.has(date)) {
      const groups = props.workoutMuscleGroups.get(date)!;
      for (const g of groups) {
        classes.push('mg-' + g.toLowerCase().replace(/[^a-z0-9]/g, '-'));
      }
    }
    const btn = el('button', {
      type: 'button',
      className: classes.join(' '),
      'aria-label': date,
      'aria-pressed': date === props.selected ? 'true' : 'false',
      textContent: String(day),
    });
    btn.addEventListener('click', () => {
      props.onSelect(date);
      if (dblClickTimer && lastClickedDate === date) {
        clearTimeout(dblClickTimer);
        dblClickTimer = null;
        lastClickedDate = null;
        props.onDblClick?.(date);
      } else {
        if (dblClickTimer) clearTimeout(dblClickTimer);
        dblClickTimer = setTimeout(() => { dblClickTimer = null; lastClickedDate = null; }, 300);
        lastClickedDate = date;
      }
    });
    return btn;
  }
}
