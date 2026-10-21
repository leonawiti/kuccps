from django.test import SimpleTestCase

from .colleges import evaluate_college, lower_grade, rank_colleges
from .recommend import learner_from_grades

# ENG B, KIS B+, MAT A A-, BIO B, CHE B+, PHY B, GEO C+: total 65, mean grade B.
MID = {'ENG': 'B', 'KIS': 'B+', 'MAT A': 'A-', 'BIO': 'B', 'CHE': 'B+', 'PHY': 'B', 'GEO': 'C+'}
ENGKIS = ['ENG', 'KIS']
BIO_ = ['BIO', 'BSC']
MATH = ['MAT A', 'MAT B']


def entry(rules=None, min_mean='C', options=None, **over):
    base = {
        'id': 'x-1', 'provider': 'kmtc', 'name': 'Diploma in Testing', 'level': 'diploma', 'category': 'Health',
        'section': None, 'min_mean': min_mean, 'page': 1, 'source': 'test', 'notes': '', 'flags': [],
        'options': options if options is not None else [{'label': None, 'rules': rules or []}],
    }
    base.update(over)
    return base


def rule(subjects, grade, count=1):
    return {'subjects': subjects, 'grade': grade, 'count': count}


class LowerGradeTests(SimpleTestCase):
    def test_one_step_down_the_scale(self):
        self.assertEqual(lower_grade('B'), 'B-')
        self.assertEqual(lower_grade('A'), 'A-')
        self.assertEqual(lower_grade('D-'), 'E')

    def test_e_cannot_go_lower(self):
        self.assertEqual(lower_grade('E'), 'E')


class EvaluateTests(SimpleTestCase):
    def setUp(self):
        self.learner = learner_from_grades(MID)  # mean grade B

    def test_meeting_the_mean_grade_and_every_subject_rule_is_eligible(self):
        r = evaluate_college(entry([rule(ENGKIS, 'C'), rule(BIO_, 'C')], min_mean='C'), self.learner)
        self.assertEqual((r['status'], r['unmet']), ('eligible', []))
        self.assertEqual(r['mean_grade'], 'B')

    def test_a_mean_grade_below_the_minimum_is_not_eligible_and_says_so(self):
        r = evaluate_college(entry(min_mean='A'), self.learner)  # learner is B, two steps short of A
        self.assertEqual(r['status'], 'not_eligible')
        self.assertEqual(r['unmet'], [{'kind': 'mean', 'need': 'A', 'have': 'B'}])

    def test_one_step_short_on_the_mean_is_a_near_miss(self):
        r = evaluate_college(entry(min_mean='B+'), self.learner)
        self.assertEqual(r['status'], 'near')
        self.assertEqual(r['unmet'], [{'kind': 'mean', 'need': 'B+', 'have': 'B'}])

    def test_a_subject_grade_not_met_is_listed_with_the_requirement(self):
        r = evaluate_college(entry([rule(['CHE'], 'A')]), self.learner)  # CHE B+ is two steps below A
        self.assertEqual(r['status'], 'not_eligible')
        self.assertEqual(r['unmet'], [{'kind': 'subject', 'alternatives': ['CHE'], 'min_grade': 'A', 'count': 1}])

    def test_one_step_short_on_a_subject_is_a_near_miss(self):
        r = evaluate_college(entry([rule(['CHE'], 'A-')]), self.learner)  # CHE B+ is one step below A-
        self.assertEqual(r['status'], 'near')

    def test_a_subject_the_learner_did_not_take_is_not_eligible(self):
        r = evaluate_college(entry([rule(['AGR'], 'D')]), self.learner)
        self.assertEqual(r['status'], 'not_eligible')

    def test_any_two_of_a_list_needs_two_different_subjects(self):
        two = entry([rule(['PHY', 'CHE', 'MAT A'], 'C-', count=2)])
        self.assertEqual(evaluate_college(two, self.learner)['status'], 'eligible')
        thin = learner_from_grades({**MID, 'PHY': 'E', 'CHE': 'E'})  # only MAT A reaches C-
        self.assertNotEqual(evaluate_college(two, thin)['status'], 'eligible')

    def test_one_subject_cannot_satisfy_two_rules(self):
        # English is the only subject at A; both rules want one of ENG/KIS, but KIS is only B+.
        learner = learner_from_grades({**MID, 'ENG': 'A', 'KIS': 'D', 'GEO': 'D'})
        both = entry([rule(ENGKIS, 'B'), rule(['ENG'], 'B')])
        r = evaluate_college(both, learner)
        self.assertEqual(r['status'], 'not_eligible')
        self.assertEqual(r['unmet'], [{'kind': 'overlap'}])

    def test_only_the_rules_that_fall_short_are_listed(self):
        # CHE (one qualifying subject for a one-subject rule) is met exactly; AGR was not taken.
        r = evaluate_college(entry([rule(['CHE'], 'C'), rule(['AGR'], 'D')]), self.learner)
        self.assertEqual(r['unmet'], [{'kind': 'subject', 'alternatives': ['AGR'], 'min_grade': 'D', 'count': 1}])

    def test_alternative_requirement_sets_are_either_or(self):
        e = entry(options=[
            {'label': 'Alternative A', 'rules': [rule(['AGR'], 'C')]},  # not taken
            {'label': 'Alternative B', 'rules': [rule(BIO_, 'C')]},
        ])
        r = evaluate_college(e, self.learner)
        self.assertEqual((r['status'], r['option']), ('eligible', 'Alternative B'))

    def test_when_no_option_is_met_the_closest_one_is_reported(self):
        e = entry(options=[
            {'label': 'Alternative A', 'rules': [rule(['AGR'], 'C'), rule(['HSC'], 'C')]},  # two shortfalls
            {'label': 'Alternative B', 'rules': [rule(['CHE'], 'A')]},  # one shortfall
        ])
        r = evaluate_college(e, self.learner)
        self.assertEqual(r['option'], 'Alternative B')
        self.assertEqual(len(r['unmet']), 1)

    def test_any_subject_rules_stand_for_the_teaching_subjects(self):
        # "C+ in two teaching subjects": any two subjects not used by the other rules.
        e = entry([rule(['ENG'], 'C'), rule(MATH, 'C'), rule(['*'], 'C+', count=2)])
        self.assertEqual(evaluate_college(e, self.learner)['status'], 'eligible')
        weak = learner_from_grades({'ENG': 'B', 'KIS': 'D', 'MAT A': 'B', 'BIO': 'D', 'CHE': 'D', 'PHY': 'D', 'GEO': 'D'})
        self.assertNotEqual(evaluate_college(e, weak)['status'], 'eligible')

    def test_a_course_with_no_subject_rules_depends_only_on_the_mean_grade(self):
        self.assertEqual(evaluate_college(entry(min_mean='C-'), self.learner)['status'], 'eligible')

    def test_no_stated_minimum_mean_is_accepted_with_a_warning(self):
        r = evaluate_college(entry([rule(BIO_, 'C')], min_mean=None), self.learner)
        self.assertEqual(r['status'], 'eligible')
        self.assertIn('mean_grade_not_stated', r['warnings'])

    def test_the_lowest_minimum_mean_accepts_everyone(self):
        weak = learner_from_grades({s: 'E' for s in ('ENG', 'KIS', 'MAT A', 'BIO', 'CHE', 'PHY', 'GEO')})
        self.assertEqual(evaluate_college(entry(min_mean='E'), weak)['status'], 'eligible')

    def test_flags_on_the_entry_become_warnings_and_the_entry_details_are_carried(self):
        r = evaluate_college(entry(flags=['incomplete_source'], notes='cut off', page=3, source='BIO - C-'), self.learner)
        self.assertIn('incomplete_source', r['warnings'])
        self.assertEqual((r['page'], r['source'], r['notes'], r['id'], r['provider']), (3, 'BIO - C-', 'cut off', 'x-1', 'kmtc'))


class CarriedDetailsTests(SimpleTestCase):
    def test_the_requirements_are_carried_so_a_screen_can_show_what_the_course_asks_for(self):
        e = entry([rule(ENGKIS, 'C')], options=None)
        r = evaluate_college(e, learner_from_grades(MID))
        self.assertEqual(r['options'], e['options'])

    def test_a_warning_is_given_once_even_if_the_entry_also_flags_it(self):
        r = evaluate_college(entry(min_mean=None, flags=['mean_grade_not_stated']), learner_from_grades(MID))
        self.assertEqual(r['warnings'], ['mean_grade_not_stated'])


class RankTests(SimpleTestCase):
    def test_eligible_first_then_near_misses_then_the_rest_and_diplomas_before_certificates(self):
        learner = learner_from_grades(MID)
        entries = [
            entry(id='far', min_mean='A', name='Far'),
            entry(id='cert', level='certificate', min_mean='C', name='Cert'),
            entry(id='near', min_mean='B+', name='Near'),
            entry(id='dip', level='diploma', min_mean='C', name='Dip'),
        ]
        self.assertEqual([r['id'] for r in rank_colleges(entries, learner)], ['dip', 'cert', 'near', 'far'])
