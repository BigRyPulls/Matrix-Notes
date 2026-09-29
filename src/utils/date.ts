/** Local-calendar date helpers (avoid UTC off-by-one). */

export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function formatDisplayDate(key: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = parseDateKey(key);
  return d.toLocaleDateString(undefined, opts ?? { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatFullDate(key: string): string {
  return formatDisplayDate(key, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function addDays(key: string, delta: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

export function startOfMonth(key: string): string {
  const d = parseDateKey(key);
  d.setDate(1);
  return toDateKey(d);
}

export function monthLabel(key: string): string {
  const d = parseDateKey(key);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function daysInMonth(key: string): number {
  const d = parseDateKey(key);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function weekdayOf(key: string): number {
  return parseDateKey(key).getDay();
}

export function isToday(key: string): boolean {
  return key === toDateKey();
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatRelativeDay(key: string): string {
  const today = toDateKey();
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  if (key === addDays(today, 1)) return 'Tomorrow';
  return formatDisplayDate(key);
}
