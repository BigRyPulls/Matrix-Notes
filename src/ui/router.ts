import type { RouteState, ScreenId } from '../types';

type RouteListener = (route: RouteState) => void;

const listeners = new Set<RouteListener>();
let current: RouteState = { screen: 'home', params: {} };

function parseHash(): RouteState {
  const raw = location.hash.replace(/^#\/?/, '');
  if (!raw) return { screen: 'home', params: {} };
  const [screenPart, query = ''] = raw.split('?');
  const screen = (screenPart || 'home') as ScreenId;
  const params: Record<string, string> = {};
  if (query) {
    for (const pair of query.split('&')) {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
  }
  return { screen, params };
}

function toHash(route: RouteState): string {
  const q = Object.entries(route.params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `#/${route.screen}?${q}` : `#/${route.screen}`;
}

function emit(): void {
  for (const l of listeners) l(current);
}

export const router = {
  get(): RouteState {
    return current;
  },

  init(): void {
    current = parseHash();
    window.addEventListener('hashchange', () => {
      current = parseHash();
      emit();
    });
  },

  navigate(screen: ScreenId, params: Record<string, string> = {}, replace = false): void {
    if (screen === current.screen) {
      const eq = Object.keys(params).length === Object.keys(current.params).length &&
        Object.entries(params).every(([k, v]) => current.params[k] === v);
      if (eq) return;
    }
    const next: RouteState = { screen, params };
    const hash = toHash(next);
    current = next;

    if (replace) {
      history.replaceState(null, '', hash);
      emit();
      return;
    }

    // Same hash → hashchange will not fire; emit once ourselves.
    if (location.hash === hash) {
      emit();
      return;
    }

    // Changing the hash triggers hashchange → emit. Do not emit here or
    // async screens (e.g. exercise-detail) will paint twice.
    location.hash = hash.slice(1);
  },

  back(): void {
    history.back();
  },

  subscribe(fn: RouteListener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
