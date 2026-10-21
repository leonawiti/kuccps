import { useEffect, useRef, useState } from 'react';
import { ApiError, analyseChoices, checkColleges, checkEligibility } from '../lib/api';
import { formatMargin, formatPoints } from '../lib/format';
import type { ChoicesResponse, CollegesResponse, EligibilityResponse, Evaluation, ListedBand, PathwayKey } from '../lib/types';
import { useApp } from '../state/app-context';
import { BandBadge, Notice, PageTitle, Spinner } from './ui';

interface ReportData {
  main: EligibilityResponse;
  byPathway: Record<PathwayKey, EligibilityResponse>;
  choices: ChoicesResponse | null;
  colleges: CollegesResponse;
  date: string;
}

const TOP = 6;
const PER_FAMILY = 3;
const COLLEGES_SHOWN = 8;

function CourseLine({ r }: { r: Evaluation }) {
  return (
    <li className="py-1 text-sm">
      <span className="font-semibold">{r.name}</span>, {r.institution}
      <span className="block text-muted">
        Your cluster {formatPoints(r.cluster)} &middot; cut-off {formatPoints(r.cutoff)} ({r.cutoff_year}) &middot; margin {formatMargin(r.margin)}
      </span>
    </li>
  );
}

export function Report() {
  const { meta, profile, grades, ready, choices, subjectNames, go } = useApp();
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ticket = useRef(0);

  const key = JSON.stringify({ grades, mode: profile.mode, codes: choices.map((c) => c.code) });

  useEffect(() => {
    const { grades: g, mode, codes } = JSON.parse(key) as { grades: Record<string, string>; mode: 'flexible' | 'classic'; codes: string[] };
    if (!ready) {
      setData(null);
      return;
    }
    const mine = ++ticket.current;
    setLoading(true);
    setError(null);
    const pathwayKeys = meta.pathways.map((p) => p.key);
    Promise.all([
      checkEligibility({ grades: g, mode, limit: TOP }),
      Promise.all(pathwayKeys.map((p) => checkEligibility({ grades: g, mode, pathways: [p], limit: PER_FAMILY }))),
      codes.length ? analyseChoices({ grades: g, mode, choices: codes }) : Promise.resolve(null),
      checkColleges({ grades: g, limit: COLLEGES_SHOWN }),
    ])
      .then(([main, per, ch, colleges]) => {
        if (mine !== ticket.current) return;
        const byPathway = Object.fromEntries(pathwayKeys.map((p, i) => [p, per[i]])) as Record<PathwayKey, EligibilityResponse>;
        setData({ main, byPathway, choices: ch, colleges, date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) });
      })
      .catch((e: unknown) => {
        if (mine !== ticket.current) return;
        setError(e instanceof ApiError ? e.message : 'The report could not be prepared. Please try again.');
      })
      .finally(() => {
        if (mine === ticket.current) setLoading(false);
      });
  }, [key, ready, meta.pathways]);

  if (!ready) {
    return (
      <div className="space-y-4">
        <PageTitle>Learner report</PageTitle>
        <Notice kind="warn">
          Your grades are not complete yet. <button type="button" className="underline" onClick={() => go('check')}>Enter them first</button> and the report will be prepared here.
        </Notice>
      </div>
    );
  }

  const points = (grade: string) => meta.grades.find((g) => g.grade === grade)?.points ?? 0;
  const subjectRows = Object.entries(grades)
    .map(([k, grade]) => ({ key: k, name: subjectNames[k] ?? k, grade, points: points(grade) }))
    .sort((a, b) => b.points - a.points);
  const sections: { band: ListedBand; title: string }[] = [
    { band: 'best_fit', title: 'Best fit courses' },
    { band: 'safe', title: 'Safe courses' },
    { band: 'stretch', title: 'Stretch courses' },
  ];

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <PageTitle sub="A printable summary for this learner. Choose Print, then Save as PDF in the print window.">Learner report</PageTitle>
        <button type="button" className="btn-primary" disabled={!data} onClick={() => window.print()}>Print or save as PDF</button>
      </div>

      {error ? <Notice kind="error">{error}</Notice> : null}
      {loading && !data ? <Spinner label="Preparing the report" /> : null}

      {data ? (
        <article className="space-y-4" aria-label="Learner report">
          <header className="report-section border-b border-line pb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">KUCCPS course advice report</p>
            <h2 className="font-display text-2xl font-semibold">{profile.name || 'Learner'}</h2>
            <p className="text-sm text-muted">
              {profile.school ? `${profile.school} · ` : ''}Prepared {data.date} &middot; {profile.mode === 'flexible' ? 'flexible' : 'classic (2 point)'} bands
            </p>
          </header>

          <section className="report-section card" aria-labelledby="r-results">
            <h3 id="r-results" className="mb-2 font-display text-lg font-semibold">KCSE results</h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line"><th scope="col" className="py-1">Subject</th><th scope="col">Grade</th><th scope="col">Points</th><th scope="col">Counted</th></tr>
              </thead>
              <tbody>
                {subjectRows.map((s, i) => (
                  <tr key={s.key} className="border-b border-line last:border-0">
                    <th scope="row" className="py-1 font-medium">{s.name}</th><td>{s.grade}</td><td>{s.points}</td><td>{i < 7 ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-sm">
              <strong>Total of best seven subjects:</strong> {data.main.learner.total} of 84. <strong>Mean grade:</strong> {data.main.learner.mean_grade}.
            </p>
          </section>

          {data.choices ? (
            <section className="report-section card" aria-labelledby="r-choices">
              <h3 id="r-choices" className="mb-2 font-display text-lg font-semibold">The four choices</h3>
              <ol className="space-y-2">
                {data.choices.choices.map((c, i) => (
                  <li key={c.code} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                    <span>
                      <span className="font-semibold">{i + 1}. {c.name}</span>, {c.institution}
                      <span className="block text-muted">
                        {c.state === 'no_cutoff'
                          ? 'No published cut-off'
                          : c.state === 'subjects_not_met'
                            ? 'A required subject grade is not met'
                            : `Your cluster ${formatPoints(c.cluster)} · cut-off ${formatPoints(c.cutoff)} (${c.cutoff_year}) · margin ${formatMargin(c.margin)}`}
                      </span>
                    </span>
                    <BandBadge band={c.band ?? 'no_data'} />
                  </li>
                ))}
              </ol>
              {data.choices.advice.length > 0 ? (
                <ul className="mt-3 list-disc pl-5 text-sm">
                  {data.choices.advice.map((a) => (
                    <li key={a.code}>{a.message}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm">This is a balanced list: it includes a safe choice and every choice is within reach.</p>
              )}
            </section>
          ) : (
            <Notice>No choices have been picked yet, so this report has no choices section. Add up to four on the My choices page.</Notice>
          )}

          {sections.map(({ band, title }) => (
            <section key={band} className="report-section card" aria-labelledby={`r-${band}`}>
              <h3 id={`r-${band}`} className="font-display text-lg font-semibold">
                {title} <span className="text-sm font-normal text-muted">({data.main.counts[band]} in all)</span>
              </h3>
              {data.main.bands[band].length === 0 ? (
                <p className="text-sm text-muted">None.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.main.bands[band].map((r) => (
                    <CourseLine key={r.code} r={r} />
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="report-section card" aria-labelledby="r-families">
            <h3 id="r-families" className="mb-2 font-display text-lg font-semibold">Career families</h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line"><th scope="col" className="py-1">Family</th><th scope="col">Best fit</th><th scope="col">Safe</th><th scope="col">Stretch</th></tr>
              </thead>
              <tbody>
                {meta.pathways.map((p) => {
                  const c = data.byPathway[p.key].counts;
                  return (
                    <tr key={p.key} className="border-b border-line last:border-0">
                      <th scope="row" className="py-1 font-medium">{p.label}</th><td>{c.best_fit}</td><td>{c.safe}</td><td>{c.stretch}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {meta.pathways.map((p) => {
              const b = data.byPathway[p.key].bands;
              const top = [...b.best_fit, ...b.safe].slice(0, PER_FAMILY);
              return top.length ? (
                <div key={p.key} className="mt-3">
                  <h4 className="text-sm font-semibold">{p.label}: top courses</h4>
                  <ul className="divide-y divide-line">
                    {top.map((r) => (
                      <CourseLine key={r.code} r={r} />
                    ))}
                  </ul>
                </div>
              ) : null;
            })}
          </section>

          <section className="report-section card" aria-labelledby="r-colleges">
            <h3 id="r-colleges" className="font-display text-lg font-semibold">KMTC and TVET options</h3>
            <p className="mb-2 text-sm text-muted">
              Eligible for {data.colleges.counts.eligible} of {data.colleges.counts.eligible + data.colleges.counts.near + data.colleges.counts.not_eligible} college
              programmes{data.colleges.counts.near > 0 ? `, with ${data.colleges.counts.near} more one grade short` : ''}. These have no cut-off points.
            </p>
            {data.colleges.results.eligible.length === 0 ? (
              <p className="text-sm text-muted">No college programme is met in full on these results.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.colleges.results.eligible.map((c) => (
                  <li key={c.id} className="py-1 text-sm">
                    <span className="font-semibold">{c.name}</span>
                    <span className="block text-muted">{c.provider === 'kmtc' ? 'KMTC' : 'TVET'} &middot; {c.level}{c.min_mean && c.min_mean !== 'E' ? ` · minimum mean grade ${c.min_mean}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="report-section card text-sm" aria-labelledby="r-notes">
            <h3 id="r-notes" className="mb-2 font-display text-lg font-semibold">How to read this report</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Cluster points</strong> combine your four best subjects for a course with your total across your best seven, out of 48.</li>
              <li><strong>Best fit</strong>: close to the cut-off and within reach. <strong>Safe</strong>: comfortably above it. <strong>Stretch</strong>: just below it. <strong>Excluded</strong>: too far below, or a required subject grade is not met.</li>
              <li>Cut-offs change every year, and the band shown allows for how much each course's cut-off has moved before. Some 2024 figures are averages of earlier years, not published cut-offs.</li>
              <li>Where a programme lists fewer than four cluster subjects, or none, the best remaining subjects were used and the course is marked on screen. Career families are grouped by programme name and are a guide only.</li>
              <li>This is a counselling aid, not an official placement. Confirm subject requirements and cut-offs with KUCCPS before applying.</li>
            </ul>
          </section>
        </article>
      ) : null}
    </div>
  );
}
