from django.test import SimpleTestCase

from .careers import PATHWAYS, pathway_of

STEM = [
    'BACHELOR OF SCIENCE (COMPUTER SCIENCE)', 'BACHELOR OF SCIENCE (NURSING)', 'BACHELOR OF ACTUARIAL SCIENCE',
    'BACHELOR OF EDUCATION (SCIENCE)', 'BACHELOR OF SCIENCE IN CIVIL ENGINEERING', 'BACHELOR OF MEDICINE AND SURGERY',
    'BACHELOR OF SCIENCE (INFORMATION TECHNOLOGY)', 'BACHELOR OF ARCHITECTURE', 'BACHELOR OF PHARMACY',
    'BACHELOR OF SCIENCE IN AGRIBUSINESS MANAGEMENT', 'BACHELOR OF SCIENCE IN FOOD SCIENCE AND TECHNOLOGY',
    'BACHELOR OF SCIENCE (STATISTICS)', 'BACHELOR OF BUSINESS INFORMATION TECHNOLOGY',
    'BACHELOR OF SCIENCE IN ENVIRONMENTAL SCIENCE', 'BACHELOR OF VETERINARY MEDICINE',
]
SOCIAL = [
    'BACHELOR OF ARTS', 'BACHELOR OF EDUCATION (ARTS)', 'BACHELOR OF COMMERCE', 'BACHELOR OF LAWS',
    'BACHELOR OF BUSINESS AND MANAGEMENT', 'BACHELOR OF ARTS (ECONOMICS)', 'BACHELOR OF SCIENCE IN ECONOMICS',
    'BACHELOR OF JOURNALISM AND MASS COMMUNICATION', 'BACHELOR OF ARTS IN PSYCHOLOGY', 'BACHELOR OF CRIMINOLOGY',
    'BACHELOR OF TOURISM MANAGEMENT', 'BACHELOR OF EDUCATION (EARLY CHILDHOOD)', 'BACHELOR OF ARTS (KISWAHILI)',
    'BACHELOR OF SCIENCE IN HOSPITALITY MANAGEMENT',
]
ARTS_SPORTS = [
    'BACHELOR OF MUSIC', 'BACHELOR OF SCIENCE IN SPORTS SCIENCE', 'BACHELOR OF EDUCATION (PHYSICAL EDUCATION)',
    'BACHELOR OF FILM AND ANIMATION', 'BACHELOR OF FASHION DESIGN AND MARKETING', 'BACHELOR OF FINE ART',
    'BACHELOR OF ARTS (THEATRE ARTS)', 'BACHELOR OF ARTS IN FILM TECHNOLOGY',
]


class PathwayTests(SimpleTestCase):
    def test_the_three_cbe_senior_school_pathways(self):
        self.assertEqual(sorted(PATHWAYS), ['arts_sports', 'social', 'stem'])

    def check(self, names, expected):
        for name in names:
            self.assertEqual(pathway_of(name), expected, name)

    def test_stem_programmes(self):
        self.check(STEM, 'stem')

    def test_social_sciences_and_humanities_programmes(self):
        self.check(SOCIAL, 'social')

    def test_arts_and_sports_programmes(self):
        self.check(ARTS_SPORTS, 'arts_sports')

    def test_case_and_spacing_do_not_matter(self):
        self.assertEqual(pathway_of('  bachelor of   music '), 'arts_sports')

    def test_a_name_nothing_matches_defaults_to_social(self):
        self.assertEqual(pathway_of('BACHELOR OF SOMETHING ELSE'), 'social')

    def test_guidance_and_counselling_is_not_mistaken_for_dance(self):
        # Found by auditing the real programme names: "guidance" contains "dance".
        self.assertEqual(pathway_of('BACHELOR OF EDUCATION (GUIDANCE AND COUNSELLING)'), 'social')
        self.assertEqual(pathway_of('BACHELOR OF ARTS IN DANCE'), 'arts_sports')
