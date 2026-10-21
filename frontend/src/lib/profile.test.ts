import { describe, expect, it } from 'vitest';
import { DEFAULT_ROWS, gradesFromRows, previewTotal, sanitizeRows, validateRows } from './profile';
import type { Meta } from './types';

const META = {
  grades: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'].map((grade, i) => ({ grade, points: 12 - i })),
  mean_grade_bands: [
    { grade: 'A', min: 81, max: 84 }, { grade: 'A-', min: 74, max: 80 }, { grade: 'B+', min: 67, max: 73 },
    { grade: 'B', min: 60, max: 66 }, { grade: 'B-', min: 53, max: 59 }, { grade: 'C+', min: 46, max: 52 },
    { grade: 'C', min: 39, max: 45 }, { grade: 'C-', min: 32, max: 38 }, { grade: 'D+', min: 25, max: 31 },
    { grade: 'D', min: 18, max: 24 }, { grade: 'D-', min: 11, max: 17 }, { grade: 'E', min: 7, max: 10 },
  ],
} as Meta;

const seven = [
  { subject: 'ENG', grade: 'B' }, { subject: 'KIS', grade: 'B+' }, { subject: 'MAT A', grade: 'A-' },
  { subject: 'BIO', grade: 'B' }, { subject: 'CHE', grade: 'B+' }, { subject: 'PHY', grade: 'B' }, { subject: 'GEO', grade: 'C+' },
];

describe('gradesFromRows', () => {
  it('keeps only rows with both a subject and a grade', () => {
    expect(gradesFromRows([{ subject: 'ENG', grade: 'B' }, { subject: '', grade: 'A' }, { subject: 'KIS', grade: '' }])).toEqual({ ENG: 'B' });
  });
});

describe('validateRows', () => {
  it('accepts seven complete, different subjects', () => {
    expect(validateRows(seven)).toEqual([]);
  });

  it('asks for seven subjects and says how many there are', () => {
    expect(validateRows(seven.slice(0, 4))).toEqual(['Enter at least 7 subjects with grades (4 so far).']);
  });

  it('counts exactly six subjects as not enough', () => {
    expect(validateRows(seven.slice(0, 6))).toEqual(['Enter at least 7 subjects with grades (6 so far).']);
  });

  it('puts the shortfall first when there are other problems too', () => {
    const problems = validateRows([...seven.slice(0, 4), { subject: 'AGR', grade: '' }], 7, { AGR: 'Agriculture' });
    expect(problems[0]).toBe('Enter at least 7 subjects with grades (4 so far).');
    expect(problems).toContain('Choose a grade for Agriculture.');
  });

  it('names a subject that is listed twice', () => {
    const rows = [...seven, { subject: 'CHE', grade: 'A' }];
    expect(validateRows(rows, 7, { CHE: 'Chemistry' })).toContain('Chemistry is listed more than once.');
  });

  it('points out a subject without a grade, and a grade without a subject', () => {
    const rows = [...seven, { subject: 'AGR', grade: '' }, { subject: '', grade: 'C' }];
    const problems = validateRows(rows, 7, { AGR: 'Agriculture' });
    expect(problems).toContain('Choose a grade for Agriculture.');
    expect(problems).toContain('A grade is entered with no subject.');
  });

  it('does not allow both mathematics papers', () => {
    const rows = [...seven, { subject: 'MAT B', grade: 'C' }];
    expect(validateRows(rows)).toContain('Choose either Mathematics Alternative A or B, not both.');
  });
});

describe('previewTotal', () => {
  it('totals the best seven subjects and gives the mean grade', () => {
    const grades = { ...gradesFromRows(seven), AGR: 'D' }; // the eighth, lowest, is dropped
    expect(previewTotal(grades, META)).toEqual({ total: 65, meanGrade: 'B', subjects: 8 });
  });

  it('uses the highest seven when there are more', () => {
    const grades = { ...gradesFromRows(seven), AGR: 'A' };
    expect(previewTotal(grades, META)?.total).toBe(70); // 12 + 11 + 10 + 10 + 9 + 9 + 9
  });

  it('is null until there are seven subjects', () => {
    expect(previewTotal({ ENG: 'A' }, META)).toBeNull();
  });
});

describe('DEFAULT_ROWS', () => {
  it('starts with the three compulsory subjects and has room for the rest', () => {
    expect(DEFAULT_ROWS.slice(0, 3).map((r) => r.subject)).toEqual(['ENG', 'KIS', 'MAT A']);
    expect(DEFAULT_ROWS.length).toBeGreaterThanOrEqual(8);
  });
});

describe('sanitizeRows', () => {
  const known = { subjects: [{ key: 'ENG' }, { key: 'BIO' }], grades: [{ grade: 'A' }, { grade: 'B' }] } as unknown as Meta;

  it('keeps rows that match what the server knows', () => {
    expect(sanitizeRows([{ subject: 'ENG', grade: 'A' }], known)).toEqual([{ subject: 'ENG', grade: 'A' }]);
  });
  it('blanks a subject or grade the server no longer knows, keeping the other half', () => {
    expect(sanitizeRows([{ subject: 'OLD', grade: 'A' }, { subject: 'BIO', grade: 'Z' }], known)).toEqual([
      { subject: '', grade: 'A' }, { subject: 'BIO', grade: '' },
    ]);
  });
  it('starts afresh when there are no rows', () => {
    expect(sanitizeRows([], known)).toEqual(DEFAULT_ROWS);
  });
});
