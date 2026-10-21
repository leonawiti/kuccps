import { describe, expect, it } from 'vitest';
import { classCsvTemplate, parseClassCsv, parseCsv } from './csv';
import type { Subject } from './types';

const SUBJECTS: Subject[] = [
  { key: 'ENG', number: '101', name: 'English', group: 1 },
  { key: 'KIS', number: '102', name: 'Kiswahili', group: 1 },
  { key: 'MAT A', number: '121', name: 'Mathematics (Alternative A)', group: 1 },
  { key: 'BIO', number: '231', name: 'Biology', group: 2 },
  { key: 'HAG', number: '311', name: 'History and Government', group: 3 },
];

describe('parseCsv', () => {
  it('reads rows and cells, ignoring blank lines and a byte-order mark', () => {
    expect(parseCsv('﻿a,b\r\n1,2\r\n\r\n3,4\n')).toEqual([['a', 'b'], ['1', '2'], ['3', '4']]);
  });

  it('understands quotes, commas inside quotes and doubled quotes', () => {
    expect(parseCsv('"Wanjiru, A.","say ""hi""",C')).toEqual([['Wanjiru, A.', 'say "hi"', 'C']]);
  });

  it('detects semicolons and tabs as the separator', () => {
    expect(parseCsv('a;b;c\n1;2;3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    expect(parseCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('trims cells', () => {
    expect(parseCsv(' a , b \n 1 , 2 ')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('parseClassCsv', () => {
  it('reads a name column and subject columns by key, name or number', () => {
    const text = 'Name,ENG,Kiswahili,121,Biology\nAmina,B,B+,A-,C+\nOtieno,C,C,D+,';
    const { learners, warnings } = parseClassCsv(text, SUBJECTS);

    expect(warnings).toEqual([]);
    expect(learners).toEqual([
      { name: 'Amina', grades: { ENG: 'B', KIS: 'B+', 'MAT A': 'A-', BIO: 'C+' } },
      { name: 'Otieno', grades: { ENG: 'C', KIS: 'C', 'MAT A': 'D+' } }, // blank = subject not taken
    ]);
  });

  it('matches headers whatever the case, spacing and punctuation', () => {
    const { learners } = parseClassCsv('learner,mat a,history & government,ENG\nZ,A,B,C', SUBJECTS);
    expect(learners[0].grades).toEqual({ 'MAT A': 'A', HAG: 'B', ENG: 'C' });
  });

  it('knows common short names for mathematics and history', () => {
    const { learners } = parseClassCsv('Name,Maths,History\nZ,A,B', SUBJECTS);
    expect(learners[0].grades).toEqual({ 'MAT A': 'A', HAG: 'B' });
  });

  it('tidies grades: upper case, spaces, typographic minus', () => {
    const { learners } = parseClassCsv('Name,ENG,KIS,BIO\nZ, b+ ,c−,d (plain)', SUBJECTS);
    expect(learners[0].grades).toEqual({ ENG: 'B+', KIS: 'C-', BIO: 'D (PLAIN)' });
  });

  it('warns about a column that is not a subject and ignores it', () => {
    const { learners, warnings } = parseClassCsv('Name,Adm,ENG\nZ,1234,A', SUBJECTS);
    expect(warnings).toEqual(['Column "Adm" is not a known subject and was ignored.']);
    expect(learners[0].grades).toEqual({ ENG: 'A' });
  });

  it('works without a name column, leaving the name for the server to number', () => {
    const { learners } = parseClassCsv('ENG,KIS\nA,B', SUBJECTS);
    expect(learners).toEqual([{ name: '', grades: { ENG: 'A', KIS: 'B' } }]);
  });

  it('warns when a subject column appears twice and keeps the first', () => {
    const { learners, warnings } = parseClassCsv('Name,ENG,English\nZ,A,B', SUBJECTS);
    expect(warnings).toEqual(['Column "English" repeats a subject already given and was ignored.']);
    expect(learners[0].grades).toEqual({ ENG: 'A' });
  });

  it('refuses a file with no subject columns', () => {
    expect(() => parseClassCsv('Name,Adm\nZ,1', SUBJECTS)).toThrow('No subject columns');
  });

  it('refuses a file with a header but no learners', () => {
    expect(() => parseClassCsv('Name,ENG', SUBJECTS)).toThrow('No learners');
  });

  it('refuses an empty file', () => {
    expect(() => parseClassCsv('  \n', SUBJECTS)).toThrow('empty');
  });
});

describe('classCsvTemplate with many subjects', () => {
  it('fills in only the first seven subjects of the example learners', () => {
    const many: Subject[] = Array.from({ length: 10 }, (_, i) => ({ key: `S${i}`, number: `${900 + i}`, name: `Subject ${i}`, group: 1 }));
    const row = classCsvTemplate(many).split(/\r?\n/)[1].split(',');
    expect(row.slice(1).filter((c) => c !== '')).toHaveLength(7);
  });
});

describe('classCsvTemplate', () => {
  it('is a header of Name and every subject key, with two example rows that read back cleanly', () => {
    const text = classCsvTemplate(SUBJECTS);
    expect(text.split('\n')[0]).toBe('Name,ENG,KIS,MAT A,BIO,HAG');
    const { learners, warnings } = parseClassCsv(text, SUBJECTS);
    expect(warnings).toEqual([]);
    expect(learners).toHaveLength(2);
  });
});
