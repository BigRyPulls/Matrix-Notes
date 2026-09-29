export interface VirtualListOptions<T> {
  container: HTMLElement;
  items: T[];
  rowHeight: number;
  overscan?: number;
  renderRow: (item: T, index: number) => HTMLElement;
}

/**
 * Lightweight fixed-height virtual scroller.
 * Re-renders only visible window on scroll.
 */
export function createVirtualList<T>(opts: VirtualListOptions<T>): {
  refresh: (items?: T[]) => void;
  destroy: () => void;
} {
  const overscan = opts.overscan ?? 6;
  let items = opts.items;
  const spacer = document.createElement('div');
  spacer.className = 'vlist-spacer';
  const windowEl = document.createElement('div');
  windowEl.className = 'vlist-window';
  opts.container.classList.add('vlist');
  opts.container.replaceChildren(spacer, windowEl);

  let raf = 0;

  const paint = () => {
    const h = opts.rowHeight;
    const total = items.length * h;
    spacer.style.height = `${total}px`;
    const scrollTop = opts.container.scrollTop;
    const viewH = opts.container.clientHeight || 1;
    let start = Math.floor(scrollTop / h) - overscan;
    let end = Math.ceil((scrollTop + viewH) / h) + overscan;
    start = Math.max(0, start);
    end = Math.min(items.length, end);
    windowEl.style.transform = `translateY(${start * h}px)`;
    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const item = items[i];
      if (item === undefined) continue;
      const row = opts.renderRow(item, i);
      row.style.height = `${h}px`;
      frag.appendChild(row);
    }
    windowEl.replaceChildren(frag);
  };

  const onScroll = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(paint);
  };

  opts.container.addEventListener('scroll', onScroll, { passive: true });
  paint();

  return {
    refresh(next) {
      if (next) items = next;
      paint();
    },
    destroy() {
      opts.container.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      opts.container.replaceChildren();
      opts.container.classList.remove('vlist');
    },
  };
}
