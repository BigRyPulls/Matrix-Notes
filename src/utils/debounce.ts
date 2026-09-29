export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | undefined;
  const wrapped = ((...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
  return wrapped;
}

export function throttle<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let last = 0;
  let pending: ReturnType<typeof setTimeout> | undefined;
  const wrapped = ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      if (pending) clearTimeout(pending);
      pending = undefined;
      last = now;
      fn(...args);
    } else if (!pending) {
      pending = setTimeout(() => {
        last = Date.now();
        pending = undefined;
        fn(...args);
      }, remaining);
    }
  }) as T;
  return wrapped;
}
