import { useCallback, useEffect, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';

const KEY = 'kuccps.theme';

function read(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* blocked storage */
  }
  return 'system';
}

/** Light, dark, or follow the device. The choice is remembered in this browser only. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      if (theme === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, theme);
    } catch {
      /* blocked storage */
    }
  }, [theme]);

  const cycle = useCallback(() => setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system')), []);
  return [theme, cycle];
}
