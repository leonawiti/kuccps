import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { ApiError, analyseClass } from '../lib/api';
import { learnersToCsv, sortLearners } from '../lib/classTable';
import type { SortKey } from '../lib/classTable';
import { classCsvTemplate, parseClassCsv } from '../lib/csv';
import { downloadText } from '../lib/download';
import { formatPercent } from '../lib/format';
import type { ClassResponse, Mode } from '../lib/types';
import { useApp } from '../state/app-context';
import { BarList } from './charts';
import { Notice, PageTitle, Stat } from './ui';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Learner' },
  { key: 'total', label: 'Total (of 84)' },
  { key: 'best_cluster', label: 'Best cluster' },
  { key: 'best_fit', label: 'Best fit' },
  { key: 'safe', label: 'Safe' },
  { key: 'stretch', label: 'Stretch' },
];

export function ClassView() {
  const { meta } = useApp();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('flexible');
  const [title, setTitle] = useState('');
  const [result, setResult] = useState<ClassResponse | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'total', direction: 'desc' });

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  }

  async function analyse() {
    setError(null);
    setResult(null);
    let parsed;
    try {
      parsed = parseClassCsv(text, meta.subjects);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The marks could not be read.');
      return;
    }
    setWarnings(parsed.warnings);
    setLoading(true);
    try {
      setResult(await analyseClass({ learners: parsed.learners, mode }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const cohort = result?.cohort;
  const gradeItems = cohort
    ? meta.grades.filter((g) => cohort.mean_grades[g.grade]).map((g) => ({
        label: g.grade, value: cohort.mean_grades[g.grade], display: String(cohort.mean_grades[g.grade]),
      }))
    : [];
  const maxGrade = Math.max(1, ...gradeItems.map((i) => i.value));

  return (
    <div className="space-y-4">
      <PageTitle sub="Paste or upload a class mark sheet to see how a whole class or school looks against the courses: grade spread, subject strength, which career families are within reach, and who needs support.">
        Class and school analysis
      </PageTitle>

      <section aria-labelledby="class-input" className="card space-y-3 no-print">
        <h2 id="class-input" className="font-display text-lg font-semibold">Mark sheet</h2>
        <p className="text-sm text-muted">
          One row per learner. The first row names the columns: a Name column, then one column per subject (for example ENG, KIS, MAT A, BIO).
          Leave a grade blank if the subject was not taken. Nothing is stored: the marks are analysed and then forgotten.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn" onClick={() => downloadText('kuccps-class-template.csv', classCsvTemplate(meta.subjects))}>
            Download a template
          </button>
          <label className="btn cursor-pointer">
            Upload a CSV file
            <input type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" onChange={onFile} aria-label="Upload a CSV file" />
          </label>
        </div>
        <div>
          <label className="label" htmlFor="class-text">Or paste the marks here</label>
          <textarea id="class-text" className="input min-h-[10rem] font-mono" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'Name,ENG,KIS,MAT A,BIO,CHE,PHY,GEO\nAmina,B,B+,A-,B,B+,B,C+'} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="class-title">Class or school name (for the printout)</label>
            <input id="class-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="class-mode">Band width</label>
            <select id="class-mode" className="input" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="flexible">Flexible</option>
              <option value="classic">Classic (2 points)</option>
            </select>
          </div>
        </div>
        <button type="button" className="btn-primary" disabled={loading || text.trim() === ''} onClick={analyse}>
          {loading ? 'Analysing...' : 'Analyse the class'}
        </button>
        {error ? <Notice kind="error">{error}</Notice> : null}
        {warnings.map((w) => (
          <Notice key={w} kind="warn">{w}</Notice>
        ))}
      </section>

      {result && cohort ? (
        <div className="space-y-4" aria-live="polite">
          <h2 className="font-display text-xl font-semibold">{title ? `${title}: ` : ''}Class results</h2>

          {result.rejected.length > 0 ? (
            <Notice kind="warn">
              {result.rejected.length} learner{result.rejected.length > 1 ? 's' : ''} could not be analysed:{' '}
              {result.rejected.map((r) => `${r.name} (${r.error})`).join('; ')}
            </Notice>
          ) : null}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Learners analysed" value={cohort.learners} />
            <Stat label="Mean total" value={cohort.mean_total === null ? '-' : cohort.mean_total.toFixed(1)} hint="best seven subjects, of 84" />
            <Stat label="With a safe course" value={formatPercent(cohort.safe_reach)} hint="at least one safe programme" />
            <Stat label="Need support" value={cohort.at_risk.length} hint="no safe or best-fit course" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title="Mean grade (number of learners)" items={gradeItems} max={maxGrade} />
            <BarList title="Learners with a reachable course, by career family" max={1} colorClass="bg-safe"
              items={meta.pathways.map((p) => ({ label: p.label, value: cohort.pathway_reach[p.key], display: formatPercent(cohort.pathway_reach[p.key]) }))} />
            <BarList title="Average points by subject (out of 12)" max={12} colorClass="bg-best"
              items={cohort.subjects.map((s) => ({ label: s.name, value: s.mean_points, display: s.mean_points.toFixed(1) }))} />
            {cohort.at_risk.length > 0 ? (
              <section className="card" aria-label="Learners who need support">
                <h3 className="mb-2 text-sm font-semibold">Learners who need support</h3>
                <p className="mb-2 text-sm text-muted">No safe or best-fit degree programme on current results. Consider TVET and KMTC pathways and subject-improvement plans.</p>
                <ul className="list-disc pl-5 text-sm">
                  {cohort.at_risk.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            ) : (
              <Notice>Every learner has at least one safe or best-fit degree programme.</Notice>
            )}
          </div>

          <section className="card overflow-x-auto" aria-label="Learners">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Learners</h3>
              <span className="no-print flex gap-2">
                <button type="button" className="btn" onClick={() => downloadText('kuccps-class-results.csv', learnersToCsv(result.learners))}>Download as CSV</button>
                <button type="button" className="btn" onClick={() => window.print()}>Print</button>
              </span>
            </div>
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  {COLUMNS.map((c) => (
                    <th key={c.key} scope="col" className="py-1 pr-3" aria-sort={sort.key === c.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" className="font-semibold" onClick={() => setSort((s) => ({ key: c.key, direction: s.key === c.key && s.direction === 'desc' ? 'asc' : 'desc' }))}>
                        {c.label}{sort.key === c.key ? (sort.direction === 'asc' ? ' (up)' : ' (down)') : ''}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="py-1">Support</th>
                </tr>
              </thead>
              <tbody>
                {sortLearners(result.learners, sort.key, sort.direction).map((l) => (
                  <tr key={l.name} className="border-b border-line last:border-0">
                    <th scope="row" className="py-1 pr-3 font-medium">{l.name}</th>
                    <td className="pr-3 tabular-nums">{l.total} <span className="text-muted">({l.mean_grade})</span></td>
                    <td className="pr-3 tabular-nums">{l.best_cluster === null ? '-' : l.best_cluster.toFixed(3)}</td>
                    <td className="pr-3 tabular-nums">{l.bands.best_fit}</td>
                    <td className="pr-3 tabular-nums">{l.bands.safe}</td>
                    <td className="pr-3 tabular-nums">{l.bands.stretch}</td>
                    <td>{l.at_risk ? <span className="chip border-danger text-danger">Needs support</span> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}
    </div>
  );
}
