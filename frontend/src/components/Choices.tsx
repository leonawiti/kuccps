import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, analyseChoices, searchProgrammes } from '../lib/api';
import type { ChoicesResponse, Mode, Programme } from '../lib/types';
import { MAX_CHOICES, useApp } from '../state/app-context';
import { ProgrammeCard } from './ProgrammeCard';
import { Notice, PageTitle, Spinner } from './ui';

export function Choices() {
  const { grades, ready, profile, choices, addChoice, moveChoice, clearChoices, go } = useApp();
  const [data, setData] = useState<ChoicesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Programme[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const ticket = useRef(0);

  const key = JSON.stringify({ grades, mode: profile.mode, codes: choices.map((c) => c.code) });

  useEffect(() => {
    const { grades: g, mode, codes } = JSON.parse(key) as { grades: Record<string, string>; mode: Mode; codes: string[] };
    if (!ready || codes.length === 0) {
      setData(null);
      setError(null);
      return;
    }
    const mine = ++ticket.current;
    setLoading(true);
    analyseChoices({ grades: g, mode, choices: codes })
      .then((d) => {
        if (mine !== ticket.current) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (mine !== ticket.current) return;
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      })
      .finally(() => {
        if (mine === ticket.current) setLoading(false);
      });
  }, [key, ready]);

  async function search(e: FormEvent) {
    e.preventDefault();
    setSearchError(null);
    try {
      const r = await searchProgrammes({ q: q.trim(), limit: 8 });
      setFound(r.results);
    } catch (err) {
      setSearchError(err instanceof ApiError ? err.message : 'The search failed. Please try again.');
    }
  }

  const full = choices.length >= MAX_CHOICES;

  return (
    <div className="space-y-4">
      <PageTitle sub={`Apply for up to ${MAX_CHOICES} programmes. Each is placed in a band for your results, and the mix is checked so you do not end up with only long shots.`}>
        My four choices
      </PageTitle>

      {!ready ? (
        <Notice kind="warn">
          Your grades are not complete yet. <button type="button" className="underline" onClick={() => go('check')}>Enter them first</button> to see where each choice falls.
        </Notice>
      ) : null}

      <section aria-labelledby="add-heading" className="card space-y-3 no-print">
        <h2 id="add-heading" className="font-display text-lg font-semibold">Add a programme</h2>
        <form onSubmit={search} className="flex flex-wrap gap-2">
          <div className="min-w-[14rem] flex-1">
            <label className="sr-only" htmlFor="choice-search">Search programmes</label>
            <input id="choice-search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Programme, university or code" />
          </div>
          <button type="submit" className="btn">Search</button>
        </form>
        {searchError ? <Notice kind="error">{searchError}</Notice> : null}
        {found ? (
          found.length === 0 ? (
            <Notice>No programmes match this search.</Notice>
          ) : (
            <ul className="divide-y divide-line">
              {found.map((p) => {
                const on = choices.some((c) => c.code === p.code);
                return (
                  <li key={p.code} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      <span className="font-semibold">{p.name}</span>
                      <span className="block text-muted">{p.institution} &middot; code {p.code}</span>
                    </span>
                    <button type="button" className="btn" disabled={on || full} aria-label={`${on ? 'Added' : 'Add'} ${p.name}, ${p.institution}`}
                      onClick={() => addChoice({ code: p.code, name: p.name, institution: p.institution })}>
                      {on ? 'Added' : 'Add'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
        {full ? <p className="text-sm text-muted">You have {MAX_CHOICES} choices. Remove one to add another.</p> : null}
      </section>

      {choices.length === 0 ? (
        <Notice>No choices yet. Search above, or add programmes from the results on the <button type="button" className="underline" onClick={() => go('check')}>Check my courses</button> page.</Notice>
      ) : (
        <section aria-labelledby="list-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="list-heading" className="font-display text-lg font-semibold">Your list ({choices.length} of {MAX_CHOICES})</h2>
            <div className="no-print flex gap-2">
              <button type="button" className="btn" onClick={clearChoices}>Clear list</button>
              <button type="button" className="btn-primary" disabled={!ready} onClick={() => go('report')}>Make my report</button>
            </div>
          </div>

          {error ? <Notice kind="error">{error}</Notice> : null}
          {loading && !data ? <Spinner label="Checking your choices" /> : null}

          {data && data.advice.length > 0 ? (
            <div className="space-y-2" aria-label="Advice">
              {data.advice.map((a) => (
                <Notice key={a.code} kind="warn">{a.message}</Notice>
              ))}
            </div>
          ) : null}
          {data && data.advice.length === 0 ? <Notice>This is a balanced list: it has at least one safe choice and every choice is within reach.</Notice> : null}

          <ol className="space-y-3">
            {choices.map((c, i) => {
              const result = data?.choices.find((r) => r.code === c.code);
              return (
                <li key={c.code} className="space-y-2">
                  <div className="no-print flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Choice {i + 1}</h3>
                    <span className="flex gap-1">
                      <button type="button" className="btn" disabled={i === 0} aria-label={`Move ${c.name} up`} onClick={() => moveChoice(c.code, -1)}>Up</button>
                      <button type="button" className="btn" disabled={i === choices.length - 1} aria-label={`Move ${c.name} down`} onClick={() => moveChoice(c.code, 1)}>Down</button>
                    </span>
                  </div>
                  {result ? (
                    <ProgrammeCard result={result} />
                  ) : (
                    <div className="card text-sm">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-muted">{c.institution} &middot; code {c.code}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
