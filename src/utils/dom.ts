/** Tiny DOM helpers — no framework. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | null | undefined> = {},
  children: Array<Node | string | null | undefined> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'className') {
      node.className = String(v);
      continue;
    }
    if (k === 'textContent') {
      node.textContent = String(v);
      continue;
    }
    if (k.startsWith('on') && typeof v === 'string') {
      // ignore raw handlers in attrs
      continue;
    }
    if (v === true) {
      node.setAttribute(k, '');
      continue;
    }
    node.setAttribute(k, String(v));
  }
  for (const child of children) {
    if (child == null) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function haptics(enabled: boolean, style: 'light' | 'medium' | 'success' = 'light'): void {
  if (!enabled || typeof navigator === 'undefined') return;
  try {
    // Best-effort; not all browsers support Vibration API
    if ('vibrate' in navigator) {
      const ms = style === 'medium' ? 18 : style === 'success' ? 12 : 8;
      navigator.vibrate(ms);
    }
  } catch {
    /* ignore */
  }
}

export function trapFocus(container: HTMLElement): () => void {
  const focusable = () =>
    Array.from(
      container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((n) => !n.hasAttribute('disabled') && n.tabIndex !== -1);

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const list = focusable();
    if (list.length === 0) return;
    const first = list[0]!;
    const last = list[list.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}
