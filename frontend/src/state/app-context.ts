import { createContext, useContext } from 'react';
import type { Row } from '../lib/profile';
import type { Meta, Mode } from '../lib/types';

export interface LearnerProfile {
  name: string;
  school: string;
  rows: Row[];
  mode: Mode;
}

/** A programme the learner has put on their list of (up to four) choices. */
export interface Choice {
  code: string;
  name: string;
  institution: string;
}

export const MAX_CHOICES = 4;

export interface AppState {
  meta: Meta;
  profile: LearnerProfile;
  setProfile: (next: LearnerProfile | ((prev: LearnerProfile) => LearnerProfile)) => void;
  /** Grades ready to send ({subject: grade}), and what is wrong with the form if it is not ready. */
  grades: Record<string, string>;
  problems: string[];
  ready: boolean;
  subjectNames: Record<string, string>;
  choices: Choice[];
  addChoice: (choice: Choice) => void;
  removeChoice: (code: string) => void;
  moveChoice: (code: string, direction: -1 | 1) => void;
  clearChoices: () => void;
  go: (tab: Tab) => void;
}

export type Tab = 'check' | 'choices' | 'colleges' | 'class' | 'report' | 'about';

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside the app');
  return value;
}
