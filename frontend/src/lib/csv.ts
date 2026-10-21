import type { ClassLearnerInput, Subject } from './types';

/** The separator a file uses: whichever of comma, semicolon and tab appears most outside quotes on the first line. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== '') ?? '';
  let inQuotes = false;
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  const [best, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? best : ',';
}

/** Rows of trimmed cells from CSV text. Handles quotes, doubled quotes, a byte-order mark, and blank lines. */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input; // drop a byte-order mark
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const endCell = () => {
    row.push(cell.trim());
    cell = '';
  };
  const endRow = () => {
    endCell();
    if (row.some((c) => c !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      endCell();
    } else if (ch === '\n') {
      endRow();
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) endRow();
  return rows;
}

const squash = (text: string) => text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

const NAME_HEADERS = new Set(['name', 'learner', 'student', 'pupil', 'fullname', 'learnername', 'studentname']);

// Short names teachers commonly use in a mark sheet.
const ALIASES: Record<string, string> = {
  math: 'MAT A', maths: 'MAT A', mathematics: 'MAT A', history: 'HAG', business: 'BST', agric: 'AGR',
  computer: 'CMP', computers: 'CMP', computerstudies: 'CMP',
};

function subjectLookup(subjects: Subject[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [alias, key] of Object.entries(ALIASES)) {
    if (subjects.some((s) => s.key === key)) lookup.set(alias, key);
  }
  for (const s of subjects) {
    lookup.set(squash(s.key), s.key);
    lookup.set(s.number, s.key);
    lookup.set(squash(s.name), s.key);
  }
  return lookup;
}

function tidyGrade(value: string): string {
  return value.replace(/[−–—]/g, '-').replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * A class mark sheet: a header row (a Name column and one column per subject, named by key, name or number),
 * then one row per learner. A blank grade means the subject was not taken. Grades are only tidied here; the
 * server decides whether they are valid and says which learners it could not read.
 */
export function parseClassCsv(text: string, subjects: Subject[]): { learners: ClassLearnerInput[]; warnings: string[] } {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error('The file is empty.');
  const [header, ...body] = rows;
  const lookup = subjectLookup(subjects);

  let nameColumn = -1;
  const columns: { index: number; key: string }[] = [];
  const warnings: string[] = [];
  const used = new Set<string>();
  header.forEach((title, index) => {
    const s = squash(title);
    if (nameColumn === -1 && NAME_HEADERS.has(s)) {
      nameColumn = index;
      return;
    }
    const key = lookup.get(s);
    if (!key) {
      warnings.push(`Column "${title}" is not a known subject and was ignored.`);
    } else if (used.has(key)) {
      warnings.push(`Column "${title}" repeats a subject already given and was ignored.`);
    } else {
      used.add(key);
      columns.push({ index, key });
    }
  });
  if (columns.length === 0) throw new Error('No subject columns found. Name the columns by subject, for example ENG, KIS, MAT A.');
  if (body.length === 0) throw new Error('No learners found below the header row.');

  const learners = body.map((cells) => {
    const grades: Record<string, string> = {};
    for (const { index, key } of columns) {
      const grade = tidyGrade(cells[index] ?? '');
      if (grade) grades[key] = grade;
    }
    return { name: nameColumn >= 0 ? (cells[nameColumn] ?? '') : '', grades };
  });
  return { learners, warnings };
}

/** A starting file: the header and two example learners with their first seven subjects filled in. */
export function classCsvTemplate(subjects: Subject[]): string {
  const header = ['Name', ...subjects.map((s) => s.key)];
  const example = (name: string, grade: string) =>
    [name, ...subjects.map((_, i) => (i < 7 ? grade : ''))].join(',');
  return [header.join(','), example('Example Learner 1', 'B'), example('Example Learner 2', 'C+')].join('\n');
}
