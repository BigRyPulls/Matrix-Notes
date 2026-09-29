let remaining = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'start') {
    remaining = Math.max(1, Math.floor(msg.seconds));
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      self.postMessage({ type: 'tick', remaining });
      if (remaining <= 0) {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        self.postMessage({ type: 'done' });
      }
    }, 1000);
  } else if (msg.type === 'stop') {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    self.postMessage({ type: 'stopped' });
  } else if (msg.type === 'add') {
    remaining = Math.max(0, remaining + msg.seconds);
  } else if (msg.type === 'pause') {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    self.postMessage({ type: 'paused', remaining });
  } else if (msg.type === 'resume') {
    if (remaining <= 0) return;
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      self.postMessage({ type: 'tick', remaining });
      if (remaining <= 0) {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        self.postMessage({ type: 'done' });
      }
    }, 1000);
  }
};
