// Fixtures and a pretend server for component tests. Not part of the app bundle.
import { vi } from 'vitest';
import type {
  ChoicesResponse, ClassResponse, EligibilityResponse, Evaluation, ListedBand, Meta, Programme,
} from './lib/types';

const GRADE_LIST = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'];

export const META: Meta = {
  subjects: [
    { key: 'ENG', number: '101', name: 'English', group: 1 },
    { key: 'KIS', number: '102', name: 'Kiswahili', group: 1 },
    { key: 'MAT A', number: '121', name: 'Mathematics (Alternative A)', group: 1 },
    { key: 'MAT B', number: '122', name: 'Mathematics (Alternative B)', group: 1 },
    { key: 'BIO', number: '231', name: 'Biology', group: 2 },
    { key: 'CHE', number: '233', name: 'Chemistry', group: 2 },
    { key: 'PHY', number: '232', name: 'Physics', group: 2 },
    { key: 'GEO', number: '312', name: 'Geography', group: 3 },
    { key: 'CRE', number: '313', name: 'Christian Religious Education', group: 3 },
    { key: 'AGR', number: '443', name: 'Agriculture', group: 4 },
  ],
  grades: GRADE_LIST.map((grade, i) => ({ grade, points: 12 - i })),
  mean_grade_bands: [
    { grade: 'A', min: 81, max: 84 }, { grade: 'A-', min: 74, max: 80 }, { grade: 'B+', min: 67, max: 73 },
    { grade: 'B', min: 60, max: 66 }, { grade: 'B-', min: 53, max: 59 }, { grade: 'C+', min: 46, max: 52 },
    { grade: 'C', min: 39, max: 45 }, { grade: 'C-', min: 32, max: 38 }, { grade: 'D+', min: 25, max: 31 },
    { grade: 'D', min: 18, max: 24 }, { grade: 'D-', min: 11, max: 17 }, { grade: 'E', min: 7, max: 10 },
  ],
  pathways: [
    { key: 'stem', label: 'STEM' }, { key: 'social', label: 'Social Sciences and Humanities' },
    { key: 'arts_sports', label: 'Arts and Sports Science' },
  ],
  bands: [
    { key: 'best_fit', label: 'Best fit', description: 'Within reach and close to the cut-off.' },
    { key: 'safe', label: 'Safe', description: 'Comfortably above the cut-off.' },
    { key: 'stretch', label: 'Stretch', description: 'Just below the cut-off.' },
    { key: 'excluded', label: 'Excluded', description: 'Out of reach.' },
  ],
  catalogue: { programmes: 5, institutions: ['Alpha University', 'Beta University'], source: 'test.xlsx', report: null },
};

/** ENG B, KIS B+, MAT A A-, BIO B, CHE B+, PHY B, GEO C+: total 65, mean grade B. */
export const MID_GRADES: Record<string, string> = {
  ENG: 'B', KIS: 'B+', 'MAT A': 'A-', BIO: 'B', CHE: 'B+', PHY: 'B', GEO: 'C+',
};

export function evaluation(over: Partial<Evaluation> = {}): Evaluation {
  return {
    code: '101', institution: 'Alpha University', name: 'BACHELOR OF SCIENCE (NURSING)', family: 'Sciences',
    pathway: 'stem', preference: 0, mode: 'flexible', band: 'safe', state: 'assessed', cluster: 38.545, margin: 8.545,
    cutoff: 30, cutoff_year: '2024', width: 2, r: 40, t: 65, picks: [['BIO', 9], ['CHE', 10], ['MAT A', 11], ['KIS', 10]],
    failed_slots: [], warnings: [], cutoffs: { '2023': 29, '2024': 30 },
    slots: [{ alternatives: ['BIO'], min_grade: 'C+' }], slots_status: 'ok', ...over,
  };
}

export function eligibility(bands: Partial<Record<ListedBand, Evaluation[]>> = {}, over: Partial<EligibilityResponse> = {}): EligibilityResponse {
  const full: Record<ListedBand, Evaluation[]> = {
    best_fit: [], safe: [], stretch: [], excluded: [], no_data: [], ...bands,
  };
  const keys = Object.keys(full) as ListedBand[];
  return {
    learner: { total: 65, mean_grade: 'B', points: {}, subjects: 7 }, mode: 'flexible', fill: true,
    counts: Object.fromEntries(keys.map((k) => [k, full[k].length])) as Record<ListedBand, number>,
    truncated: Object.fromEntries(keys.map((k) => [k, false])) as Record<ListedBand, boolean>,
    bands: full, ...over,
  };
}

export function programme(over: Partial<Programme> = {}): Programme {
  return {
    code: '101', institution: 'Alpha University', name: 'BACHELOR OF SCIENCE (NURSING)', family: 'Sciences', pathway: 'stem',
    cutoffs: { '2023': 29, '2024': 30 }, slots: [{ alternatives: ['BIO'], min_grade: 'C+' }], slots_status: 'ok', ...over,
  };
}

export function choicesResponse(choices: Evaluation[], advice: { code: string; message: string }[] = []): ChoicesResponse {
  return { learner: { total: 65, mean_grade: 'B', points: {}, subjects: 7 }, mode: 'flexible', choices, advice };
}

export function classResponse(over: Partial<ClassResponse> = {}): ClassResponse {
  return {
    learners: [
      { name: 'Amina', total: 70, mean_grade: 'B+', best_cluster: 41.2, bands: { best_fit: 3, safe: 90, stretch: 4, excluded: 20, no_data: 1 },
        pathways: { stem: 50, social: 40, arts_sports: 3 }, at_risk: false },
      { name: 'Otieno', total: 30, mean_grade: 'D+', best_cluster: 20.1, bands: { best_fit: 0, safe: 0, stretch: 0, excluded: 118, no_data: 0 },
        pathways: { stem: 0, social: 0, arts_sports: 0 }, at_risk: true },
    ],
    cohort: {
      learners: 2, mean_total: 50, mean_grades: { 'B+': 1, 'D+': 1 }, safe_reach: 0.5,
      pathway_reach: { stem: 0.5, social: 0.5, arts_sports: 0.5 }, at_risk: ['Otieno'],
      subjects: [{ key: 'ENG', name: 'English', learners: 2, mean_points: 7.5 }],
    },
    rejected: [], ...over,
  };
}

type Handler = (body: unknown, url: URL) => unknown | { status: number; body: unknown };

/** A pretend server: maps "METHOD /path/" to a handler. Anything not listed answers 404. Returns the call log. */
export function fakeServer(handlers: Record<string, Handler>) {
  const calls: { key: string; body: unknown }[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const key = `${method} ${url.pathname}`;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ key, body });
    const handler = handlers[key];
    if (!handler) return new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 });
    const out = handler(body, url);
    if (out && typeof out === 'object' && 'status' in out && 'body' in out) {
      const r = out as { status: number; body: unknown };
      return new Response(JSON.stringify(r.body), { status: r.status });
    }
    return new Response(JSON.stringify(out), { status: 200 });
  });
  vi.stubGlobal('fetch', fn);
  return { calls, fn, callsTo: (key: string) => calls.filter((c) => c.key === key) };
}

/** Put a complete learner in this browser's storage, as if they had filled the form on an earlier visit. */
export function seedProfile(grades: Record<string, string> = MID_GRADES, extra: Record<string, unknown> = {}) {
  const rows = Object.entries(grades).map(([subject, grade]) => ({ subject, grade }));
  localStorage.setItem('kuccps.profile.v1', JSON.stringify({ name: '', school: '', rows, mode: 'flexible', ...extra }));
}

export function seedChoices(list: { code: string; name: string; institution: string }[]) {
  localStorage.setItem('kuccps.choices.v1', JSON.stringify(list));
}

/** The one endpoint every screen needs. */
export const metaHandler = { 'GET /api/meta/': () => META };
