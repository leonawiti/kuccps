from django.test import SimpleTestCase

from .grades import InvalidGrade
from .recommend import analyse_choices, evaluate, learner_from_grades, rank_programmes

# Points: ENG 9, KIS 10, MAT A 11, BIO 9, CHE 10, PHY 9, GEO 7. Best seven total t = 65.
GRADES = {'ENG': 'B', 'KIS': 'B+', 'MAT A': 'A-', 'BIO': 'B', 'CHE': 'B+', 'PHY': 'B', 'GEO': 'C+'}

SLOTS = [
    {'alternatives': ['BIO'], 'min_grade': 'C+'},
    {'alternatives': ['CHE'], 'min_grade': 'C+'},
    {'alternatives': ['MAT A', 'PHY'], 'min_grade': 'C+'},
    {'alternatives': ['ENG', 'KIS'], 'min_grade': 'C'},
]
# BIO 9 + CHE 10 + MAT A 11 + KIS 10 = r 40. Cluster points 48 * sqrt(40/48 * 65/84) = 38.545.
CLUSTER = 38.545


def programme(cutoffs, slots=SLOTS, status='ok', code='1', name='BSc Test', institution='Test University',
              pathway='stem'):
    return {'code': code, 'institution': institution, 'name': name, 'family': 'Sciences', 'pathway': pathway,
            'cutoffs': cutoffs, 'slots': slots, 'slots_status': status}


class LearnerTests(SimpleTestCase):
    def test_a_learner_is_read_from_subjects_and_grades(self):
        learner = learner_from_grades({'english': 'b', '102': 'B+', 'MATA': 'A-', 'Biology': 'B',
                                       'CHE': 'B+', 'PHY': 'B', 'GEO': 'C+'})
        self.assertEqual(learner.points['MAT A'], 11)
        self.assertEqual(learner.total, 65)

    def test_fewer_than_seven_subjects_are_refused(self):
        with self.assertRaises(ValueError):
            learner_from_grades({'ENG': 'B', 'KIS': 'B', 'MAT A': 'B'})

    def test_an_invalid_grade_or_subject_is_refused(self):
        with self.assertRaises(InvalidGrade):
            learner_from_grades({**GRADES, 'GEO': 'F'})
        with self.assertRaises(ValueError):
            learner_from_grades({**GRADES, 'Astrology': 'A'})


class EvaluateTests(SimpleTestCase):
    def setUp(self):
        self.learner = learner_from_grades(GRADES)

    def test_a_programme_well_below_the_learner_is_safe_and_the_numbers_are_exact(self):
        r = evaluate(programme({'2024': 30.0}), self.learner, mode='classic')

        self.assertEqual(r['state'], 'assessed')
        self.assertEqual(r['band'], 'safe')
        self.assertEqual(r['cluster'], CLUSTER)
        self.assertEqual(r['cutoff'], 30.0)
        self.assertEqual(r['margin'], 8.545)
        self.assertEqual(r['r'], 40)
        self.assertEqual([k for k, _ in r['picks']], ['BIO', 'CHE', 'MAT A', 'KIS'])

    def test_the_result_carries_the_programmes_cutoff_history_and_requirements_for_display(self):
        p = programme({'2023': 28.0, '2024': 30.0})
        r = evaluate(p, self.learner, mode='classic')

        self.assertEqual(r['cutoffs'], {'2023': 28.0, '2024': 30.0})
        self.assertEqual(r['slots'], SLOTS)
        self.assertEqual(r['slots_status'], 'ok')

    def test_a_programme_with_no_cutoff_still_carries_its_requirements(self):
        r = evaluate(programme({}), self.learner)
        self.assertEqual((r['cutoffs'], r['slots']), ({}, SLOTS))

    def test_classic_and_flexible_bands_can_disagree(self):
        # Margin +1.545. Classic width 2: best fit. This programme has never moved, so its flexible width is 1: safe.
        p = programme({'2022': 37.0, '2023': 37.0, '2024': 37.0})

        self.assertEqual(evaluate(p, self.learner, mode='classic')['band'], 'best_fit')
        flexible = evaluate(p, self.learner, mode='flexible')
        self.assertEqual((flexible['band'], flexible['width']), ('safe', 1.0))

    def test_just_short_of_the_cutoff_is_a_stretch_and_far_short_is_excluded(self):
        self.assertEqual(evaluate(programme({'2024': 40.0}), self.learner, mode='classic')['band'], 'stretch')
        self.assertEqual(evaluate(programme({'2024': 45.0}), self.learner, mode='classic')['band'], 'excluded')

    def test_missing_a_required_subject_grade_is_excluded_whatever_the_points(self):
        slots = [{'alternatives': ['CHE'], 'min_grade': 'A'}] + SLOTS[1:]  # CHE is B+, below A
        r = evaluate(programme({'2024': 10.0}, slots=slots), self.learner, mode='classic')

        self.assertEqual((r['band'], r['state']), ('excluded', 'subjects_not_met'))
        self.assertEqual(r['failed_slots'], [{'alternatives': ['CHE'], 'min_grade': 'A'}])

    def test_no_cutoff_in_any_year_cannot_be_banded(self):
        for cutoffs in ({}, {'2024': 0}, {'2024': None, '2023': '-'}):
            r = evaluate(programme(cutoffs), self.learner)
            self.assertEqual((r['band'], r['state']), (None, 'no_cutoff'), cutoffs)

    def test_the_latest_year_with_a_cutoff_is_used(self):
        r = evaluate(programme({'2023': 30.0, '2024': 0}), self.learner, mode='classic')
        self.assertEqual((r['cutoff'], r['cutoff_year']), (30.0, '2023'))
        r = evaluate(programme({'2023': 30.0, '2024': 33.0}), self.learner, mode='classic')
        self.assertEqual((r['cutoff'], r['cutoff_year']), (33.0, '2024'))

    def test_unknown_subject_requirements_are_banded_but_flagged(self):
        r = evaluate(programme({'2024': 30.0}, slots=[], status='none'), self.learner, mode='classic')

        self.assertEqual(r['band'], 'safe')
        self.assertIn('subject_requirements_unknown', r['warnings'])
        self.assertEqual(r['slots_status'], 'none')

    def test_unreadable_subject_requirements_are_flagged_separately(self):
        r = evaluate(programme({'2024': 30.0}, slots=[], status='defect'), self.learner, mode='classic')
        self.assertIn('subject_requirements_defective', r['warnings'])

    def test_topping_up_missing_cluster_positions_is_reported(self):
        r = evaluate(programme({'2024': 30.0}, slots=SLOTS[:2]), self.learner, mode='classic')
        self.assertIn('cluster_subjects_filled', r['warnings'])


class CacheTests(SimpleTestCase):
    def test_a_cache_gives_identical_results_and_assigns_each_requirement_pattern_once(self):
        from unittest import mock
        from . import recommend

        learner = learner_from_grades(GRADES)
        ps = [programme({'2024': 20.0 + i}, code=str(i)) for i in range(10)]  # ten programmes, one pattern
        plain = [evaluate(p, learner, 'classic') for p in ps]

        cache = {}
        with mock.patch.object(recommend, 'assign_slots', wraps=recommend.assign_slots) as spy:
            cached = [evaluate(p, learner, 'classic', cache=cache) for p in ps]

        self.assertEqual(cached, plain)
        self.assertEqual(spy.call_count, 1)

    def test_programmes_with_different_requirements_do_not_share_a_cached_assignment(self):
        # Both have one slot, but different subjects: PHY (9) against CHE (10) gives a different r.
        learner = learner_from_grades(GRADES)
        phy = programme({'2024': 30.0}, slots=[{'alternatives': ['PHY'], 'min_grade': 'C'}], code='phy')
        che = programme({'2024': 30.0}, slots=[{'alternatives': ['CHE'], 'min_grade': 'C'}], code='che')
        cache = {}
        a = evaluate(phy, learner, 'classic', cache=cache)
        b = evaluate(che, learner, 'classic', cache=cache)
        self.assertEqual((a['picks'][0][0], b['picks'][0][0]), ('PHY', 'CHE'))


class RankingTests(SimpleTestCase):
    def test_best_fit_first_then_safe_then_stretch_then_excluded_and_no_data_last(self):
        learner = learner_from_grades(GRADES)
        ps = [
            programme({'2024': 50.0}, code='excl'), programme({'2024': 30.0}, code='safe'),
            programme({}, code='nodata'), programme({'2024': 40.0}, code='stretch'),
            programme({'2024': 38.0}, code='fit'),
        ]
        ranked = rank_programmes(ps, learner, mode='classic')
        self.assertEqual([r['code'] for r in ranked], ['fit', 'safe', 'stretch', 'excl', 'nodata'])

    def test_within_safe_the_more_selective_programme_comes_first(self):
        learner = learner_from_grades(GRADES)
        ps = [programme({'2024': 20.0}, code='low'), programme({'2024': 33.0}, code='high')]
        self.assertEqual([r['code'] for r in rank_programmes(ps, learner, mode='classic')], ['high', 'low'])


class PreferenceTests(SimpleTestCase):
    def setUp(self):
        self.learner = learner_from_grades(GRADES)
        self.selective = programme({'2024': 33.0}, code='sel', institution='Test University', pathway='stem')
        self.preferred = programme({'2024': 20.0}, code='pref', institution='Pref University', pathway='social')

    def order(self, programmes, preferences=None):
        return [r['code'] for r in rank_programmes(programmes, self.learner, mode='classic', preferences=preferences)]

    def test_without_preferences_the_more_selective_safe_programme_comes_first(self):
        self.assertEqual(self.order([self.preferred, self.selective]), ['sel', 'pref'])

    def test_a_preferred_university_moves_up_within_its_band(self):
        prefs = {'institutions': {'Pref University': 2}}
        self.assertEqual(self.order([self.selective, self.preferred], prefs), ['pref', 'sel'])

    def test_a_preferred_pathway_moves_up_within_its_band(self):
        prefs = {'pathways': {'social': 1}}
        self.assertEqual(self.order([self.selective, self.preferred], prefs), ['pref', 'sel'])

    def test_weights_add_and_the_larger_total_wins(self):
        prefs = {'institutions': {'Pref University': 1}, 'pathways': {'stem': 3}}
        self.assertEqual(self.order([self.preferred, self.selective], prefs), ['sel', 'pref'])

    def test_a_preference_never_lifts_a_programme_into_a_better_band(self):
        out_of_reach = programme({'2024': 45.0}, code='far', institution='Pref University')
        prefs = {'institutions': {'Pref University': 3}}
        self.assertEqual(self.order([out_of_reach, self.selective], prefs), ['sel', 'far'])

    def test_preferences_also_order_within_the_stretch_band(self):
        closer = programme({'2024': 39.0}, code='closer')  # margin -0.455
        wished = programme({'2024': 40.0}, code='wished', institution='Pref University')  # margin -1.455
        self.assertEqual(self.order([closer, wished]), ['closer', 'wished'])
        self.assertEqual(self.order([closer, wished], {'institutions': {'Pref University': 1}}), ['wished', 'closer'])

    def test_the_weight_is_reported_on_each_result(self):
        prefs = {'institutions': {'Pref University': 2}, 'pathways': {'social': 1}}
        (r,) = rank_programmes([self.preferred], self.learner, mode='classic', preferences=prefs)
        self.assertEqual((r['preference'], r['pathway']), (3, 'social'))

    def test_a_negative_or_non_numeric_weight_is_refused(self):
        for bad in ({'institutions': {'Pref University': -1}}, {'pathways': {'social': 'high'}}):
            with self.assertRaises(ValueError):
                rank_programmes([self.preferred], self.learner, preferences=bad)


class AnalyseChoicesTests(SimpleTestCase):
    def setUp(self):
        self.learner = learner_from_grades(GRADES)

    def codes(self, result):
        return [a['code'] for a in result['advice']]

    def test_each_choice_is_evaluated_in_the_order_given(self):
        ps = [programme({'2024': 30.0}, code='a'), programme({'2024': 40.0}, code='b')]
        result = analyse_choices(ps, self.learner, mode='classic')
        self.assertEqual([c['code'] for c in result['choices']], ['a', 'b'])
        self.assertEqual([c['band'] for c in result['choices']], ['safe', 'stretch'])

    def test_advice_when_there_is_no_safe_choice_and_fewer_than_four_choices(self):
        result = analyse_choices([programme({'2024': 40.0}, code='b')], self.learner, mode='classic')
        self.assertIn('no_safe_choice', self.codes(result))
        self.assertIn('fewer_than_four', self.codes(result))

    def test_a_balanced_four_has_no_warnings(self):
        ps = [programme({'2024': c}, code=str(i)) for i, c in enumerate((30.0, 38.0, 40.0, 39.0))]
        self.assertEqual(analyse_choices(ps, self.learner, mode='classic')['advice'], [])

    def test_all_excluded_is_called_out(self):
        ps = [programme({'2024': 50.0}, code=str(i)) for i in range(4)]
        self.assertIn('all_excluded', self.codes(analyse_choices(ps, self.learner, mode='classic')))

    def test_repeating_a_programme_and_choosing_one_with_no_data_are_flagged(self):
        ps = [programme({'2024': 30.0}, code='x'), programme({'2024': 30.0}, code='x'), programme({}, code='n')]
        codes = self.codes(analyse_choices(ps, self.learner, mode='classic'))
        self.assertIn('duplicate_choice', codes)
        self.assertIn('no_data_choice', codes)

    def test_more_than_four_choices_are_refused(self):
        with self.assertRaises(ValueError):
            analyse_choices([programme({'2024': 30.0}, code=str(i)) for i in range(5)], self.learner)

    def test_no_choices_are_refused(self):
        with self.assertRaises(ValueError):
            analyse_choices([], self.learner)
