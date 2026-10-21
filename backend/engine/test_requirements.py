from django.test import SimpleTestCase

from .requirements import BadRequirement, Slot, parse_requirements, parse_slot


class ParseSlotTests(SimpleTestCase):
    def test_a_single_subject_with_its_minimum_grade(self):
        self.assertEqual(parse_slot('MAT A(121):C+'), Slot(('MAT A',), 'C+'))

    def test_alternatives_are_separated_by_a_slash(self):
        self.assertEqual(parse_slot('ENG(101)/KIS(102):C'), Slot(('ENG', 'KIS'), 'C'))

    def test_line_breaks_in_the_middle_of_a_code_are_ignored(self):
        # Seen in the workbook: 'BIO(231)/PHY(232)/CHE(23\n3)/MAT A(121):C+'.
        self.assertEqual(
            parse_slot('BIO(231)/PHY(232)/CHE(23\n3)/MAT A(121):C+'),
            Slot(('BIO', 'PHY', 'CHE', 'MAT A'), 'C+'),
        )
        self.assertEqual(parse_slot('BIO(231)/AGR(443)/BST(56\n5):C+').alternatives, ('BIO', 'AGR', 'BST'))

    def test_spacing_around_the_parts_does_not_matter(self):
        self.assertEqual(parse_slot('  ENG (101) / KIS (102) : c- '), Slot(('ENG', 'KIS'), 'C-'))

    def test_a_cell_cut_off_part_way_is_refused(self):
        for bad in ('BIO(231)/PHY(', 'BIO(231)/PH', 'BIO(2'):
            with self.assertRaises(BadRequirement, msg=bad):
                parse_slot(bad)

    def test_a_subject_with_no_grade_is_refused(self):
        with self.assertRaises(BadRequirement):
            parse_slot('MAT A(121)')
        with self.assertRaises(BadRequirement):
            parse_slot('MAT A(121):')

    def test_an_unknown_subject_or_grade_is_refused(self):
        for bad in ('XYZ(999):C', 'MAT A(121):F', 'MAT A(122):C'):  # the last: number does not match the subject
            with self.assertRaises(BadRequirement, msg=bad):
                parse_slot(bad)

    def test_an_empty_cell_is_refused(self):
        for bad in ('', '   ', None):
            with self.assertRaises(BadRequirement, msg=repr(bad)):
                parse_slot(bad)


class ParseRequirementsTests(SimpleTestCase):
    def test_up_to_four_slots_are_read_in_order_and_empty_cells_skipped(self):
        slots = parse_requirements(['BIO(231):C+', 'CHE(233):C+', None, 'ENG(101)/KIS(102):C'])
        self.assertEqual(slots, [Slot(('BIO',), 'C+'), Slot(('CHE',), 'C+'), Slot(('ENG', 'KIS'), 'C')])

    def test_no_cells_means_no_requirements_known(self):
        self.assertEqual(parse_requirements([None, None, None, None]), [])

    def test_more_than_four_slots_are_refused(self):
        with self.assertRaises(BadRequirement):
            parse_requirements(['MAT A(121):C'] * 5)
