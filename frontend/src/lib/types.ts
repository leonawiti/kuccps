// The shapes the API returns (see ../backend/advisor/views.py).

export type BandKey = 'best_fit' | 'safe' | 'stretch' | 'excluded';
export type ListedBand = BandKey | 'no_data';
export type Mode = 'flexible' | 'classic';
export type PathwayKey = 'stem' | 'social' | 'arts_sports';

export interface Subject {
  key: string;
  number: string;
  name: string;
  group: number;
}

export interface GradeInfo {
  grade: string;
  points: number;
}

export interface MeanGradeBand {
  grade: string;
  min: number;
  max: number;
}

export interface BandInfo {
  key: BandKey;
  label: string;
  description: string;
}

export interface Meta {
  subjects: Subject[];
  grades: GradeInfo[];
  mean_grade_bands: MeanGradeBand[];
  pathways: { key: PathwayKey; label: string }[];
  bands: BandInfo[];
  catalogue: {
    programmes: number;
    institutions: string[];
    source: string | null;
    report: Record<string, number> | null;
  };
}

export interface Slot {
  alternatives: string[];
  min_grade: string;
}

export type SlotsStatus = 'ok' | 'none' | 'defect';

export interface Programme {
  code: string;
  institution: string;
  name: string;
  family: string | null;
  pathway: PathwayKey;
  cutoffs: Record<string, number>;
  slots: Slot[];
  slots_status: SlotsStatus;
}

export type Warning = 'subject_requirements_unknown' | 'subject_requirements_defective' | 'cluster_subjects_filled';

export interface Evaluation {
  code: string;
  institution: string;
  name: string;
  family: string | null;
  pathway: PathwayKey | null;
  preference: number;
  mode: Mode;
  band: BandKey | null;
  state: 'assessed' | 'subjects_not_met' | 'no_cutoff';
  cluster: number | null;
  margin: number | null;
  cutoff: number | null;
  cutoff_year: string | null;
  width: number | null;
  r: number | null;
  t: number;
  picks: [string, number][];
  failed_slots: Slot[];
  warnings: Warning[];
  cutoffs: Record<string, number>;
  slots: Slot[];
  slots_status: SlotsStatus;
}

export interface LearnerSummary {
  total: number;
  mean_grade: string;
  points: Record<string, number>;
  subjects: number;
}

export interface Preferences {
  institutions?: Record<string, number>;
  pathways?: Record<string, number>;
}

export interface EligibilityRequest {
  grades: Record<string, string>;
  mode: Mode;
  fill?: boolean;
  institutions?: string[];
  pathways?: PathwayKey[];
  q?: string;
  limit?: number;
  preferences?: Preferences;
}

export interface EligibilityResponse {
  learner: LearnerSummary;
  mode: Mode;
  fill: boolean;
  counts: Record<ListedBand, number>;
  truncated: Record<ListedBand, boolean>;
  bands: Record<ListedBand, Evaluation[]>;
}

export interface Advice {
  code: string;
  message: string;
}

export interface ChoicesRequest {
  grades: Record<string, string>;
  mode: Mode;
  fill?: boolean;
  choices: string[];
}

export interface ChoicesResponse {
  learner: LearnerSummary;
  mode: Mode;
  choices: Evaluation[];
  advice: Advice[];
}

export interface ClassLearnerInput {
  name?: string;
  grades: Record<string, string>;
}

export interface ClassLearnerResult {
  name: string;
  total: number;
  mean_grade: string;
  best_cluster: number | null;
  bands: Record<ListedBand, number>;
  pathways: Record<PathwayKey, number>;
  at_risk: boolean;
}

export interface ClassResponse {
  learners: ClassLearnerResult[];
  cohort: {
    learners: number;
    mean_total: number | null;
    mean_grades: Record<string, number>;
    safe_reach: number;
    pathway_reach: Record<PathwayKey, number>;
    at_risk: string[];
    subjects: { key: string; name: string; learners: number; mean_points: number }[];
  };
  rejected: { name: string; error: string }[];
}

export interface ProgrammesResponse {
  total: number;
  results: Programme[];
}
