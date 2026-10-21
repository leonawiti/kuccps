import { describe, expect, it } from 'vitest';
import { collegeWarningText, formatMargin, formatPercent, formatPoints, ruleText, slotText, trendOf, unmetText, warningText } from './format';

const NAMES = { BIO: 'Biology', CHE: 'Chemistry', 'MAT A': 'Mathematics A', PHY: 'Physics' };

describe('formatMargin', () => {
  it('always shows a sign, to two places', () => {
    expect(formatMargin(1.5)).toBe('+1.50');
    expect(formatMargin(-0.455)).toBe('-0.46');
    expect(formatMargin(0)).toBe('0.00');
  });
  it('shows a dash when there is no margin', () => {
    expect(formatMargin(null)).toBe('-');
  });
});

describe('formatPoints', () => {
  it('shows three decimals, as the KUCCPS cluster points are quoted', () => {
    expect(formatPoints(38.545)).toBe('38.545');
    expect(formatPoints(48)).toBe('48.000');
    expect(formatPoints(null)).toBe('-');
  });
});

describe('formatPercent', () => {
  it('rounds a share to a whole percentage', () => {
    expect(formatPercent(0.667)).toBe('67%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1)).toBe('100%');
  });
});

describe('slotText', () => {
  it('names one subject and its minimum grade', () => {
    expect(slotText({ alternatives: ['BIO'], min_grade: 'C+' }, NAMES)).toBe('Biology, at least C+');
  });
  it('joins alternatives with "or"', () => {
    expect(slotText({ alternatives: ['MAT A', 'PHY'], min_grade: 'C' }, NAMES)).toBe('Mathematics A or Physics, at least C');
  });
  it('falls back to the key for a subject it does not know', () => {
    expect(slotText({ alternatives: ['XYZ'], min_grade: 'D' }, NAMES)).toBe('XYZ, at least D');
  });
});

describe('warningText', () => {
  it('explains each warning the engine can raise', () => {
    expect(warningText('subject_requirements_unknown')).toMatch(/no subject requirements/i);
    expect(warningText('subject_requirements_defective')).toMatch(/could not be read/i);
    expect(warningText('cluster_subjects_filled')).toMatch(/best remaining subjects/i);
  });
});

describe('trendOf', () => {
  it('compares the latest cut-off with the one before it', () => {
    expect(trendOf({ '2022': 30, '2023': 31, '2024': 33 })).toEqual({ direction: 'up', change: 2 });
    expect(trendOf({ '2023': 33, '2024': 31.5 })).toEqual({ direction: 'down', change: -1.5 });
    expect(trendOf({ '2023': 30, '2024': 30 })).toEqual({ direction: 'flat', change: 0 });
  });
  it('is null with fewer than two years of data', () => {
    expect(trendOf({ '2024': 30 })).toBeNull();
    expect(trendOf({})).toBeNull();
  });
});

describe('ruleText', () => {
  const names = { BIO: 'Biology', BSC: 'Biological Sciences', PHY: 'Physics', CHE: 'Chemistry', 'MAT A': 'Mathematics A' };
  it('names one subject, or lists alternatives with "or"', () => {
    expect(ruleText({ subjects: ['BIO'], grade: 'C', count: 1 }, names)).toBe('Biology, at least C');
    expect(ruleText({ subjects: ['BIO', 'BSC'], grade: 'C', count: 1 }, names)).toBe('Biology or Biological Sciences, at least C');
    expect(ruleText({ subjects: ['PHY', 'CHE', 'MAT A'], grade: 'C-', count: 1 }, names)).toBe('Physics, Chemistry or Mathematics A, at least C-');
  });
  it('says "any two of" when more than one different subject is needed', () => {
    expect(ruleText({ subjects: ['PHY', 'CHE', 'MAT A'], grade: 'C-', count: 2 }, names)).toBe('Any 2 of Physics, Chemistry or Mathematics A, at least C-');
  });
  it('reads "any subject" for the wildcard', () => {
    expect(ruleText({ subjects: ['*'], grade: 'C+', count: 2 }, names)).toBe('Any 2 subjects, at least C+');
    expect(ruleText({ subjects: ['*'], grade: 'C+', count: 1 }, names)).toBe('Any subject, at least C+');
  });
  it('falls back to the key for an unknown subject', () => {
    expect(ruleText({ subjects: ['XYZ'], grade: 'D', count: 1 }, names)).toBe('XYZ, at least D');
  });
});

describe('unmetText', () => {
  const names = { CHE: 'Chemistry' };
  it('says how the mean grade falls short', () => {
    expect(unmetText({ kind: 'mean', need: 'C', have: 'D+' }, names)).toBe('Needs a mean grade of C; yours is D+.');
  });
  it('says which subject requirement is not met', () => {
    expect(unmetText({ kind: 'subject', alternatives: ['CHE'], min_grade: 'B', count: 1 }, names)).toBe('Needs Chemistry, at least B.');
  });
  it('explains that one subject cannot count twice', () => {
    expect(unmetText({ kind: 'overlap' }, names)).toMatch(/same subject cannot count/);
  });
});

describe('collegeWarningText', () => {
  it('explains each flag a college entry can carry', () => {
    expect(collegeWarningText('mean_grade_not_stated')).toMatch(/no mean grade/i);
    expect(collegeWarningText('incomplete_source')).toMatch(/cut off/i);
    expect(collegeWarningText('no_subject_rules_listed')).toMatch(/no subject requirements/i);
  });
  it('shows an unknown flag as it is rather than hiding it', () => {
    expect(collegeWarningText('something_new')).toBe('something_new');
  });
});
