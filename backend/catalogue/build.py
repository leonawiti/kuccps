"""
Building the programme catalogue from the draft workbook.

Cut-offs come from the DEGREE CLUSTER sheet (2018 to 2024), subject requirements from the Subject Combination
sheet, matched by programme code. Nothing is guessed: a missing cut-off stays missing and an unreadable
requirement cell marks the programme defective, both counted in the report. openpyxl is needed only here
(requirements-dev.txt); the running app reads the JSON this produces.
"""
import re

import openpyxl

from engine.careers import pathway_of
from engine.requirements import BadRequirement, parse_slot

MAX_CUTOFF = 48

_YEAR = re.compile(r'^(20\d\d)\b')


def clean_cutoff(value):
    """A cut-off as a number to 3 places, or None for '-', blanks, zero, errors like #DIV/0! and impossible values."""
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        try:
            value = float(value.strip())
        except ValueError:
            return None
    if not isinstance(value, (int, float)):
        return None
    if value <= 0 or value > MAX_CUTOFF:
        return None
    return round(float(value), 3)


def _code(value):
    """A programme code as text: whole numbers drop the '.0', alphanumeric codes are kept; headers are not codes."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return str(int(value)) if value else None
    text = str(value).strip()
    return text if text and text.upper() != 'PROG CODE' else None


def _text(value):
    return re.sub(r'\s+', ' ', str(value)).strip() if value is not None else ''


def _rows(wb, sheet):
    return list(wb[sheet].iter_rows(values_only=True))


def build_catalogue(path):
    """(programmes, report) from the workbook at `path`."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        return _build(wb)
    finally:
        wb.close()  # Windows keeps the file locked until it is closed


def _build(wb):
    # Subject requirements by code: the raw cells, kept so a defect can quote the cell.
    cells_by_code = {}
    for row in _rows(wb, 'Subject Combination'):
        code = _code(row[1])
        if code and isinstance(row[3], str):
            cells_by_code[code] = [c for c in row[6:10] if isinstance(c, str) and c.strip()]

    dc_rows = _rows(wb, 'DEGREE CLUSTER')
    header = next(r for r in dc_rows if r[1] == 'PROG CODE')
    year_columns = {}
    for i, h in enumerate(header):
        m = _YEAR.match(str(h)) if h else None
        if m:
            year_columns[m.group(1)] = i

    programmes = []
    report = {'programmes': 0, 'institutions': 0, 'slots_ok': 0, 'slots_none': 0, 'slots_defective': 0,
              'no_cutoff': 0, 'defects': []}
    family = None
    for row in dc_rows:
        code = _code(row[1])
        if code is None:
            if isinstance(row[0], str) and row[1] is None and row[0].strip():
                family = _text(row[0])
            continue
        if not isinstance(row[3], str):
            continue

        cutoffs = {}
        for year, col in year_columns.items():
            value = clean_cutoff(row[col])
            if value is not None:
                cutoffs[year] = value

        cells = cells_by_code.get(code, [])
        slots, status = [], 'none'
        if cells:
            try:
                slots = [parse_slot(c) for c in cells]
                status = 'ok'
            except BadRequirement as e:
                status = 'defect'
                report['defects'].append({'code': code, 'name': _text(row[3]), 'cell': ' | '.join(cells), 'problem': str(e)})
        report['slots_' + {'ok': 'ok', 'none': 'none', 'defect': 'defective'}[status]] += 1
        if not cutoffs:
            report['no_cutoff'] += 1

        programmes.append({
            'code': code, 'institution': _text(row[2]), 'name': _text(row[3]), 'family': family,
            'pathway': pathway_of(_text(row[3])),
            'cutoffs': cutoffs,
            'slots': [{'alternatives': list(s.alternatives), 'min_grade': s.min_grade} for s in slots],
            'slots_status': status,
        })

    report['programmes'] = len(programmes)
    report['institutions'] = len({p['institution'] for p in programmes})
    return programmes, report
