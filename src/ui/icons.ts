/** Inline SVG icons as strings for light DOM injection. */
export type IconName =
  | 'home'
  | 'dumbbell'
  | 'history'
  | 'chart'
  | 'more'
  | 'back'
  | 'plus'
  | 'search'
  | 'check'
  | 'trash'
  | 'copy'
  | 'timer'
  | 'edit'
  | 'program';

export const icons: Record<IconName, string> = {
  home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/></svg>`,
  dumbbell: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/></svg>`,
  history: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 5v4h4"/><path d="M12 8v5l3 2"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16M7 16V9M12 16V5M17 16v-7"/></svg>`,
  more: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>`,
  back: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6 9 12l6 6"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16.5 16.5 20 20"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>`,
  timer: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7"/><path d="M12 10v3l2 2M9 3h6"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4"/></svg>`,
  program: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v2H4zM4 8h16v2H4zM4 12h12v2H4zM4 16h8v2H4zM18 14l4 3-4 3v-6z"/></svg>`,
};

export function iconHtml(name: IconName): string {
  return icons[name];
}
