from django.test import SimpleTestCase

from .cluster import assign_slots, cluster_points
from .requirements import Slot


class ClusterPointsTests(SimpleTestCase):
    def test_a_perfect_learner_scores_forty_eight(self):
        self.assertEqual(cluster_points(48, 84), 48.0)

    def test_when_both_ratios_are_equal_the_cluster_points_equal_r(self):
        # r/48 == t/84 so the square root is that ratio: C = r.
        self.assertEqual(cluster_points(40, 70), 40.0)
        self.assertEqual(cluster_points(36, 63), 36.0)

    def test_the_geometric_mean_of_the_two_ratios(self):
        # 48 * sqrt(0.5 * 1) = 33.941...
        self.assertEqual(cluster_points(24, 84), 33.941)

    def test_a_worked_example_calculated_by_hand(self):
        # r = 36, t = 65: 48 * sqrt(0.75 * 65/84) = 48 * 0.76181... = 36.567.
        self.assertEqual(cluster_points(36, 65), 36.567)

    def test_values_outside_the_possible_ranges_are_refused(self):
        for r, t in ((49, 84), (-1, 50), (40, 85), (40, 6), (0, 0)):
            with self.assertRaises(ValueError, msg=(r, t)):
                cluster_points(r, t)


class AssignSlotsTests(SimpleTestCase):
    SLOTS = [Slot(('BIO',), 'C+'), Slot(('CHE',), 'C+'), Slot(('MAT A', 'PHY'), 'C+'), Slot(('ENG', 'KIS'), 'C')]

    def test_each_slot_takes_its_best_qualifying_subject(self):
        learner = {'BIO': 9, 'CHE': 10, 'MAT A': 8, 'PHY': 11, 'ENG': 7, 'KIS': 9, 'GEO': 5}
        a = assign_slots(learner, self.SLOTS)

        self.assertTrue(a.ok)
        # PHY (11) beats MAT A (8) for the third slot; KIS (9) beats ENG (7) for the fourth.
        self.assertEqual([p[0] for p in a.picks], ['BIO', 'CHE', 'PHY', 'KIS'])
        self.assertEqual(a.r, 9 + 10 + 11 + 9)

    def test_one_subject_cannot_fill_two_slots(self):
        slots = [Slot(('MAT A',), 'C'), Slot(('MAT A', 'PHY'), 'C')]
        learner = {'MAT A': 12, 'PHY': 6, 'ENG': 5}

        a = assign_slots(learner, slots)

        self.assertTrue(a.ok)
        self.assertEqual([p[0] for p in a.picks[:2]], ['MAT A', 'PHY'])

    def test_a_shared_subject_goes_where_the_total_is_best(self):
        # Valid pairings: (CHE, PHY) = 19, (CHE, BIO) = 15, (PHY, BIO) = 20. The best total wins.
        slots = [Slot(('CHE', 'PHY'), 'C'), Slot(('PHY', 'BIO'), 'C')]
        learner = {'CHE': 7, 'PHY': 12, 'BIO': 8, 'ENG': 5}

        a = assign_slots(learner, slots, fill=False)

        self.assertEqual([p[0] for p in a.picks], ['PHY', 'BIO'])
        self.assertEqual(a.r, 20)

    def test_a_slot_that_no_subject_satisfies_fails_the_assignment(self):
        learner = {'BIO': 9, 'CHE': 6, 'MAT A': 8, 'ENG': 7}  # CHE is C, below C+

        a = assign_slots(learner, self.SLOTS)

        self.assertFalse(a.ok)
        self.assertEqual(a.failed, [1])  # the second slot (CHE C+)

    def test_a_missing_subject_is_a_failed_slot(self):
        a = assign_slots({'BIO': 9, 'MAT A': 9, 'ENG': 9, 'KIS': 9}, [Slot(('CHE',), 'D')])
        self.assertFalse(a.ok)
        self.assertEqual(a.failed, [0])

    def test_fewer_than_four_slots_are_topped_up_with_the_best_remaining_subjects(self):
        learner = {'BIO': 9, 'CHE': 10, 'ENG': 8, 'KIS': 11, 'GEO': 7, 'MAT A': 12}
        a = assign_slots(learner, [Slot(('BIO',), 'C')])

        self.assertTrue(a.ok)
        self.assertEqual(a.filled, 3)
        # BIO plus the best three of the others: MAT A 12, KIS 11, CHE 10.
        self.assertEqual(a.r, 9 + 12 + 11 + 10)

    def test_topping_up_can_be_turned_off(self):
        a = assign_slots({'BIO': 9, 'CHE': 10}, [Slot(('BIO',), 'C')], fill=False)
        self.assertEqual((a.r, a.filled), (9, 0))

    def test_no_slots_at_all_uses_the_best_four_subjects(self):
        learner = {'BIO': 9, 'CHE': 10, 'ENG': 8, 'KIS': 11, 'GEO': 7}
        a = assign_slots(learner, [])
        self.assertEqual((a.ok, a.r, a.filled), (True, 38, 4))
