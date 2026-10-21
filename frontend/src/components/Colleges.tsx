import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, checkColleges } from '../lib/api';
import { collegeWarningText, ruleText, unmetText } from '../lib/format';
import type { CollegeLevel, CollegeProvider, CollegeResult, CollegeStatus, CollegesRequest, CollegesResponse } from '../lib/types';
import { useApp } from '../state/app-context';
import { Notice, PageTitle, Spinner } from './ui';

const PAGE = 50;
const STATUSES: { key: CollegeStatus; label: string; hint: string }[] = [
  { key: 'eligible', label: 'Eligible', hint: 'Your mean grade and subject grades meet every requirement.' },
  { key: 'near', label: 'Near miss', hint: 'Every requirement would be met if each minimum were one grade lower. Worth asking about.' },
  { key: 'not_eligible', label: 'Not eligible', hint: 'One or more requirements are well short. The gaps are listed on each course.' },
];
const PROVIDERS: { key: CollegeProvider; label: string }[] = [
  { key: 'kmtc', label: 'KMTC' },
  { key: 'tvet', label: 'TVET' },
];
const LEVELS: { key: CollegeLevel; label: string }[] = [
  { key: 'diploma', label: 'Diploma' },
  { key: 'certificate', label: 'Certificate' },
  { key: 'artisan', label: 'Artisan' },
];
const STATUS_STYLE: Record<CollegeStatus, string> = {
  eligible: 'border-best text-best',
  near: 'border-stretch text-stretch',
  not_eligible: 'border-excluded text-excluded',
};

function CollegeCard({ result }: { result: CollegeResult }) {
  const { subjectNames } = useApp();
  const provider = result.provider === 'kmtc' ? 'KMTC' : 'TVET';
  const level = result.level.charAt(0).toUpperCase() + result.level.slice(1);
  const status = STATUSES.find((s) => s.key === result.status)!;

  return (
    <article className="card space-y-2" aria-label={`${result.name}, ${provider} ${result.level}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold leading-snug">{result.name}</h3>
          <p className="text-sm text-muted">
            {provider} &middot; {level}
            {result.category && result.category !== result.name ? ` · ${result.category}` : ''}
            {result.audience ? ' · for visually or hearing impaired applicants' : ''}
          </p>
        </div>
        <span className={`chip ${STATUS_STYLE[result.status]}`}>{status.label}</span>
      </div>

      <p className="text-sm">
        {result.min_mean ? (
          <>Minimum mean grade <strong>{result.min_mean}</strong>{result.min_mean === 'E' ? ' (no minimum)' : ''}. Yours is <strong>{result.mean_grade}</strong>.</>
        ) : (
          <>No minimum mean grade is printed. Yours is <strong>{result.mean_grade}</strong>.</>
        )}
      </p>

      {result.unmet.length > 0 ? (
        <ul className="list-disc pl-5 text-sm text-danger">
          {result.unmet.map((u, i) => (
            <li key={i}>{unmetText(u, subjectNames)}</li>
          ))}
        </ul>
      ) : null}
      {result.option && result.status !== 'not_eligible' ? <p className="text-sm text-muted">Met through {result.option}.</p> : null}

      {result.warnings.map((w) => (
        <p key={w} className="rounded border border-stretch px-2 py-1 text-xs">{collegeWarningText(w)}</p>
      ))}
      {result.notes ? <p className="text-xs text-muted">{result.notes}</p> : null}

      {result.options.some((o) => o.rules.length > 0) ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">What this course asks for</summary>
          <div className="mt-1 space-y-2">
            {result.options.map((o, i) => (
              <div key={i}>
                {o.label ? <p className="font-semibold">{o.label}</p> : null}
                <ul className="list-disc pl-5">
                  {o.rules.map((rule, j) => (
                    <li key={j}>{ruleText(rule, subjectNames)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {result.source ? (
        <p className="text-xs text-muted">
          From the {provider} document{result.page ? `, page ${result.page}` : ''}: &ldquo;{result.source}&rdquo;
        </p>
      ) : null}
      {result.provider === 'kmtc' ? <p className="text-xs text-muted">KMTC pre-service applications are made through the KUCCPS portal.</p> : null}
    </article>
  );
}

export function Colleges() {
  const { meta, grades, ready, go } = useApp();
  const [providers, setProviders] = useState<CollegeProvider[]>([]);
  const [levels, setLevels] = useState<CollegeLevel[]>([]);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [status, setStatus] = useState<CollegeStatus>('eligible');
  const [data, setData] = useState<CollegesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ticket = useRef(0);

  const request: CollegesRequest = useMemo(() => {
    const body: CollegesRequest = { grades, limit };
    if (providers.length) body.providers = providers;
    if (levels.length) body.levels = levels;
    if (q.trim()) body.q = q.trim();
    return body;
  }, [grades, limit, providers, levels, q]);
  const key = JSON.stringify(request);

  useEffect(() => {
    if (!ready) {
      setData(null);
      return;
    }
    const mine = ++ticket.current;
    setLoading(true);
    const timer = setTimeout(() => {
      checkColleges(JSON.parse(key) as CollegesRequest)
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
    }, 200);
    return () => clearTimeout(timer);
  }, [key, ready]);

  const toggle = <T extends string>(list: T[], value: T, set: (next: T[]) => void) => {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
    setLimit(PAGE);
  };
  const shown = data?.results[status] ?? [];

  return (
    <div className="space-y-4">
      <PageTitle sub={`Other routes after KCSE: ${meta.colleges.kmtc} KMTC courses and ${meta.colleges.tvet} TVET programmes (diploma, certificate and artisan). They have no cut-off points. You are eligible when your mean grade and subject grades meet the minimums.`}>
        Colleges and TVET
      </PageTitle>

      {!ready ? (
        <Notice kind="warn">
          Your grades are not complete yet. <button type="button" className="underline" onClick={() => go('check')}>Enter them first</button> to see which courses you are eligible for.
        </Notice>
      ) : null}

      <section aria-labelledby="college-filters" className="card space-y-3 no-print">
        <h2 id="college-filters" className="font-display text-lg font-semibold">Narrow the list</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <fieldset>
            <legend className="label">Provider</legend>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => {
                const on = providers.includes(p.key);
                return (
                  <button key={p.key} type="button" aria-pressed={on} className={`chip ${on ? 'border-accent bg-accent text-bg' : ''}`}
                    onClick={() => toggle(providers, p.key, setProviders)}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Level</legend>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => {
                const on = levels.includes(l.key);
                return (
                  <button key={l.key} type="button" aria-pressed={on} className={`chip ${on ? 'border-accent bg-accent text-bg' : ''}`}
                    onClick={() => toggle(levels, l.key, setLevels)}>
                    {l.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div>
            <label className="label" htmlFor="college-q">Search by course</label>
            <input id="college-q" className="input" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="for example nursing" />
          </div>
        </div>
      </section>

      <section aria-labelledby="college-results" className="space-y-3" aria-live="polite">
        <h2 id="college-results" className="sr-only">Results</h2>
        {error ? <Notice kind="error">{error}</Notice> : null}
        {loading && !data ? <Spinner label="Checking the courses" /> : null}

        {data ? (
          <>
            <div role="tablist" aria-label="Eligibility" className="grid grid-cols-3 gap-2">
              {STATUSES.map((s) => (
                <button key={s.key} role="tab" type="button" aria-selected={status === s.key} onClick={() => setStatus(s.key)}
                  className={`card text-left ${status === s.key ? 'border-accent ring-1 ring-accent' : ''}`}>
                  <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</span>
                  <span className="font-display text-2xl font-semibold tabular-nums">{data.counts[s.key]}</span>
                </button>
              ))}
            </div>
            <div role="tabpanel" className="space-y-3">
              <p className="text-sm text-muted">{STATUSES.find((s) => s.key === status)!.hint}</p>
              {shown.length === 0 ? <Notice>No courses in this group{q || providers.length || levels.length ? ' for these filters' : ''}.</Notice> : shown.map((r) => <CollegeCard key={r.id} result={r} />)}
              {data.truncated[status] ? (
                <button type="button" className="btn" onClick={() => setLimit((l) => Math.min(200, l + PAGE))}>
                  Showing {shown.length} of {data.counts[status]}. Show more
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
