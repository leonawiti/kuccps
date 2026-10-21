import tempfile
from pathlib import Path

import openpyxl
from django.test import SimpleTestCase

from .build import build_catalogue, clean_cutoff

YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024']


def make_workbook(path, degree_cluster_rows, subject_rows):
    """A workbook laid out like the real one: header rows, programme-family heading rows, then programmes."""
    wb = openpyxl.Workbook()
    dc = wb.active
    dc.title = 'DEGREE CLUSTER'
    dc.append([None] * 10 + [38.9])
    dc.append(['#', 'PROG CODE', 'INSTITUTION NAME', 'PROGRAMME NAME'] + [f'{y} CUTOFF' for y in YEARS])
    for row in degree_cluster_rows:
        dc.append(row)
    sc = wb.create_sheet('Subject Combination')
    sc.append(['#', 'PROG\nCODE', 'INSTITUTION NAME', 'PROGRAMME NAME', 'CUTOFF - 2023', 'CUTOFF - 2022',
               'SUBJECT 1', 'SUBJECT 2', 'SUBJECT 3', 'SUBJECT 4'])
    for row in subject_rows:
        sc.append(row)
    wb.save(path)


FAMILY = ['BACHELOR OF SCIENCE'] + [None] * 10
A = [1, 1001101, 'UNI A', 'BSC ONE', '-', 20.5, 21.0, 22.0, 23.0, 24.0, 25.0]
B = [2, '1001B61', 'UNI B', 'BSC TWO', '-', '-', '-', '-', '-', '-', '#DIV/0!']
C = [3, 1001103, 'UNI C', 'BSC THREE', 30.0, 31.0, 32.0, 33.0, 34.0, 35.0, 36.0]
D = [4, 1001104, 'UNI D', 'BSC FOUR', 0, 0, 0, 0, 0, 0, 0]
E = [5, 1001105, 'UNI E', 'BSC FIVE', 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0]


class CleanCutoffTests(SimpleTestCase):
    def test_real_values_are_kept_to_three_places(self):
        self.assertEqual(clean_cutoff(22.0428333), 22.043)
        self.assertEqual(clean_cutoff(16), 16.0)
        self.assertEqual(clean_cutoff('24.5'), 24.5)

    def test_dashes_zero_blank_errors_and_nonsense_are_no_data(self):
        for v in ('-', 0, 0.0, None, '', '#DIV/0!', 'n/a', True, -3, 48.5):
            self.assertIsNone(clean_cutoff(v), repr(v))


class BuildCatalogueTests(SimpleTestCase):
    def build(self, dc_rows, sc_rows):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'w.xlsx'
            make_workbook(path, dc_rows, sc_rows)
            return build_catalogue(path)

    def sc_row(self, base, *cells):
        return [base[0], base[1], base[2], base[3], 1, 1] + list(cells) + [None] * (4 - len(cells))

    def test_programmes_are_read_with_family_cutoffs_and_slots(self):
        programmes, report = self.build(
            [FAMILY, A],
            [FAMILY[:10], self.sc_row(A, 'BIO(231):C+', 'ENG(101)/KIS(102):C')],
        )
        (p,) = programmes
        self.assertEqual(p['code'], '1001101')
        self.assertEqual((p['institution'], p['name'], p['family']), ('UNI A', 'BSC ONE', 'BACHELOR OF SCIENCE'))
        self.assertEqual(p['cutoffs'], {'2019': 20.5, '2020': 21.0, '2021': 22.0, '2022': 23.0, '2023': 24.0, '2024': 25.0})
        self.assertEqual(p['slots'], [{'alternatives': ['BIO'], 'min_grade': 'C+'},
                                      {'alternatives': ['ENG', 'KIS'], 'min_grade': 'C'}])
        self.assertEqual(p['slots_status'], 'ok')

    def test_alphanumeric_programme_codes_are_kept_as_text(self):
        programmes, _ = self.build([FAMILY, B], [])
        self.assertEqual(programmes[0]['code'], '1001B61')

    def test_a_programme_with_no_subject_row_or_empty_slots_has_status_none(self):
        programmes, report = self.build([FAMILY, A, C], [self.sc_row(C)])
        self.assertEqual({p['code']: p['slots_status'] for p in programmes}, {'1001101': 'none', '1001103': 'none'})
        self.assertEqual(report['slots_none'], 2)

    def test_an_unreadable_slot_marks_the_programme_defective_and_is_reported(self):
        programmes, report = self.build([FAMILY, A], [self.sc_row(A, 'BIO(231):C+', 'CHE(2')])
        (p,) = programmes
        self.assertEqual((p['slots_status'], p['slots']), ('defect', []))
        self.assertEqual(report['slots_defective'], 1)
        self.assertEqual(report['defects'][0]['code'], '1001101')
        self.assertIn('CHE(2', report['defects'][0]['cell'])

    def test_programmes_with_no_cutoff_in_any_year_are_kept_and_counted(self):
        programmes, report = self.build([FAMILY, B, D, E], [])
        self.assertEqual(len(programmes), 3)
        self.assertEqual(report['no_cutoff'], 2)
        self.assertEqual(next(p for p in programmes if p['code'] == '1001B61')['cutoffs'], {})

    def test_the_report_counts_what_was_read(self):
        _, report = self.build([FAMILY, A, C], [self.sc_row(A, 'BIO(231):C+')])
        self.assertEqual(report['programmes'], 2)
        self.assertEqual(report['slots_ok'], 1)
        self.assertEqual(report['institutions'], 2)

    def test_each_programme_is_given_a_career_pathway_from_its_name(self):
        music = [6, 1001106, 'UNI F', 'BACHELOR OF MUSIC', 10.0, 10.0, 10.0, 10.0, 10.0, 10.0, 10.0]
        nursing = [7, 1001107, 'UNI G', 'BACHELOR OF SCIENCE (NURSING)', 30.0, 30.0, 30.0, 30.0, 30.0, 30.0, 30.0]
        programmes, _ = self.build([FAMILY, music, nursing], [])
        self.assertEqual({p['name']: p['pathway'] for p in programmes},
                         {'BACHELOR OF MUSIC': 'arts_sports', 'BACHELOR OF SCIENCE (NURSING)': 'stem'})
