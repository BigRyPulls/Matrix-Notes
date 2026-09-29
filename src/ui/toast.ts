import { el } from '../utils/dom';

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

let host: HTMLElement | null = null;

function ensureHost(): HTMLElement {
  if (host && document.body.contains(host)) return host;
  host = el('div', { className: 'toast-host', role: 'status', 'aria-live': 'polite' });
  document.body.appendChild(host);
  return host;
}

export function toast(opts: ToastOptions | string): void {
  const options: ToastOptions = typeof opts === 'string' ? { message: opts } : opts;
  const root = ensureHost();
  const node = el('div', { className: 'toast' }, [options.message]);
  if (options.actionLabel && options.onAction) {
    const btn = el('button', { type: 'button', textContent: options.actionLabel });
    btn.addEventListener('click', () => {
      options.onAction?.();
      node.remove();
    });
    node.appendChild(btn);
  }
  root.appendChild(node);
  const ms = options.durationMs ?? 2800;
  window.setTimeout(() => {
    node.remove();
  }, ms);
}
