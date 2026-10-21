import { describe, expect, it } from 'vitest';
import { learnersToCsv, sortLearners } from './classTable';
import type { ClassLearnerResult } from './types';

const L = (name: string, total: number, safe: number, best_cluster: number | null, at_risk = false): ClassLearnerResult => ({
  name, total, mean_grade: 'B', best_cluster,
  bands: { best_fit: 1, safe, stretch: 2, excluded: 3, no_data: 0 },
  pathways: { stem: 4, social: 5, arts_sports: 6 }, at_risk,
});

const LIST = [L('Wanjiru', 60, 10, 30.5), L('Amina', 70, 50, 41.2), L('Otieno', 30, 0, null, true)];
const names = (xs: ClassLearnerResult[]) => xs.map((x) => x.name);

describe('sortLearners', () => {
  it('sorts by name, ignoring case', () => {
    expect(names(sortLearners(LIST, 'name', 'asc'))).toEqual(['Amina', 'Otieno', 'Wanjiru']);
    expect(names(sortLearners([L('B', 1, 1, 1), L('a', 1, 1, 1)], 'name', 'asc'))).toEqual(['a', 'B']);
  });
  it('sorts numbers either way', () => {
    expect(names(sortLearners(LIST, 'total', 'desc'))).toEqual(['Amina', 'Wanjiru', 'Otieno']);
    expect(names(sortLearners(LIST, 'total', 'asc'))).toEqual(['Otieno', 'Wanjiru', 'Amina']);
    expect(names(sortLearners(LIST, 'safe', 'desc'))).toEqual(['Amina', 'Wanjiru', 'Otieno']);
  });
  it('puts a learner with no cluster points last whichever way it sorts', () => {
    expect(names(sortLearners(LIST, 'best_cluster', 'desc')).at(-1)).toBe('Otieno');
    expect(names(sortLearners(LIST, 'best_cluster', 'asc')).at(-1)).toBe('Otieno');
  });
  it('keeps the learner with no value last whichever order the list arrives in', () => {
    const withValue = L('A', 1, 1, 10);
    const without = L('B', 1, 1, null);
    expect(names(sortLearners([withValue, without], 'best_cluster', 'asc'))).toEqual(['A', 'B']);
    expect(names(sortLearners([without, withValue], 'best_cluster', 'asc'))).toEqual(['A', 'B']);
    expect(names(sortLearners([without, withValue], 'best_cluster', 'desc'))).toEqual(['A', 'B']);
  });
  it('does not change the list it is given', () => {
    const copy = [...LIST];
    sortLearners(LIST, 'total', 'asc');
    expect(LIST).toEqual(copy);
  });
});

describe('learnersToCsv', () => {
  it('has a header and one line per learner', () => {
    const lines = learnersToCsv(LIST).split('\n');
    expect(lines[0]).toBe('Name,Total (best 7),Mean grade,Best cluster points,Best fit,Safe,Stretch,Excluded,STEM reachable,Social Sciences reachable,Arts and Sports reachable,At risk');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe('Wanjiru,60,B,30.5,1,10,2,3,4,5,6,No');
    expect(lines[3]).toBe('Otieno,30,B,,1,0,2,3,4,5,6,Yes');
  });
  it('quotes names with commas or quotes so a spreadsheet reads them back', () => {
    const csv = learnersToCsv([L('Achieng, "Ann"', 50, 1, 20)]);
    expect(csv.split('\n')[1].startsWith('"Achieng, ""Ann""",50')).toBe(true);
  });
  it('protects against a name that a spreadsheet would run as a formula', () => {
    const csv = learnersToCsv([L('=HYPERLINK("x")', 50, 1, 20)]);
    expect(csv.split('\n')[1].startsWith('"\'=HYPERLINK(""x"")",50')).toBe(true);
  });
});
