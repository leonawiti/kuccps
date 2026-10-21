from django.test import SimpleTestCase

from .bands import BAND_ORDER, classify, flexible_width


class ClassifyTests(SimpleTestCase):
    def test_the_classic_two_point_bands(self):
        cases = [
            (5.0, 'safe'), (2.0, 'safe'),  # at +2 exactly is safe
            (1.99, 'best_fit'), (0.0, 'best_fit'),  # meeting the cut-off exactly is a best fit
            (-0.01, 'stretch'), (-2.0, 'stretch'),  # -2 exactly is still a stretch
            (-2.01, 'excluded'), (-20.0, 'excluded'),
        ]
        for margin, expected in cases:
            self.assertEqual(classify(margin, 2.0), expected, margin)

    def test_a_wider_band_moves_the_boundaries(self):
        self.assertEqual(classify(3.0, 4.0), 'best_fit')
        self.assertEqual(classify(-3.5, 4.0), 'stretch')
        self.assertEqual(classify(-4.5, 4.0), 'excluded')

    def test_the_bands_are_listed_most_attractive_first(self):
        self.assertEqual(BAND_ORDER, ['best_fit', 'safe', 'stretch', 'excluded'])


class FlexibleWidthTests(SimpleTestCase):
    def test_width_is_one_and_a_half_times_the_typical_yearly_movement(self):
        # Changes of 2, 1, 2: mean 1.667, times 1.5 = 2.5.
        self.assertEqual(flexible_width([20, 22, 21, 23]), 2.5)

    def test_a_very_stable_programme_never_gets_a_band_narrower_than_one_point(self):
        self.assertEqual(flexible_width([20, 20, 20, 20]), 1.0)

    def test_a_very_volatile_programme_is_capped_at_five_points(self):
        self.assertEqual(flexible_width([10, 30, 10, 30]), 5.0)

    def test_too_little_history_falls_back_to_the_classic_two_points(self):
        self.assertEqual(flexible_width([]), 2.0)
        self.assertEqual(flexible_width([20]), 2.0)
        self.assertEqual(flexible_width([20, 25]), 2.0)  # only one change is not a pattern
