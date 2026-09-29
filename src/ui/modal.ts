import { el, trapFocus } from '../utils/dom';

export interface ModalOptions {
  title?: string;
  content: HTMLElement | string;
  actions?: Array<{
    label: string;
    variant?: 'primary' | 'ghost' | 'danger' | 'accent';
    onClick?: () => void | Promise<void>;
    closeOnClick?: boolean;
  }>;
  center?: boolean;
  onClose?: () => void;
}

let openCount = 0;

export function openModal(opts: ModalOptions): { close: () => void } {
  openCount += 1;
  const prevFocus = document.activeElement as HTMLElement | null;
  const root = el('div', {
    className: `modal-root${opts.center ? ' center' : ''}`,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': opts.title ?? 'Dialog',
  });

  const sheet = el('div', { className: 'modal-sheet' });
  if (!opts.center) sheet.appendChild(el('div', { className: 'modal-handle' }));
  if (opts.title) sheet.appendChild(el('h2', { className: 'modal-title', textContent: opts.title }));

  if (typeof opts.content === 'string') {
    sheet.appendChild(el('p', { textContent: opts.content }));
  } else {
    sheet.appendChild(opts.content);
  }

  const close = () => {
    release();
    root.remove();
    openCount = Math.max(0, openCount - 1);
    opts.onClose?.();
    prevFocus?.focus();
  };

  if (opts.actions?.length) {
    const actions = el('div', { className: 'modal-actions' });
    for (const a of opts.actions) {
      const variant = a.variant ?? 'ghost';
      const btn = el('button', {
        type: 'button',
        className: `btn btn-${variant}`,
        textContent: a.label,
      });
      btn.addEventListener('click', async () => {
        try {
          await a.onClick?.();
          if (a.closeOnClick !== false) close();
        } catch (e) {
          console.error('Modal action error:', e);
        }
      });
      actions.appendChild(btn);
    }
    sheet.appendChild(actions);
  }

  root.appendChild(sheet);
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  const releaseFocus = trapFocus(sheet);

  const release = () => {
    document.removeEventListener('keydown', onKey);
    releaseFocus();
  };

  document.body.appendChild(root);
  const firstBtn = sheet.querySelector<HTMLElement>('button, input, textarea, select');
  firstBtn?.focus();

  return { close };
}

export function confirmDialog(opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    openModal({
      title: opts.title,
      content: opts.message,
      center: true,
      actions: [
        {
          label: 'Cancel',
          variant: 'ghost',
          onClick: () => resolve(false),
        },
        {
          label: opts.confirmLabel ?? 'Confirm',
          variant: opts.danger ? 'danger' : 'primary',
          onClick: () => resolve(true),
        },
      ],
      onClose: () => resolve(false),
    });
  });
}

export function isModalOpen(): boolean {
  return openCount > 0;
}
