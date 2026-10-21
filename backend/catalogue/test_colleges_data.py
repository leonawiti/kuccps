from django.test import SimpleTestCase

from engine.colleges import evaluate_college
from engine.grades import GRADES
from engine.recommend import learner_from_grades
from engine.subjects import SUBJECTS

from .college_catalogue import COLLEGES
from .colleges_data import KMTC
from .colleges_tvet import TVET


def get(entry_id):
    return next(e for e in COLLEGES if e['id'] == entry_id)


def rules_of(entry, option=0):
    return [(r['subjects'], r['grade'], r['count']) for r in entry['options'][option]['rules']]


class StructureTests(SimpleTestCase):
    def test_the_documents_are_fully_transcribed(self):
        # KMTC lists 36 courses. The TVET table has 29 rows in its first block, 32 in the KNEC block, 9 internal.
        self.assertEqual(len(KMTC), 36)
        self.assertEqual(len(TVET), 70)
        self.assertEqual([e['id'] for e in KMTC], [f'kmtc-{n:02d}' for n in range(1, 37)])

    def test_ids_are_unique(self):
        ids = [e['id'] for e in COLLEGES]
        self.assertEqual(len(ids), len(set(ids)))

    def test_every_entry_is_well_formed(self):
        for e in COLLEGES:
            self.assertIn(e['provider'], ('kmtc', 'tvet'), e['id'])
            self.assertIn(e['level'], ('diploma', 'certificate', 'artisan'), e['id'])
            self.assertTrue(e['name'] and e['source'], e['id'])
            self.assertIn(e['page'], range(1, 7), e['id'])
            if e['min_mean'] is not None:
                self.assertIn(e['min_mean'], GRADES, e['id'])
            self.assertTrue(e['options'], e['id'])
            for option in e['options']:
                for rule in option['rules']:
                    self.assertIn(rule['grade'], GRADES, e['id'])
                    self.assertGreaterEqual(rule['count'], 1, e['id'])
                    self.assertTrue(rule['subjects'], e['id'])
                    for key in rule['subjects']:
                        self.assertTrue(key == '*' or key in SUBJECTS, (e['id'], key))

    def test_a_rule_never_asks_for_more_different_subjects_than_its_list_holds(self):
        for e in COLLEGES:
            for option in e['options']:
                for rule in option['rules']:
                    pool = len(SUBJECTS) if rule['subjects'] == ['*'] else len(rule['subjects'])
                    self.assertLessEqual(rule['count'], pool, e['id'])

    def test_kmtc_pages_follow_the_document(self):
        self.assertEqual({e['page'] for e in KMTC if int(e['id'][-2:]) <= 18}, {1})
        self.assertEqual({e['page'] for e in KMTC if int(e['id'][-2:]) >= 19}, {2})

    def test_the_only_course_without_a_printed_mean_grade_is_health_insurance_diploma(self):
        self.assertEqual([e['id'] for e in COLLEGES if e['min_mean'] is None], ['kmtc-35'])


class CheckedAgainstThePrintedText(SimpleTestCase):
    """Entries compared with the requirement text in the PDFs, so a slip in transcription is caught."""

    def test_kmtc_pharmacy(self):
        e = get('kmtc-28')
        self.assertEqual((e['name'], e['level'], e['min_mean']), ('Diploma in Pharmacy', 'diploma', 'C'))
        self.assertEqual(rules_of(e), [
            (['ENG', 'KIS'], 'C', 1), (['CHE', 'PSC'], 'C', 1), (['BIO', 'BSC'], 'C', 1), (['PHY', 'PSC', 'MAT A', 'MAT B'], 'C', 1)])

    def test_kmtc_emergency_medical_technician_certificate(self):
        e = get('kmtc-03')
        self.assertEqual((e['min_mean'], rules_of(e)), ('C-', [(['BIO', 'BSC'], 'D', 1)]))

    def test_kmtc_community_oral_health_needs_two_of_the_listed_subjects(self):
        self.assertIn((['PHY', 'PSC', 'CHE', 'MAT A', 'MAT B'], 'C-', 2), rules_of(get('kmtc-14')))

    def test_kmtc_physiotherapy_names_biology_only(self):
        self.assertIn((['BIO'], 'C-', 1), rules_of(get('kmtc-29')))

    def test_kmtc_mortuary_science_lists_a_mean_grade_and_no_subjects(self):
        e = get('kmtc-36')
        self.assertEqual((e['min_mean'], rules_of(e), e['flags']), ('C-', [], ['no_subject_rules_listed']))

    def test_kmtc_health_insurance_diploma_prints_no_mean_grade(self):
        self.assertIsNone(get('kmtc-35')['min_mean'])

    def test_tvet_law_certificate(self):
        e = get('tvet-law-certificate')
        self.assertEqual((e['min_mean'], rules_of(e)), ('C-', [(['ENG', 'KIS'], 'C', 1)]))

    def test_tvet_nursing_diploma_and_certificate_differ_in_grades(self):
        dip, cert = get('tvet-nursing-diploma'), get('tvet-nursing-certificate')
        self.assertEqual((dip['min_mean'], cert['min_mean']), ('C', 'C-'))
        self.assertIn((['PHY', 'PSC', 'CHE', 'MAT A', 'MAT B'], 'C-', 1), rules_of(dip))
        self.assertIn((['PHY', 'PSC', 'CHE', 'MAT A', 'MAT B'], 'D+', 1), rules_of(cert))

    def test_tvet_pharmacy_has_two_alternatives(self):
        e = get('tvet-pharmacy-diploma')
        self.assertEqual([o['label'] for o in e['options']], ['Alternative A', 'Alternative B'])
        self.assertIn((['BSC'], 'C', 1), rules_of(e, 1))

    def test_tvet_education_variants(self):
        science = get('tvet-education-science-based-courses-diploma')
        self.assertEqual(science['min_mean'], 'C+')
        self.assertIn((['*'], 'C+', 2), rules_of(science))
        impaired = [e for e in TVET if e['audience'] == 'visually_or_hearing_impaired']
        self.assertEqual(len(impaired), 2)
        self.assertTrue(all(e['min_mean'] == 'C' for e in impaired))

    def test_tvet_forestry_needs_two_different_subjects_from_its_list(self):
        self.assertIn((['BIO', 'PHY', 'CHE', 'AGR'], 'C-', 2), rules_of(get('tvet-forestry-certificate')))

    def test_tvet_animal_health_certificate_is_flagged_as_cut_off_in_the_source(self):
        self.assertEqual(get('tvet-animal-health-certificate')['flags'], ['incomplete_source'])

    def test_artisan_courses_have_no_minimum_mean_and_no_subject_rules(self):
        artisan = [e for e in COLLEGES if e['level'] == 'artisan']
        self.assertEqual(len(artisan), 10)
        self.assertTrue(all(e['min_mean'] == 'E' and rules_of(e) == [] for e in artisan))

    def test_economics_is_not_in_any_list_because_it_is_not_a_subject_we_hold(self):
        for e in COLLEGES:
            for option in e['options']:
                for rule in option['rules']:
                    self.assertNotIn('ECON', rule['subjects'])


class EveryEntryCanBeMetTests(SimpleTestCase):
    def test_a_learner_with_an_a_in_every_subject_is_eligible_for_every_entry(self):
        # If any rule were impossible to satisfy (a typo in a subject list, a count too high) this would catch it.
        learner = learner_from_grades({key: 'A' for key in SUBJECTS})
        not_eligible = [e['id'] for e in COLLEGES if evaluate_college(e, learner)['status'] != 'eligible']
        self.assertEqual(not_eligible, [])

    def test_a_learner_with_an_e_in_every_subject_is_eligible_only_for_courses_with_no_requirements(self):
        learner = learner_from_grades({key: 'E' for key in list(SUBJECTS)[:7]})
        eligible = {e['id'] for e in COLLEGES if evaluate_college(e, learner)['status'] == 'eligible'}
        expected = {e['id'] for e in COLLEGES if e['min_mean'] == 'E' and not any(o['rules'] for o in e['options'])}
        self.assertEqual(eligible, expected)
        self.assertEqual(len(expected), 10)
