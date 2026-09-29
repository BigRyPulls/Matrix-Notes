export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: (ev: PointerEvent) => void;
  threshold?: number;
  longPressMs?: number;
}

/** Attach swipe + long-press listeners; returns cleanup. */
export function attachGestures(el: HTMLElement, handlers: SwipeHandlers): () => void {
  const threshold = handlers.threshold ?? 48;
  const longPressMs = handlers.longPressMs ?? 480;
  let startX = 0;
  let startY = 0;
  let startT = 0;
  let longTimer: ReturnType<typeof setTimeout> | undefined;
  let tracking = false;
  let longFired = false;

  const clearLong = () => {
    if (longTimer) {
      clearTimeout(longTimer);
      longTimer = undefined;
    }
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    tracking = true;
    longFired = false;
    startX = e.clientX;
    startY = e.clientY;
    startT = Date.now();
    el.setPointerCapture?.(e.pointerId);
    clearLong();
    if (handlers.onLongPress) {
      longTimer = setTimeout(() => {
        longFired = true;
        handlers.onLongPress?.(e);
      }, longPressMs);
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!tracking) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) clearLong();
  };

  const onUp = (e: PointerEvent) => {
    if (!tracking) return;
    tracking = false;
    clearLong();
    if (longFired) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dt = Date.now() - startT;
    if (dt > 600) return;
    if (Math.abs(dx) < threshold || Math.abs(dy) > Math.abs(dx) * 0.75) return;
    if (dx < 0) handlers.onSwipeLeft?.();
    else handlers.onSwipeRight?.();
  };

  const onCancel = () => {
    tracking = false;
    clearLong();
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onCancel);

  return () => {
    clearLong();
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onCancel);
  };
}
