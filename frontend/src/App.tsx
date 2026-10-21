import { useCallback, useEffect, useMemo, useState } from 'react';
import { About } from './components/About';
import { Check } from './components/Check';
import { Choices } from './components/Choices';
import { ClassView } from './components/ClassView';
import { Colleges } from './components/Colleges';
import { Report } from './components/Report';
import { Shell, TABS } from './components/Shell';
import { Notice, Spinner } from './components/ui';
import { useStored } from './hooks/useStored';
import { useTheme } from './hooks/useTheme';
import { ApiError, getMeta } from './lib/api';
import { addChoice, moveChoice, removeChoice } from './lib/choices';
import { DEFAULT_ROWS, gradesFromRows, sanitizeRows, validateRows } from './lib/profile';
import type { Meta } from './lib/types';
import { AppContext } from './state/app-context';
import type { AppState, Choice, LearnerProfile, Tab } from './state/app-context';

const DEFAULT_PROFILE: LearnerProfile = { name: '', school: '', rows: DEFAULT_ROWS, mode: 'flexible' };

const isProfile = (v: unknown): v is LearnerProfile => {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.name === 'string' && typeof p.school === 'string' && (p.mode === 'flexible' || p.mode === 'classic') &&
    Array.isArray(p.rows) && p.rows.every((r) => r && typeof r.subject === 'string' && typeof r.grade === 'string')
  );
};

const isChoices = (v: unknown): v is Choice[] =>
  Array.isArray(v) && v.every((c) => c && typeof c.code === 'string' && typeof c.name === 'string' && typeof c.institution === 'string');

function tabFromHash(): Tab {
  const name = window.location.hash.replace(/^#\/?/, '');
  return TABS.some((t) => t.key === name) ? (name as Tab) : 'check';
}

function useTab(): [Tab, (t: Tab) => void] {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = useCallback((t: Tab) => {
    window.location.hash = `/${t}`;
    setTab(t);
    window.scrollTo?.(0, 0);
  }, []);
  return [tab, go];
}

function Loaded({ meta }: { meta: Meta }) {
  const [stored, setProfile] = useStored<LearnerProfile>('kuccps.profile.v1', DEFAULT_PROFILE, isProfile);
  const [choices, setChoices] = useStored<Choice[]>('kuccps.choices.v1', [], isChoices);
  const [tab, go] = useTab();
  const [theme, cycleTheme] = useTheme();

  const profile = useMemo(() => ({ ...stored, rows: sanitizeRows(stored.rows, meta) }), [stored, meta]);
  const subjectNames = useMemo(() => Object.fromEntries(meta.subjects.map((s) => [s.key, s.name])), [meta]);
  const grades = useMemo(() => gradesFromRows(profile.rows), [profile.rows]);
  const problems = useMemo(() => validateRows(profile.rows, 7, subjectNames), [profile.rows, subjectNames]);

  const value: AppState = {
    meta, profile, setProfile, grades, problems, ready: problems.length === 0, subjectNames, choices, go,
    addChoice: (c) => setChoices((list) => addChoice(list, c)),
    removeChoice: (code) => setChoices((list) => removeChoice(list, code)),
    moveChoice: (code, direction) => setChoices((list) => moveChoice(list, code, direction)),
    clearChoices: () => setChoices([]),
  };

  return (
    <AppContext.Provider value={value}>
      <Shell tab={tab} onTab={go} theme={theme} onTheme={cycleTheme} choiceCount={choices.length}>
        {tab === 'check' ? <Check /> : null}
        {tab === 'choices' ? <Choices /> : null}
        {tab === 'colleges' ? <Colleges /> : null}
        {tab === 'class' ? <ClassView /> : null}
        {tab === 'report' ? <Report /> : null}
        {tab === 'about' ? <About /> : null}
      </Shell>
    </AppContext.Provider>
  );
}

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    getMeta()
      .then((m) => alive && setMeta(m))
      .catch((e: unknown) => alive && setError(e instanceof ApiError ? e.message : 'The advisor could not start.'));
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (meta) return <Loaded meta={meta} />;
  return (
    <main className="mx-auto max-w-xl space-y-3 px-4 py-16">
      <h1 className="font-display text-2xl font-semibold">KUCCPS Course Advisor</h1>
      {error ? (
        <>
          <Notice kind="error">{error}</Notice>
          <button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </>
      ) : (
        <Spinner label="Starting" />
      )}
    </main>
  );
}
