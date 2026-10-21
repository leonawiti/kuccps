import type { Choice } from '../state/app-context';
import { MAX_CHOICES } from '../state/app-context';

export function addChoice(list: Choice[], choice: Choice): Choice[] {
  if (list.length >= MAX_CHOICES || list.some((c) => c.code === choice.code)) return list;
  return [...list, choice];
}

export const removeChoice = (list: Choice[], code: string): Choice[] => list.filter((c) => c.code !== code);

export function moveChoice(list: Choice[], code: string, direction: -1 | 1): Choice[] {
  const from = list.findIndex((c) => c.code === code);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
