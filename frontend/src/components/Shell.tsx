import type { ReactNode } from 'react';
import type { Theme } from '../hooks/useTheme';
import type { Tab } from '../state/app-context';

export const TABS: { key: Tab; label: string }[] = [
  { key: 'check', label: 'Check my courses' },
  { key: 'choices', label: 'My four choices' },
  { key: 'class', label: 'Class analysis' },
  { key: 'report', label: 'Report' },
  { key: 'about', label: 'About' },
];

const THEME_LABEL: Record<Theme, string> = { system: 'Theme: device', light: 'Theme: light', dark: 'Theme: dark' };

export function Shell({
  tab, onTab, theme, onTheme, choiceCount, children,
}: { tab: Tab; onTab: (t: Tab) => void; theme: Theme; onTheme: () => void; choiceCount: number; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <a href="#main" className="no-print sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-panel focus:p-2">
        Skip to content
      </a>
      <header className="no-print border-b border-line bg-panel">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p className="font-display text-xl font-semibold">KUCCPS Course Advisor</p>
          <button type="button" className="btn" onClick={onTheme}>{THEME_LABEL[theme]}</button>
        </div>
        <nav aria-label="Main" className="mx-auto max-w-6xl overflow-x-auto px-4">
          <ul className="flex gap-1">
            {TABS.map((t) => (
              <li key={t.key}>
                <button type="button" aria-current={tab === t.key ? 'page' : undefined} onClick={() => onTab(t.key)}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${tab === t.key ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'}`}>
                  {t.label}
                  {t.key === 'choices' && choiceCount > 0 ? <span className="ml-1 rounded-full border border-line px-1.5 text-xs">{choiceCount}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="no-print mx-auto max-w-6xl px-4 pb-8 text-xs text-muted">
        A counselling aid built on a draft data set, not an official KUCCPS placement. Confirm requirements and cut-offs with KUCCPS before applying.
      </footer>
    </div>
  );
}
