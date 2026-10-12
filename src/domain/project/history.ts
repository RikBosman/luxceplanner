/**
 * Ongedaan maken / opnieuw uitvoeren op basis van onveranderlijke snapshots.
 * Elke bewerking levert een nieuw document op; de geschiedenis bewaart eerdere versies (begrensd).
 */
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export const MAX_HISTORY = 100;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

export function commit<T>(h: History<T>, next: T): History<T> {
  if (Object.is(next, h.present)) return h;
  const past = [...h.past, h.present];
  if (past.length > MAX_HISTORY) past.splice(0, past.length - MAX_HISTORY);
  return { past, present: next, future: [] };
}

export function undo<T>(h: History<T>): History<T> {
  const previous = h.past.at(-1);
  if (previous === undefined) return h;
  return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] };
}

export function redo<T>(h: History<T>): History<T> {
  const [next, ...rest] = h.future;
  if (next === undefined) return h;
  return { past: [...h.past, h.present], present: next, future: rest };
}

export const canUndo = <T,>(h: History<T>) => h.past.length > 0;
export const canRedo = <T,>(h: History<T>) => h.future.length > 0;
