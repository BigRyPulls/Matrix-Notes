type UndoFn = () => Promise<void> | void;

interface UndoEntry {
  id: string;
  label: string;
  run: UndoFn;
  createdAt: number;
}

const MAX = 20;
const stack: UndoEntry[] = [];
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

export const undoService = {
  push(label: string, run: UndoFn): void {
    stack.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label,
      run,
      createdAt: Date.now(),
    });
    if (stack.length > MAX) stack.shift();
    notify();
  },

  canUndo(): boolean {
    return stack.length > 0;
  },

  peek(): string | null {
    return stack[stack.length - 1]?.label ?? null;
  },

  async undo(): Promise<string | null> {
    const entry = stack.pop();
    if (!entry) return null;
    await entry.run();
    notify();
    return entry.label;
  },

  clear(): void {
    stack.length = 0;
    notify();
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
