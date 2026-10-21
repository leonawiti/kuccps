import type { Meta } from './types';

/** One line of the grade form: a subject key (or '' when not chosen yet) and a grade (or ''). */
export interface Row {
  subject: string;
  grade: string;
}

export const MIN_SUBJECTS = 7;

export const DEFAULT_ROWS: Row[] = [
  { subject: 'ENG', grade: '' },
  { subject: 'KIS', grade: '' },
  { subject: 'MAT A', grade: '' },
  ...Array.from({ length: 5 }, () => ({ subject: '', grade: '' })),
];

export function gradesFromRows(rows: Row[]): Record<string, string> {
  const grades: Record<string, string> = {};
  for (const row of rows) {
    if (row.subject && row.grade) grades[row.subject] = row.grade;
  }
  return grades;
}

/** What is wrong with the form, in words a learner can act on. Empty when it is ready to send. */
export function validateRows(rows: Row[], minSubjects = MIN_SUBJECTS, names: Record<string, string> = {}): string[] {
  const problems: string[] = [];
  const label = (key: string) => names[key] ?? key;
  const seen = new Set<string>();
  const repeated = new Set<string>();
  let complete = 0;

  for (const row of rows) {
    if (row.subject && row.grade) {
      complete += 1;
      if (seen.has(row.subject)) repeated.add(row.subject);
      seen.add(row.subject);
    } else if (row.subject && !row.grade) {
      problems.push(`Choose a grade for ${label(row.subject)}.`);
    } else if (!row.subject && row.grade) {
      if (!problems.includes('A grade is entered with no subject.')) problems.push('A grade is entered with no subject.');
    }
  }
  for (const key of repeated) problems.push(`${label(key)} is listed more than once.`);
  if (seen.has('MAT A') && seen.has('MAT B')) problems.push('Choose either Mathematics Alternative A or B, not both.');
  if (complete < minSubjects) problems.unshift(`Enter at least ${minSubjects} subjects with grades (${complete} so far).`);
  return problems;
}

/**
 * A live preview of the total and mean grade while the learner types. The server's figures are the ones that
 * count; this uses the same tables the server sends in /api/meta/ so the two cannot drift apart.
 */
export function previewTotal(
  grades: Record<string, string>,
  meta: Pick<Meta, 'grades' | 'mean_grade_bands'>,
): { total: number; meanGrade: string; subjects: number } | null {
  const points = Object.values(grades)
    .map((g) => meta.grades.find((x) => x.grade === g)?.points)
    .filter((p): p is number => p !== undefined)
    .sort((a, b) => b - a);
  if (points.length < MIN_SUBJECTS) return null;
  const total = points.slice(0, MIN_SUBJECTS).reduce((sum, p) => sum + p, 0);
  const band = meta.mean_grade_bands.find((b) => total >= b.min && total <= b.max);
  return { total, meanGrade: band ? band.grade : '', subjects: points.length };
}

/** Rows from an earlier visit, cleaned of any subject or grade the server does not know any more. */
export function sanitizeRows(rows: Row[], meta: Pick<Meta, 'subjects' | 'grades'>): Row[] {
  if (rows.length === 0) return DEFAULT_ROWS;
  const subjects = new Set(meta.subjects.map((s) => s.key));
  const grades = new Set(meta.grades.map((g) => g.grade));
  return rows.map((r) => ({ subject: subjects.has(r.subject) ? r.subject : '', grade: grades.has(r.grade) ? r.grade : '' }));
}
