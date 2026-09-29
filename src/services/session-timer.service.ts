type Listener = (elapsed: number) => void;

let elapsed = 0;
let running = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l(elapsed);
}

export const sessionTimerService = {
  start(): void {
    if (running) return;
    elapsed = 0;
    running = true;
    intervalId = setInterval(() => {
      elapsed++;
      emit();
    }, 1000);
    emit();
  },

  stop(): number {
    running = false;
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    const total = elapsed;
    emit();
    return total;
  },

  getElapsed(): number { return elapsed; },
  isRunning(): boolean { return running; },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(elapsed);
    return () => listeners.delete(fn);
  },
};
