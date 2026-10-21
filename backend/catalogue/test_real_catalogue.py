"""Invariants of the built catalogue (catalogue/data/degrees.json). Skipped where it has not been built."""
from unittest import skipUnless

from django.test import SimpleTestCase

from engine.careers import PATHWAYS
from engine.grades import GRADES
from engine.subjects import SUBJECTS

from .loader import DEFAULT_PATH, load_catalogue


@skipUnless(DEFAULT_PATH.exists(), 'catalogue not built')
class RealCatalogueTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.programmes = load_catalogue()['programmes']

    def test_it_holds_the_whole_workbook(self):
        self.assertGreaterEqual(len(self.programmes), 2100)
        self.assertEqual(len({p['institution'] for p in self.programmes}), 71)

    def test_programme_codes_are_unique(self):
        codes = [p['code'] for p in self.programmes]
        self.assertEqual(len(codes), len(set(codes)))

    def test_every_cutoff_is_a_real_year_and_between_zero_and_forty_eight(self):
        for p in self.programmes:
            for year, value in p['cutoffs'].items():
                self.assertTrue(2018 <= int(year) <= 2024, p['code'])
                self.assertTrue(0 < value <= 48, (p['code'], value))

    def test_every_slot_uses_known_subjects_and_a_real_grade(self):
        for p in self.programmes:
            self.assertLessEqual(len(p['slots']), 4, p['code'])
            for slot in p['slots']:
                self.assertIn(slot['min_grade'], GRADES)
                self.assertTrue(slot['alternatives'])
                for key in slot['alternatives']:
                    self.assertIn(key, SUBJECTS)

    def test_status_matches_the_slots_and_every_programme_has_a_pathway(self):
        for p in self.programmes:
            self.assertEqual(bool(p['slots']), p['slots_status'] == 'ok', p['code'])
            self.assertIn(p['pathway'], PATHWAYS)
