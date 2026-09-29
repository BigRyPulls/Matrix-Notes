type TimerListener = (state: RestTimerState) => void;

export interface RestTimerState {
  active: boolean;
  remainingSec: number;
  totalSec: number;
  finished: boolean;
}

let remaining = 0;
let total = 0;
let active = false;
let finished = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let worker: Worker | null = null;
const listeners = new Set<TimerListener>();
let audioCtx: AudioContext | null = null;

function snapshot(): RestTimerState {
  return { active, remainingSec: remaining, totalSec: total, finished };
}

function emit(): void {
  const s = snapshot();
  for (const l of listeners) l(s);
}

function playAlarm(): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate([80, 60, 120]);
  } catch { /* ignore */ }
  try {
    if (audioCtx?.state === 'suspended') audioCtx.resume();
    const ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch { /* ignore */ }
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Rest over!', { body: 'Time to start your next set.', silent: true });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  } catch { /* ignore */ }
}

function tick(): void {
  if (!active) return;
  remaining = Math.max(0, remaining - 1);
  if (remaining <= 0) {
    active = false;
    finished = true;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    playAlarm();
  }
  emit();
}

function initWorker(): Worker | null {
  try {
    const w = new Worker(new URL('./timer.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'tick') {
        remaining = msg.remaining;
        if (remaining > 0) emit();
      } else if (msg.type === 'done') {
        active = false;
        finished = true;
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        worker = null;
        playAlarm();
        emit();
      } else if (msg.type === 'stopped' || msg.type === 'paused') {
        worker = null;
      }
    };
    return w;
  } catch {
    return null;
  }
}

function stopWorker(): void {
  if (worker) {
    worker.postMessage({ type: 'stop' });
    worker.terminate();
    worker = null;
  }
}

export const restTimerService = {
  getState: snapshot,

  subscribe(fn: TimerListener): () => void {
    listeners.add(fn);
    fn(snapshot());
    return () => listeners.delete(fn);
  },

  start(seconds: number): void {
    total = Math.max(1, Math.floor(seconds));
    remaining = total;
    active = true;
    finished = false;
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch {}
    }
    stopWorker();
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    worker = initWorker();
    if (worker) {
      worker.postMessage({ type: 'start', seconds: total });
    } else {
      intervalId = setInterval(tick, 1000);
    }
    emit();
  },

  pause(): void {
    active = false;
    if (worker) {
      worker.postMessage({ type: 'pause' });
    } else if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    emit();
  },

  resume(): void {
    if (remaining <= 0) return;
    active = true;
    finished = false;
    if (worker) {
      worker.postMessage({ type: 'resume' });
    } else {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(tick, 1000);
    }
    emit();
  },

  stop(): void {
    active = false;
    finished = false;
    remaining = 0;
    total = 0;
    stopWorker();
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    emit();
  },

  add(seconds: number): void {
    remaining = Math.max(0, remaining + seconds);
    total = Math.max(total, remaining);
    finished = false;
    if (worker) {
      worker.postMessage({ type: 'add', seconds });
    }
    emit();
  },
};
