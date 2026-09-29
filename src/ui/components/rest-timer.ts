import { restTimerService } from '../../services/timer.service';
import { formatClock } from '../../utils/format';
import { el } from '../../utils/dom';

export function mountRestTimer(host: HTMLElement): () => void {
  const bar = el('div', { className: 'rest-bar hidden', role: 'timer', 'aria-live': 'polite' });
  const time = el('div', { className: 'time', textContent: '0:00' });
  const track = el('div', { className: 'track' });
  const fill = el('div', { className: 'fill' });
  track.appendChild(fill);
  const skip = el('button', { type: 'button', className: 'btn btn-sm btn-ghost', textContent: 'Skip' });
  const add = el('button', { type: 'button', className: 'btn btn-sm btn-accent', textContent: '+30' });
  skip.addEventListener('click', () => restTimerService.stop());
  add.addEventListener('click', () => restTimerService.add(30));
  bar.append(time, track, add, skip);
  host.prepend(bar);

  return restTimerService.subscribe((s) => {
    if (!s.active && !s.finished && s.remainingSec <= 0) {
      bar.classList.add('hidden');
      return;
    }
    if (s.finished) {
      bar.classList.remove('hidden');
      time.textContent = 'Done';
      fill.style.width = '100%';
      window.setTimeout(() => restTimerService.stop(), 1200);
      return;
    }
    bar.classList.toggle('hidden', !s.active && s.remainingSec <= 0);
    if (s.active || s.remainingSec > 0) {
      bar.classList.remove('hidden');
      time.textContent = formatClock(s.remainingSec);
      const pct = s.totalSec > 0 ? ((s.totalSec - s.remainingSec) / s.totalSec) * 100 : 0;
      fill.style.width = `${pct}%`;
    }
  });
}
