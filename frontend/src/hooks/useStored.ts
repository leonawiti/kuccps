import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * State kept in this browser's localStorage so a learner's grades and choices survive a refresh. It never
 * leaves the browser. Every read and write is guarded: private windows and blocked storage must not break the app.
 */
export function useStored<T>(key: string, initial: T, isValid: (value: unknown) => value is T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (isValid(parsed)) return parsed;
      }
    } catch {
      /* unreadable or blocked: start fresh */
    }
    return initial;
  });

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: the app still works, it just will not remember */
    }
  }, [key, value]);

  const set = useCallback((next: T | ((prev: T) => T)) => setValue(next), []);
  return [value, set];
}
