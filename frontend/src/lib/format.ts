import type { Slot, Warning } from './types';

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
