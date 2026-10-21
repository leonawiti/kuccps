from django.test import SimpleTestCase

from .subjects import SUBJECTS, UnknownSubject, group_of, subject, subject_key


class SubjectCatalogueTests(SimpleTestCase):
    def test_the_codes_seen_in_the_workbook_are_all_known(self):
        # Every abbreviation and number used in the workbook's subject requirements.
        seen = {
            'ENG': '101', 'KIS': '102', 'MAT A': '121', 'MAT B': '122', 'BIO': '231', 'PHY': '232', 'CHE': '233',
            'PSC': '234', 'BSC': '235', 'GSC': '237', 'HAG': '311', 'GEO': '312', 'CRE': '313', 'IRE': '314',
            'HRE': '315', 'SEE': '316', 'HSC': '441', 'ARD': '442', 'AGR': '443', 'CMP': '451', 'FRE': '501',
            'GER': '502', 'ARB': '503', 'KSL': '504', 'MUC': '511', 'ACC': '561', 'COM': '562', 'BST': '565',
        }
        for key, number in seen.items():
            self.assertEqual(subject(key).number, number, key)

    def test_religious_education_codes_are_three_hundred_and_thirteen_to_fifteen(self):
        # The subject-groups document gives IRE/HRE as "313/314"; the workbook, which follows the real codes, shows
        # CRE 313, IRE 314 and HRE 315 (and 316 for Social Education and Ethics).
        self.assertEqual([subject(k).number for k in ('CRE', 'IRE', 'HRE', 'SEE')], ['313', '314', '315', '316'])

    def test_every_subject_belongs_to_one_group_and_has_a_name(self):
        for s in SUBJECTS.values():
            self.assertTrue(s.name)
            self.assertIn(s.group, (1, 2, 3, 4, 5), s.key)

    def test_the_groups_follow_the_kcse_arrangement(self):
        self.assertEqual({group_of(k) for k in ('ENG', 'KIS', 'MAT A', 'MAT B')}, {1})
        self.assertEqual({group_of(k) for k in ('BIO', 'PHY', 'CHE')}, {2})
        self.assertEqual({group_of(k) for k in ('HAG', 'GEO', 'CRE', 'IRE', 'HRE')}, {3})
        self.assertEqual({group_of(k) for k in ('HSC', 'ARD', 'AGR', 'CMP')}, {4})
        self.assertEqual({group_of(k) for k in ('FRE', 'GER', 'ARB', 'KSL', 'MUC', 'BST')}, {5})

    def test_the_numbers_are_unique(self):
        numbers = [s.number for s in SUBJECTS.values()]
        self.assertEqual(len(numbers), len(set(numbers)))


class SubjectKeyTests(SimpleTestCase):
    def test_a_subject_is_found_by_key_number_or_name_whatever_the_case_and_spacing(self):
        self.assertEqual(subject_key('mat a'), 'MAT A')
        self.assertEqual(subject_key('MATA'), 'MAT A')
        self.assertEqual(subject_key(' Mat B '), 'MAT B')
        self.assertEqual(subject_key('121'), 'MAT A')
        self.assertEqual(subject_key('Chemistry'), 'CHE')
        self.assertEqual(subject_key('history & government'), 'HAG')

    def test_an_unknown_subject_is_refused(self):
        for bad in ('', 'XYZ', '999', 'Astrology', None):
            with self.assertRaises(UnknownSubject, msg=repr(bad)):
                subject_key(bad)
