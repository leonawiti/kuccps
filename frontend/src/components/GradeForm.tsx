import { useMemo } from 'react';
import { previewTotal } from '../lib/profile';
import type { Row } from '../lib/profile';
import { useApp } from '../state/app-context';

const GROUP_LABELS: Record<number, string> = {
  1: 'Compulsory',
  2: 'Sciences',
  3: 'Humanities',
  4: 'Applied and technical',
  5: 'Languages, music and business',
};

const MAX_ROWS = 12;

export function GradeForm() {
  const { meta, profile, setProfile, grades, problems } = useApp();
  const { rows } = profile;

  const preview = useMemo(() => previewTotal(grades, meta), [grades, meta]);
  const groups = useMemo(() => {
    const byGroup = new Map<number, typeof meta.subjects>();
    for (const s of meta.subjects) byGroup.set(s.group, [...(byGroup.get(s.group) ?? []), s]);
    return [...byGroup.entries()].sort((a, b) => a[0] - b[0]);
  }, [meta]);

  const setRows = (next: Row[]) => setProfile((p) => ({ ...p, rows: next }));
  const update = (index: number, change: Partial<Row>) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...change } : r)));
  const chosen = new Set(rows.map((r) => r.subject).filter(Boolean));

  return (
    <section aria-labelledby="grades-heading" className="card space-y-4">
      <h2 id="grades-heading" className="font-display text-xl font-semibold">Your KCSE results</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="learner-name">Name (optional)</label>
          <input id="learner-name" className="input" value={profile.name} autoComplete="off"
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="learner-school">School (optional)</label>
          <input id="learner-school" className="input" value={profile.school} autoComplete="off"
            onChange={(e) => setProfile((p) => ({ ...p, school: e.target.value }))} />
        </div>
      </div>

      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="grid grid-cols-[1fr_6rem_2.5rem] items-end gap-2">
            <div>
              <label className="sr-only" htmlFor={`subject-${i}`}>Subject {i + 1}</label>
              <select id={`subject-${i}`} className="input" value={row.subject}
                onChange={(e) => update(i, { subject: e.target.value })}>
                <option value="">Choose a subject</option>
                {groups.map(([group, subjects]) => (
                  <optgroup key={group} label={GROUP_LABELS[group] ?? `Group ${group}`}>
                    {subjects.map((s) => (
                      <option key={s.key} value={s.key} disabled={chosen.has(s.key) && row.subject !== s.key}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="sr-only" htmlFor={`grade-${i}`}>Grade for subject {i + 1}</label>
              <select id={`grade-${i}`} className="input" value={row.grade} onChange={(e) => update(i, { grade: e.target.value })}>
                <option value="">Grade</option>
                {meta.grades.map((g) => (
                  <option key={g.grade} value={g.grade}>{g.grade}</option>
                ))}
              </select>
            </div>
            <button type="button" className="btn px-0" aria-label={`Remove subject ${i + 1}`}
              onClick={() => setRows(rows.filter((_, j) => j !== i))}>
              <span aria-hidden="true">&times;</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={rows.length >= MAX_ROWS}
          onClick={() => setRows([...rows, { subject: '', grade: '' }])}>
          Add a subject
        </button>
        <button type="button" className="btn" onClick={() => setRows(rows.map((r) => ({ ...r, grade: '' })))}>
          Clear grades
        </button>
      </div>

      <div aria-live="polite" className="rounded-md border border-line bg-bg p-3 text-sm">
        {preview ? (
          <p>
            <strong>Total of best seven subjects:</strong> {preview.total} of 84. <strong>Mean grade:</strong> {preview.meanGrade}.
            {preview.subjects > 7 ? ` Your lowest ${preview.subjects - 7} subject${preview.subjects - 7 > 1 ? 's are' : ' is'} not counted.` : ''}
          </p>
        ) : null}
        {problems.length > 0 ? (
          <ul className="list-disc pl-5 text-muted">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
