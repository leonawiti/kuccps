from django.test import SimpleTestCase

from .classes import MAX_LEARNERS, analyse_class

SUBJECTS_7 = ['ENG', 'KIS', 'MAT A', 'BIO', 'CHE', 'PHY', 'GEO']
STRONG = {s: 'A' for s in SUBJECTS_7}  # total 84, r 48, cluster points 48
WEAK = {s: 'D' for s in SUBJECTS_7}  # total 21, fails every grade requirement below
MID = {'ENG': 'B', 'KIS': 'B+', 'MAT A': 'A-', 'BIO': 'B', 'CHE': 'B+', 'PHY': 'B', 'GEO': 'C+'}  # total 65, 38.545

STEM_SLOTS = [
    {'alternatives': ['BIO'], 'min_grade': 'C+'}, {'alternatives': ['CHE'], 'min_grade': 'C+'},
    {'alternatives': ['MAT A', 'PHY'], 'min_grade': 'C+'}, {'alternatives': ['ENG', 'KIS'], 'min_grade': 'C'},
]
SOCIAL_SLOTS = [{'alternatives': ['ENG', 'KIS'], 'min_grade': 'C'}]


def prog(code, cutoff, pathway, slots):
    return {'code': code, 'institution': 'U', 'name': code, 'family': None, 'pathway': pathway,
            'cutoffs': {'2024': cutoff}, 'slots': slots, 'slots_status': 'ok'}


PROGRAMMES = [prog('stem1', 30.0, 'stem', STEM_SLOTS), prog('soc1', 35.0, 'social', SOCIAL_SLOTS)]
LEARNERS = [{'name': 'Strong', 'grades': STRONG}, {'name': 'Weak', 'grades': WEAK}, {'name': 'Mid', 'grades': MID}]


class AnalyseClassTests(SimpleTestCase):
    def setUp(self):
        self.result = analyse_class(LEARNERS, PROGRAMMES, mode='classic')
        self.by_name = {l['name']: l for l in self.result['learners']}

    def test_each_learner_gets_a_total_mean_grade_and_band_counts(self):
        strong = self.by_name['Strong']
        self.assertEqual((strong['total'], strong['mean_grade'], strong['best_cluster']), (84, 'A', 48.0))
        self.assertEqual(strong['bands'], {'best_fit': 0, 'safe': 2, 'stretch': 0, 'excluded': 0, 'no_data': 0})

        mid = self.by_name['Mid']
        self.assertEqual((mid['total'], mid['mean_grade'], mid['best_cluster']), (65, 'B', 38.545))
        self.assertEqual(mid['bands']['safe'], 2)

    def test_a_learner_with_nothing_safe_or_best_fit_is_at_risk(self):
        weak = self.by_name['Weak']
        self.assertEqual(weak['bands']['excluded'], 2)
        self.assertTrue(weak['at_risk'])
        self.assertFalse(self.by_name['Strong']['at_risk'])
        self.assertEqual(self.result['cohort']['at_risk'], ['Weak'])

    def test_pathway_counts_are_programmes_the_learner_can_reach(self):
        self.assertEqual(self.by_name['Strong']['pathways'], {'stem': 1, 'social': 1, 'arts_sports': 0})
        self.assertEqual(self.by_name['Weak']['pathways'], {'stem': 0, 'social': 0, 'arts_sports': 0})

    def test_the_cohort_summary(self):
        c = self.result['cohort']
        self.assertEqual(c['learners'], 3)
        self.assertEqual(c['mean_total'], 56.667)
        self.assertEqual(c['mean_grades'], {'A': 1, 'B': 1, 'D': 1})
        self.assertEqual(c['pathway_reach'], {'stem': 0.667, 'social': 0.667, 'arts_sports': 0.0})
        self.assertEqual(c['safe_reach'], 0.667)

    def test_subject_averages_cover_the_learners_who_took_each_subject(self):
        eng = next(s for s in self.result['cohort']['subjects'] if s['key'] == 'ENG')
        self.assertEqual((eng['learners'], eng['mean_points']), (3, 8.0))  # (12 + 3 + 9) / 3

    def test_a_learner_who_cannot_be_read_is_reported_not_counted(self):
        learners = LEARNERS + [{'name': 'Few', 'grades': {'ENG': 'A', 'KIS': 'A'}},
                               {'name': 'Bad', 'grades': {**STRONG, 'GEO': 'F'}}]
        result = analyse_class(learners, PROGRAMMES, mode='classic')
        self.assertEqual(result['cohort']['learners'], 3)
        self.assertEqual([r['name'] for r in result['rejected']], ['Few', 'Bad'])
        self.assertTrue(all(r['error'] for r in result['rejected']))

    def test_unnamed_learners_are_numbered(self):
        result = analyse_class([{'grades': STRONG}, {'grades': MID}], PROGRAMMES, mode='classic')
        self.assertEqual([l['name'] for l in result['learners']], ['Learner 1', 'Learner 2'])

    def test_an_empty_class_or_one_that_is_too_large_is_refused(self):
        with self.assertRaises(ValueError):
            analyse_class([], PROGRAMMES)
        with self.assertRaises(ValueError):
            analyse_class([{'grades': STRONG}] * (MAX_LEARNERS + 1), PROGRAMMES)


class BestFitAndClusterTests(SimpleTestCase):
    # MID against a programme at cut-off 38.0 is a best fit (+0.545), not a safe course. A second programme
    # needs GEO, so MID's cluster there is lower (r 38 instead of 40).
    PROGRAMMES = [prog('a', 38.0, 'stem', STEM_SLOTS),
                  prog('b', 50.0, 'social', [{'alternatives': ['GEO'], 'min_grade': 'C+'}])]

    def setUp(self):
        self.result = analyse_class([{'name': 'Mid', 'grades': MID}], self.PROGRAMMES, mode='classic')
        self.mid = self.result['learners'][0]

    def test_a_learner_with_only_a_best_fit_is_not_at_risk_and_reaches_that_pathway(self):
        self.assertEqual(self.mid['bands']['best_fit'], 1)
        self.assertEqual(self.mid['bands']['safe'], 0)
        self.assertFalse(self.mid['at_risk'])
        self.assertEqual(self.mid['pathways'], {'stem': 1, 'social': 0, 'arts_sports': 0})
        self.assertEqual(self.result['cohort']['safe_reach'], 0.0)

    def test_the_best_cluster_is_the_highest_across_programmes(self):
        self.assertEqual(self.mid['best_cluster'], 38.545)  # the other programme gives 37.569


class CollegeOptionsTests(SimpleTestCase):
    """Degrees are not the only route: the same class checked against KMTC and TVET entries."""
    COLLEGES = [
        {'id': 'open', 'provider': 'tvet', 'name': 'Open course', 'level': 'artisan', 'category': 'x', 'min_mean': 'E',
         'options': [{'label': None, 'rules': []}], 'flags': []},
        {'id': 'high', 'provider': 'kmtc', 'name': 'Demanding course', 'level': 'diploma', 'category': 'x', 'min_mean': 'A',
         'options': [{'label': None, 'rules': []}], 'flags': []},
    ]

    def setUp(self):
        self.result = analyse_class(LEARNERS, PROGRAMMES, mode='classic', colleges=self.COLLEGES)
        self.by_name = {l['name']: l for l in self.result['learners']}

    def test_each_learner_has_a_count_of_college_programmes_they_are_eligible_for(self):
        self.assertEqual(self.by_name['Strong']['colleges_eligible'], 2)  # mean A
        self.assertEqual(self.by_name['Mid']['colleges_eligible'], 1)     # mean B: not the demanding one
        self.assertEqual(self.by_name['Weak']['colleges_eligible'], 1)    # mean D: only the open one

    def test_the_cohort_shows_how_many_have_an_option_and_which_at_risk_learners_do(self):
        c = self.result['cohort']
        self.assertEqual(c['college_reach'], 1.0)
        self.assertEqual(c['at_risk_with_college_option'], ['Weak'])

    def test_an_at_risk_learner_with_no_college_option_is_not_in_that_list(self):
        only_high = [self.COLLEGES[1]]
        result = analyse_class(LEARNERS, PROGRAMMES, mode='classic', colleges=only_high)
        self.assertEqual(result['cohort']['at_risk'], ['Weak'])
        self.assertEqual(result['cohort']['at_risk_with_college_option'], [])
        self.assertEqual(result['cohort']['college_reach'], 0.333)

    def test_without_college_entries_the_fields_are_empty_not_zero(self):
        result = analyse_class(LEARNERS, PROGRAMMES, mode='classic')
        self.assertIsNone(result['learners'][0]['colleges_eligible'])
        self.assertIsNone(result['cohort']['college_reach'])
