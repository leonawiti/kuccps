import type { ClassLearnerResult } from './types';

export type SortKey = 'name' | 'total' | 'best_cluster' | 'best_fit' | 'safe' | 'stretch';

function valueOf(learner: ClassLearnerResult, key: SortKey): string | number | null {
  switch (key) {
    case 'name': return learner.name.toLowerCase();
    case 'total': return learner.total;
    case 'best_cluster': return learner.best_cluster;
    default: return learner.bands[key];
  }
}

/** A sorted copy. Learners with no value (no cluster points) always go last, in either direction. */
export function sortLearners(list: ClassLearnerResult[], key: SortKey, direction: 'asc' | 'desc'): ClassLearnerResult[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const x = valueOf(a, key);
    const y = valueOf(b, key);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x < y ? -sign : x > y ? sign : 0;
  });
}

/** One cell, quoted when needed, and defused if a spreadsheet would treat it as a formula. */
function cell(value: string | number | null): string {
  let text = value === null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text))) text = `'${text}`;
  return /[",\n\r]/.test(text) || text.startsWith("'") ? `"${text.replace(/"/g, '""')}"` : text;
}

export function learnersToCsv(list: ClassLearnerResult[]): string {
  const header = [
    'Name', 'Total (best 7)', 'Mean grade', 'Best cluster points', 'Best fit', 'Safe', 'Stretch', 'Excluded',
    'STEM reachable', 'Social Sciences reachable', 'Arts and Sports reachable', 'KMTC and TVET eligible', 'At risk',
  ];
  const rows = list.map((l) => [
    l.name, l.total, l.mean_grade, l.best_cluster, l.bands.best_fit, l.bands.safe, l.bands.stretch, l.bands.excluded,
    l.pathways.stem, l.pathways.social, l.pathways.arts_sports, l.colleges_eligible, l.at_risk ? 'Yes' : 'No',
  ].map(cell).join(','));
  return [header.join(','), ...rows].join('\n');
}
