import type { CollegeRule, Slot, Unmet, Warning } from './types';

export function formatMargin(margin: number | null): string {
  if (margin === null) return '-';
  const text = Math.abs(margin).toFixed(2);
  if (Number(text) === 0) return '0.00';
  return `${margin > 0 ? '+' : '-'}${text}`;
}

export const formatPoints = (value: number | null): string => (value === null ? '-' : value.toFixed(3));

export const formatPercent = (share: number): string => `${Math.round(share * 100)}%`;

/** "Mathematics A or Physics, at least C": one requirement slot in words. */
export function slotText(slot: Slot, names: Record<string, string>): string {
  const subjects = slot.alternatives.map((key) => names[key] ?? key).join(' or ');
  return `${subjects}, at least ${slot.min_grade}`;
}

const WARNINGS: Record<Warning, string> = {
  subject_requirements_unknown:
    'This programme has no subject requirements in our data, so its subject rules could not be checked. Confirm them with KUCCPS.',
  subject_requirements_defective:
    'The subject requirements for this programme could not be read from our data. Confirm them with KUCCPS.',
  cluster_subjects_filled:
    'The programme lists fewer than four cluster subjects, so your best remaining subjects were used for the rest.',
};

export const warningText = (warning: Warning): string => WARNINGS[warning] ?? warning;

/** Whether the latest cut-off rose or fell compared with the year before it. */
export function trendOf(cutoffs: Record<string, number>): { direction: 'up' | 'down' | 'flat'; change: number } | null {
  const years = Object.keys(cutoffs).sort();
  if (years.length < 2) return null;
  const change = Math.round((cutoffs[years[years.length - 1]] - cutoffs[years[years.length - 2]]) * 1000) / 1000;
  return { direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat', change };
}

const joinOr = (items: string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;

/** One KMTC/TVET requirement in words: "Any 2 of Physics, Chemistry or Mathematics A, at least C-". */
export function ruleText(rule: CollegeRule, names: Record<string, string>): string {
  const any = rule.subjects.length === 1 && rule.subjects[0] === '*';
  if (any) return `${rule.count > 1 ? `Any ${rule.count} subjects` : 'Any subject'}, at least ${rule.grade}`;
  const list = joinOr(rule.subjects.map((k) => names[k] ?? k));
  return `${rule.count > 1 ? `Any ${rule.count} of ` : ''}${list}, at least ${rule.grade}`;
}

export function unmetText(unmet: Unmet, names: Record<string, string>): string {
  if (unmet.kind === 'mean') return `Needs a mean grade of ${unmet.need}; yours is ${unmet.have}.`;
  if (unmet.kind === 'subject') {
    return `Needs ${ruleText({ subjects: unmet.alternatives, grade: unmet.min_grade, count: unmet.count }, names)}.`;
  }
  return 'The same subject cannot count for two requirements, and your subjects cannot cover them all together.';
}

const COLLEGE_WARNINGS: Record<string, string> = {
  mean_grade_not_stated: 'The source prints no mean grade for this course, so only the subject grades were checked.',
  incomplete_source: 'The printed requirements for this course look cut off in the source document. Confirm them with KUCCPS.',
  no_subject_rules_listed: 'The source lists no subject requirements for this course, only the mean grade.',
};

export const collegeWarningText = (flag: string): string => COLLEGE_WARNINGS[flag] ?? flag;
