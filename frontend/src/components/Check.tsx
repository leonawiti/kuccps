import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, checkEligibility } from '../lib/api';
import type { EligibilityRequest, EligibilityResponse, ListedBand, PathwayKey } from '../lib/types';
import { useApp } from '../state/app-context';
import { GradeForm } from './GradeForm';
import { ProgrammeCard } from './ProgrammeCard';
import { BandBadge, Notice, PageTitle, Spinner, bandLabel } from './ui';

const PAGE = 25;
const BANDS: ListedBand[] = ['best_fit', 'safe', 'stretch', 'excluded', 'no_data'];

export function Check() {
  const { meta, profile, setProfile, grades, ready } = useApp();
  const [q, setQ] = useState('');
  const [institution, setInstitution] = useState('');
  const [pathways, setPathways] = useState<PathwayKey[]>([]);
  const [likedInstitutions, setLikedInstitutions] = useState<Record<string, number>>({});
  const [likedPathways, setLikedPathways] = useState<Record<string, number>>({});
  const [limit, setLimit] = useState(PAGE);
  const [band, setBand] = useState<ListedBand>('best_fit');
  const [data, setData] = useState<EligibilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const ticket = useRef(0);

  const request: EligibilityRequest = useMemo(() => {
    const body: EligibilityRequest = { grades, mode: profile.mode, limit };
    if (q.trim()) body.q = q.trim();
    if (institution) body.institutions = [institution];
    if (pathways.length) body.pathways = pathways;
    const prefs: NonNullable<EligibilityRequest['preferences']> = {};
    if (Object.keys(likedInstitutions).length) prefs.institutions = likedInstitutions;
    const pw = Object.fromEntries(Object.entries(likedPathways).filter(([, w]) => w > 0));
    if (Object.keys(pw).length) prefs.pathways = pw;
    if (prefs.institutions || prefs.pathways) body.preferences = prefs;
    return body;
  }, [grades, profile.mode, limit, q, institution, pathways, likedInstitutions, likedPathways]);

  const requestKey = JSON.stringify(request);

  // Run on demand; once a search has been made, re-run quietly whenever an input changes.
  useEffect(() => {
    if (!searched || !ready) return;
    const mine = ++ticket.current;
    setLoading(true);
    const timer = setTimeout(() => {
      checkEligibility(JSON.parse(requestKey) as EligibilityRequest)
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
    }, 250);
    return () => clearTimeout(timer);
  }, [requestKey, searched, ready]);

  const toggleBand = (b: ListedBand) => setBand(b);
  const shown = data?.bands[band] ?? [];

  return (
    <div className="space-y-4">
      <PageTitle sub="Enter your KCSE grades to see which degree programmes you qualify for, how close you are to each cut-off, and where to aim.">
        Check my courses
      </PageTitle>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="space-y-4">
          <GradeForm />

          <section aria-labelledby="options-heading" className="card space-y-3">
            <h2 id="options-heading" className="font-display text-lg font-semibold">How to sort the results</h2>
            <fieldset>
              <legend className="label">Band width</legend>
              <div className="space-y-1 text-sm">
                <label className="flex items-start gap-2">
                  <input type="radio" name="mode" checked={profile.mode === 'flexible'} onChange={() => setProfile((p) => ({ ...p, mode: 'flexible' }))} />
                  <span><strong>Flexible</strong>: each programme's band is as wide as its own cut-off usually moves from year to year.</span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="radio" name="mode" checked={profile.mode === 'classic'} onChange={() => setProfile((p) => ({ ...p, mode: 'classic' }))} />
                  <span><strong>Classic</strong>: every programme uses a fixed band of 2 points.</span>
                </label>
              </div>
            </fieldset>

            <div>
              <label className="label" htmlFor="q">Search by name, university or code</label>
              <input id="q" className="input" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="for example nursing" />
            </div>
            <div>
              <label className="label" htmlFor="institution">University</label>
              <select id="institution" className="input" value={institution} onChange={(e) => { setInstitution(e.target.value); setLimit(PAGE); }}>
                <option value="">All universities</option>
                {meta.catalogue.institutions.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className="label">Career family</legend>
              <div className="flex flex-wrap gap-2">
                {meta.pathways.map((p) => {
                  const on = pathways.includes(p.key);
                  return (
                    <button key={p.key} type="button" aria-pressed={on} className={`chip ${on ? 'border-accent bg-accent text-bg' : ''}`}
                      onClick={() => { setPathways(on ? pathways.filter((x) => x !== p.key) : [...pathways, p.key]); setLimit(PAGE); }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <details>
              <summary className="cursor-pointer text-sm font-semibold">Preferences (reorder within each band)</summary>
              <div className="mt-2 space-y-3 text-sm">
                <p className="text-muted">A preference only changes the order inside a band. It never moves a course into a better band.</p>
                <div>
                  <label className="label" htmlFor="pref-institution">Preferred university</label>
                  <select id="pref-institution" className="input" value="" onChange={(e) => {
                    if (e.target.value) setLikedInstitutions({ ...likedInstitutions, [e.target.value]: 2 });
                  }}>
                    <option value="">Add a university</option>
                    {meta.catalogue.institutions.filter((i) => !(i in likedInstitutions)).map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(likedInstitutions).map(([name, weight]) => (
                      <li key={name} className="flex items-center justify-between gap-2">
                        <span>{name}</span>
                        <span className="flex items-center gap-1">
                          <label className="sr-only" htmlFor={`w-${name}`}>Weight for {name}</label>
                          <select id={`w-${name}`} className="input w-auto" value={weight}
                            onChange={(e) => setLikedInstitutions({ ...likedInstitutions, [name]: Number(e.target.value) })}>
                            <option value={1}>Like</option>
                            <option value={2}>Prefer</option>
                            <option value={3}>Top choice</option>
                          </select>
                          <button type="button" className="btn" aria-label={`Remove ${name}`}
                            onClick={() => { const next = { ...likedInstitutions }; delete next[name]; setLikedInstitutions(next); }}>
                            &times;
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1">
                  <span className="label">Career family</span>
                  {meta.pathways.map((p) => (
                    <div key={p.key} className="flex items-center justify-between gap-2">
                      <label htmlFor={`pw-${p.key}`}>{p.label}</label>
                      <select id={`pw-${p.key}`} className="input w-auto" value={likedPathways[p.key] ?? 0}
                        onChange={(e) => setLikedPathways({ ...likedPathways, [p.key]: Number(e.target.value) })}>
                        <option value={0}>No preference</option>
                        <option value={1}>Like</option>
                        <option value={2}>Prefer</option>
                        <option value={3}>Top choice</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </section>

          <button type="button" className="btn-primary w-full" disabled={!ready || loading}
            onClick={() => { setSearched(true); setLimit(PAGE); setBand('best_fit'); if (searched) setLimit((l) => l); }}>
            {loading ? 'Finding courses...' : searched ? 'Refresh results' : 'Find my courses'}
          </button>
          {!ready ? <p className="text-sm text-muted">Complete the grade form to continue.</p> : null}
        </div>

        <section aria-labelledby="results-heading" className="space-y-3" aria-live="polite">
          <h2 id="results-heading" className="sr-only">Results</h2>
          {error ? <Notice kind="error">{error}</Notice> : null}
          {!searched && !error ? (
            <Notice>Your results will appear here. Fill in your grades and choose "Find my courses".</Notice>
          ) : null}
          {loading && !data ? <Spinner label="Finding your courses" /> : null}

          {data ? (
            <>
              <div className="card flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <span><strong>Total:</strong> {data.learner.total} of 84</span>
                <span><strong>Mean grade:</strong> {data.learner.mean_grade}</span>
                <span><strong>Band width:</strong> {data.mode === 'flexible' ? 'flexible' : 'classic (2 points)'}</span>
                {loading ? <span className="text-muted">Updating...</span> : null}
              </div>

              <div role="tablist" aria-label="Result bands" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {BANDS.map((b) => (
                  <button key={b} role="tab" type="button" aria-selected={band === b} onClick={() => toggleBand(b)}
                    className={`card text-left ${band === b ? 'border-accent ring-1 ring-accent' : ''}`}>
                    <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{bandLabel(b)}</span>
                    <span className="font-display text-2xl font-semibold tabular-nums">{data.counts[b]}</span>
                  </button>
                ))}
              </div>

              <div role="tabpanel" className="space-y-3">
                <p className="flex items-center gap-2 text-sm text-muted">
                  <BandBadge band={band} />
                  {band === 'no_data'
                    ? 'No cut-off has been published for these programmes.'
                    : meta.bands.find((x) => x.key === band)?.description}
                </p>
                {shown.length === 0 ? (
                  <Notice>No programmes in this band{q || institution || pathways.length ? ' for these filters' : ''}.</Notice>
                ) : (
                  shown.map((r) => <ProgrammeCard key={r.code} result={r} />)
                )}
                {data.truncated[band] ? (
                  <button type="button" className="btn" onClick={() => setLimit((l) => l + PAGE)}>
                    Showing {shown.length} of {data.counts[band]}. Show more
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
