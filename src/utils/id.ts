let _counter = 0;

/** Generate a compact unique id (no external deps). */
export function createId(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now().toString(36)}${(_counter++).toString(36)}${Math.random().toString(36).slice(2, 9)}`;
  return prefix ? `${prefix}_${rand}` : rand;
}
