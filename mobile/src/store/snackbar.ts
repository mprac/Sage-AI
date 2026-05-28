/**
 * Global undo snackbar (Zustand). Powers "delete with Undo": the row is removed from the UI
 * immediately and the *real* delete is deferred — it only commits via `onExpire` when the snackbar
 * times out. Tapping Undo runs `onAction` (restore) instead, so the delete never fires.
 *
 * Showing a new snackbar while one is pending FLUSHES the previous (runs its `onExpire`) so a
 * queued delete is never silently dropped.
 */
import { create } from 'zustand';

export interface SnackItem {
  id: number;
  message: string;
  actionLabel?: string;
  /** Runs when the user taps the action (e.g. Undo → restore the row). */
  onAction?: () => void;
  /** Runs when the snackbar times out or is flushed (e.g. actually delete on the server). */
  onExpire?: () => void;
  /** Milliseconds before auto-commit. */
  duration?: number;
}

interface SnackState {
  current: SnackItem | null;
  show: (item: Omit<SnackItem, 'id'>) => void;
  /** commit=true → run onExpire (timeout); commit=false → run onAction (undo tapped). */
  dismiss: (commit: boolean) => void;
}

let seq = 0;

export const useSnackbar = create<SnackState>((set, get) => ({
  current: null,
  show: (item) => {
    const prev = get().current;
    prev?.onExpire?.(); // flush the pending action of whatever we're replacing
    set({ current: { duration: 4200, ...item, id: ++seq } });
  },
  dismiss: (commit) => {
    const cur = get().current;
    if (!cur) return;
    if (commit) cur.onExpire?.();
    else cur.onAction?.();
    set({ current: null });
  },
}));

/** Imperative helper for use outside React components. */
export const showSnackbar = (item: Omit<SnackItem, 'id'>) => useSnackbar.getState().show(item);
