import { describe, expect, it } from 'vitest';
import { formatMargin, formatPercent, formatPoints, slotText, trendOf, warningText } from './format';

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
