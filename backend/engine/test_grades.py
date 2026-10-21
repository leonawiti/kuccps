from django.test import SimpleTestCase

from .grades import GRADES, InvalidGrade, mean_grade, parse_grade, points_of, total_of_best


class GradePointsTests(SimpleTestCase):
    def test_the_twelve_kcse_grades_are_worth_twelve_down_to_one_point(self):
        self.assertEqual(
            [points_of(g) for g in ('A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E')],
            [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
        )

    def test_the_grades_are_listed_best_first(self):
        self.assertEqual(GRADES, ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'])


class ReadingAGradeTests(SimpleTestCase):
    def test_a_grade_is_read_whatever_the_case_and_spacing(self):
        self.assertEqual([parse_grade(x) for x in (' b+ ', 'c', 'A-', 'd-')], ['B+', 'C', 'A-', 'D-'])

    def test_plain_grades_written_the_way_the_published_documents_write_them(self):
        # The KMTC and TVET documents say "C (plain)", "C plain" and "D (Plain)".
        self.assertEqual([parse_grade(x) for x in ('C (plain)', 'C plain', 'D (Plain)', 'C(plain)')], ['C', 'C', 'D', 'C'])

    def test_minus_and_plus_written_in_words_or_with_other_dashes(self):
        # "C- (minus)", "D+ (plus)", and the typographic minus sign seen in the documents.
        self.assertEqual([parse_grade(x) for x in ('C- (minus)', 'C (minus)', 'D+ (plus)', 'C−', 'C–')], ['C-', 'C-', 'D+', 'C-', 'C-'])

    def test_something_that_is_not_a_grade_is_refused(self):
        for bad in ('', 'F', 'A+', 'E-', 'AA', 'ten', None, '7'):
            with self.assertRaises(InvalidGrade, msg=repr(bad)):
                parse_grade(bad)


class TotalPointsTests(SimpleTestCase):
    def test_the_total_is_over_the_best_seven_subjects(self):
        # Learner A in the design notes: eight subjects, the lowest dropped: 11+10+10+9+9+9+7 = 65, not 72.
        points = [11, 10, 9, 10, 9, 7, 9, 7]

        self.assertEqual(total_of_best(points), 65)

    def test_exactly_seven_subjects_are_all_counted(self):
        self.assertEqual(total_of_best([12] * 7), 84)

    def test_fewer_than_seven_subjects_cannot_be_totalled(self):
        with self.assertRaises(ValueError):
            total_of_best([12] * 6)

    def test_the_number_counted_can_be_changed(self):
        self.assertEqual(total_of_best([5, 4, 3, 2, 1], count=3), 12)


class MeanGradeTests(SimpleTestCase):
    """The KNEC conversion from the total of the best seven subjects to a mean grade (to be verified against KNEC's own table)."""

    def test_each_band_starts_and_ends_where_the_published_table_says(self):
        cases = [
            (84, 'A'), (81, 'A'), (80, 'A-'), (74, 'A-'), (73, 'B+'), (67, 'B+'), (66, 'B'), (60, 'B'),
            (59, 'B-'), (53, 'B-'), (52, 'C+'), (46, 'C+'), (45, 'C'), (39, 'C'), (38, 'C-'), (32, 'C-'),
            (31, 'D+'), (25, 'D+'), (24, 'D'), (18, 'D'), (17, 'D-'), (11, 'D-'), (10, 'E'), (7, 'E'),
        ]
        for total, expected in cases:
            self.assertEqual(mean_grade(total), expected, total)

    def test_the_design_notes_learner_with_sixty_five_points_has_a_b_not_an_a_minus(self):
        # The design notes call this learner "A-" (a mean grade of A- needs at least 74 points).
        self.assertEqual(mean_grade(65), 'B')

    def test_a_total_outside_what_seven_subjects_can_make_is_refused(self):
        for bad in (6, 85, 0, -1):
            with self.assertRaises(ValueError, msg=bad):
                mean_grade(bad)
