"""
KMTC and TVET programmes, transcribed by hand from the two reference documents in docs/reference/:

  kmtc-courses-and-entry-points-2026-27.pdf   36 courses, 2 pages (March 2026 pre-service intake)
  tvet-cluster-document.pdf                   minimum subject requirements for TVET programmes, 6 pages

They are written by hand because the PDFs are multi-column tables that do not extract cleanly. Each entry keeps
its page and the requirement as printed (`source`) so it can be checked against the document line by line, and
catalogue/test_colleges_data.py checks the structure and some entries against the printed text.

A rule is {'subjects': [subject keys], 'grade': minimum grade, 'count': number of different subjects}. Where the
document says "C in English or Kiswahili and Biology" the grade applies to each, so that is two rules.
'*' means any subject ("two teaching subjects"). Mean grades written "C plain", "C (plain)" and "C" are all C.

Judgement calls (each is also in docs/DEVLOG.md):
  * "Economics" appears in a few lists but is not a KCSE subject we hold, so it is left out of those lists.
  * "Biology" alone (Physiotherapy) is taken literally; "Biology/Biological Sciences" is both subjects.
  * "D- and below" for artisan courses is taken as no minimum mean grade ('E').
  * A subject can count toward only one rule, so one subject cannot be used twice in the same course.
"""

ENGKIS = ['ENG', 'KIS']
BIO_ = ['BIO', 'BSC']
PHY_ = ['PHY', 'PSC']
CHE_ = ['CHE', 'PSC']          # "Chemistry/Physical Sciences"
MATH = ['MAT A', 'MAT B']
MAT_A = ['MAT A']
REL = ['CRE', 'IRE', 'HRE']


def r(subjects, grade, count=1):
    return {'subjects': list(subjects), 'grade': grade, 'count': count}


def _entry(id_, provider, name, level, category, mean, options, page, source, notes='', flags=None, section=None, audience=None):
    return {
        'id': id_, 'provider': provider, 'name': name, 'level': level, 'category': category, 'section': section,
        'audience': audience, 'min_mean': mean, 'options': options, 'page': page, 'source': source, 'notes': notes,
        'flags': flags or [],
    }


def K(n, name, level, mean, rules, source, notes='', flags=None):
    """A KMTC course. `n` is the course number printed in the document (page 1 holds 1 to 18, page 2 the rest)."""
    return _entry(f'kmtc-{n:02d}', 'kmtc', name, level, 'Health', mean, [{'label': None, 'rules': rules}],
                  1 if n <= 18 else 2, source, notes, flags)


KMTC = [
    K(1, 'Certificate in Community Health Assistant', 'certificate', 'C-',
      [r(ENGKIS, 'D+'), r(BIO_, 'D'), r(MATH + ['CHE', 'PHY', 'PSC', 'AGR', 'HSC'], 'D')],
      'Mean Grade C-, D+ in English or Kiswahili. D in Biology/Biological Sciences. D in any of the following: Mathematics, Chemistry, Physics/Physical Sciences, Agriculture, Home Science'),
    K(2, 'Certificate in Community Health Nursing', 'certificate', 'C-',
      [r(ENGKIS, 'C-'), r(BIO_, 'C-'), r(['CHE', 'PHY', 'PSC'] + MATH, 'D+')],
      'Mean Grade C-, C- in English or Kiswahili and Biology/Biological Sciences. D+ in any one of the following: Chemistry, Physics/Physical Science, Mathematics'),
    K(3, 'Certificate in Emergency Medical Technician', 'certificate', 'C-',
      [r(BIO_, 'D')],
      'Mean Grade of C-, D (Plain) in Biology/Biological Sciences'),
    K(4, 'Certificate in Health Records and Information Technology', 'certificate', 'C-',
      [r(ENGKIS, 'C-'), r(BIO_, 'D'), r(MATH, 'D-'), r(PHY_ + ['CHE', 'GSC', 'CMP', 'AGR', 'HSC', 'GEO', 'COM', 'BST'], 'D+')],
      'Mean Grade C-, C- in English or Kiswahili and D in Biology/Biological Sciences. D- in Mathematics and D+ in any one of the following: Physics/Physical Sciences, Chemistry, General Science, Computer Studies, Agriculture, Home Science, Economics, Geography, Commerce and Business Studies',
      notes='Economics is listed in the source but is not a KCSE subject we hold, so it is left out.'),
    K(5, 'Certificate in Medical Engineering', 'certificate', 'D+',
      [r(ENGKIS, 'D+'), r(MATH, 'D'), r(['PHY', 'CHE', 'BIO', 'PSC', 'BSC'], 'D-')],
      'Mean grade D+, D+ in English/Kiswahili and D in Mathematics. D- in any one of the following: Physics/Chemistry/Biology/Physical Sciences/Biological Sciences'),
    K(6, 'Certificate in Nutrition and Dietetics', 'certificate', 'D+',
      [r(ENGKIS, 'D+'), r(BIO_, 'D'), r(['HSC', 'PHY', 'AGR', 'GSC'] + MATH, 'D')],
      'Mean Grade D+, D+ in English or Kiswahili and D in Biology/Biological Sciences. D in any one of the following: Home Science, Physics, Agriculture, Mathematics, General Science'),
    K(7, 'Certificate in Orthopedic Trauma Medicine', 'certificate', 'C-',
      [r(ENGKIS, 'C-'), r(BIO_, 'C-'), r(PHY_ + ['CHE', 'MTW', 'DRD', 'HSC', 'AGR', 'CMP'] + MATH, 'D+')],
      'Mean Grade C-, C- In English or Kiswahili, and C- in Biology/Biological Sciences. D+ in any one of the following: Physics, Physical sciences, Mathematics, Chemistry, Metal Work, Technical Drawing, Home Science, Agriculture and Computer studies'),
    K(8, 'Certificate in Health Insurance Management', 'certificate', 'D+',
      [r(ENGKIS, 'D+'), r(BIO_, 'D'), r(['HSC', 'PHY', 'CHE', 'AGR', 'BCN', 'DRD', 'ELC', 'WWK'], 'D')],
      'Mean Grade of D+ (plus) and D+ (plus) in English/Kiswahili. D in Biology/Biological Sciences. D in any one of the following: Home Science, Physics, Chemistry, Agriculture, Building Construction, Technical Drawing, Electricity or Wood Work',
      notes='Marked (NEW) in the document.'),
    K(9, 'Certificate in Public Health', 'certificate', 'C-',
      [r(ENGKIS, 'C-'), r(BIO_, 'C-'), r(['PHY', 'CHE', 'PSC'] + MATH, 'D')],
      'Mean Grade C-, C- in English or Kiswahili. C- in Biology/Biological Sciences. D in any one of the following: Physics, Chemistry, Mathematics, Physical Science'),
    K(10, 'Diploma in Community Health', 'diploma', 'C',
      [r(ENGKIS, 'C-'), r(BIO_, 'D+'), r(MATH + ['CHE', 'HSC', 'AGR', 'PHY', 'PSC'], 'D')],
      'Mean Grade of C (Plain), C- in English or Kiswahili, D+ in Biology/Biological Sciences. D in any one of the following: Mathematics, Chemistry, Home science, Agriculture, Physics or Physical Science'),
    K(11, 'Diploma in Community Health Nursing', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C'), r(['CHE', 'PHY', 'PSC'] + MATH, 'C-')],
      'Mean Grade C, C in English or Kiswahili and Biology/Biological Sciences. C- in any one of the following: Chemistry, Physics/Physical Science, Mathematics'),
    K(12, 'Diploma in Registered Nursing', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C'), r(['CHE', 'PHY', 'PSC'] + MATH, 'C-')],
      'Mean Grade C, C in English or Kiswahili and Biology/Biological Sciences. C- in any one of the following: Chemistry, Physics/Physical Science, Mathematics'),
    K(13, 'Diploma in Kenya Registered Nursing Mental Health & Psychiatry', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C'), r(['CHE', 'PHY', 'PSC'] + MATH, 'C-')],
      'Mean Grade C, C in English or Kiswahili and Biology/Biological Sciences. C- in any one of the following: Chemistry, Physics/Physical Science, Mathematics'),
    K(14, 'Diploma in Community Oral Health', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C'), r(PHY_ + ['CHE'] + MATH, 'C-', count=2)],
      'Mean Grade C, C in English or Kiswahili and Biology/Biological Sciences. C- in any two of the following: Physics/Physical Sciences, Chemistry, Mathematics'),
    K(15, 'Diploma in Dental Technology', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(PHY_ + ['CHE'], 'C'), r(BIO_, 'C-'), r(['MTW', 'PHY', 'PSC', 'CHE'] + MATH, 'C-')],
      'Mean Grade C, C in English or Kiswahili and Physics/Physical Sciences or Chemistry. C- in Biology/Biological Sciences and in any one of the following: Metal Work, Physics, Physical Science, Chemistry, Mathematics',
      notes='The one-of list can only be met by a subject not already used for the Physics/Physical Sciences or Chemistry rule.'),
    K(16, 'Diploma in Emergency Medical Technology', 'diploma', 'C',
      [r(BIO_, 'D+')],
      'Mean Grade of C (plain), D+ in Biology/Biological Sciences'),
    K(17, 'Diploma in Health Counselling', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'D+'), r(REL + ['HAG'], 'C-')],
      'Mean Grade C, C in English or Kiswahili and D+ in Biology/Biological Sciences. C- in any one of the following: Religious Studies or History'),
    K(18, 'Diploma in Health Promotion', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C-'), r(MATH + PHY_ + ['CHE'], 'D+')],
      'Mean Grade C, C in English or Kiswahili and C- in Biology/Biological Sciences. D+ in any one of the following: Mathematics, Physics/Physical Sciences, Chemistry'),
    K(19, 'Diploma in Health Records and Information Technology', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(MATH, 'C-'), r(BIO_, 'D+'), r(PHY_ + ['CHE', 'CMP', 'AGR', 'HSC', 'GEO', 'COM', 'BST'], 'C-')],
      'Mean Grade C, C in English or Kiswahili and C- in Mathematics. D+ in Biology/Biological Sciences. C- in any one of the following: Physics/Physical Sciences, Chemistry, Computer Studies, Agriculture, Home Science, Economics, Geography, Commerce, Business Studies',
      notes='Economics is listed in the source but is not a KCSE subject we hold, so it is left out.'),
    K(20, 'Diploma in Kenya Registered Nursing & Midwifery', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C'), r(['CHE'] + PHY_ + MATH, 'C-')],
      'Mean Grade C, C in English or Kiswahili and Biology/Biological Sciences. C- in any one of the following: Chemistry or Physics/Physical Science or Mathematics'),
    K(21, 'Diploma in Medical Engineering', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(MATH, 'C-'), r(PHY_, 'C-'), r(BIO_ + ['CHE', 'ELC', 'MTW', 'DRD'], 'D+')],
      'Mean Grade C, C in English or Kiswahili and C- in Mathematics and Physics/Physical Sciences. D+ in any one of the following: Biology/Biological Sciences, Chemistry, Electricity, Metal Work, Technical Drawing'),
    K(22, 'Diploma in Medical Laboratory Sciences', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C'), r(CHE_, 'C'), r(PHY_ + MATH, 'C')],
      'Mean Grade C, C in English or Kiswahili and Biology/Biological Sciences and Chemistry/Physical Sciences. C in any one of the following: Physics/Physical Sciences, Mathematics'),
    K(23, 'Diploma in Medical Social Work', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'D+'), r(['CHE'] + PHY_ + MATH + ['HSC', 'AGR', 'BST', 'GEO', 'HAG', 'CRE', 'IRE'], 'C-')],
      'Mean Grade C, C in English or Kiswahili and D+ in Biology/Biological Sciences. C- in any one of the following: Chemistry, Physics/Physical Sciences, Mathematics, Home Science, Agriculture, Business Studies and Geography, History, CRE and IRE'),
    K(24, 'Diploma in Occupational Therapy', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C-'), r(PHY_ + ['CHE'] + MATH + ['AGR', 'HSC'], 'C-')],
      'Mean Grade C, C in English or Kiswahili and C- in Biology/Biological Sciences. C- in any one of the following: Physics/Physical Sciences, Chemistry, Mathematics, Agriculture, Home Science'),
    K(25, 'Diploma in Optometry', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(MATH, 'C'), r(BIO_, 'C-'), r(PHY_, 'C-')],
      'Mean Grade C, C in English or Kiswahili and Mathematics. C- in the following: Biology/Biological Sciences, Physics/Physical Sciences',
      notes='"C- in the following" is read as C- in Biology/Biological Sciences and C- in Physics/Physical Sciences (both).'),
    K(26, 'Diploma in Orthopedic Technology', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C'), r(['PSC', 'CHE', 'WWK', 'MTW', 'DRD', 'PHY'] + MATH, 'C-', count=2)],
      'Mean Grade C, C in English or Kiswahili and C in Biology/Biological Sciences. C- (Minus) in any two (2) of the following; Physical Science, Chemistry, Woodwork, Metalwork, Technical Drawing, Physics and Mathematics'),
    K(27, 'Diploma in Orthopedic and Trauma Medicine', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C'), r(PHY_ + ['CHE'] + MATH, 'C-')],
      'Mean Grade C, C in English or Kiswahili, C in Biology/Biological Sciences. C- in any one of the following: Physics/Physical Sciences, Chemistry, Mathematics'),
    K(28, 'Diploma in Pharmacy', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(CHE_, 'C'), r(BIO_, 'C'), r(PHY_ + MATH, 'C')],
      'Mean Grade C, C in English or Kiswahili and Chemistry/Physical Science and Biology or Biological Sciences. C in any one of the following: Physics/Physical Sciences or Mathematics'),
    K(29, 'Diploma in Physiotherapy', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(['BIO'], 'C-'), r(['CHE'] + MATH + PHY_, 'C-', count=2)],
      'Mean Grade C, C in English or Kiswahili and C- in Biology. C- in any two of the following: Chemistry, Mathematics, Physics/Physical Sciences',
      notes='The source says "Biology" only here (not "Biology/Biological Sciences"), so Biological Sciences is not accepted.'),
    K(30, 'Diploma in Public Health', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C'), r(MATH, 'C-'), r(PHY_ + ['CHE'], 'C-')],
      'Mean Grade C, C in English or Kiswahili and Biology/Biological Sciences. C- in Mathematics and any one of the following: Physics/Physical Sciences, Chemistry'),
    K(31, 'Diploma in Radiography & Imaging', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(PHY_, 'C'), r(BIO_, 'C'), r(MATH + ['CHE'], 'C-')],
      'Mean Grade C, C in English or Kiswahili and Physics/Physical Sciences and Biology/Biological Sciences. C- in any one of the following: Mathematics, Chemistry'),
    K(32, 'Diploma in Nutrition and Dietetics', 'diploma', 'C-',
      [r(ENGKIS, 'D+'), r(BIO_, 'D+'), r(CHE_, 'D+'), r(['HSC', 'AGR'] + MATH + PHY_ + ['GSC'], 'D')],
      'Mean Grade C-, D+ in English or Kiswahili and D+ in Biology/Biological Sciences. D+ in Chemistry/Physical Science. D in any one of the following: Home Science, Agriculture, Mathematics, Physics, Physical Sciences, General Science'),
    K(33, 'Diploma in Clinical Medicine & Surgery', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(BIO_, 'C'), r(CHE_, 'C-'), r(MATH + ['PHY'], 'C-')],
      'Mean Grade C, C in English or Kiswahili and Biology/Biological Sciences. C- in Chemistry/Physical Sciences. C- in any one of the following Mathematics, Physics'),
    K(34, 'Diploma in Speech and Language Therapy', 'diploma', 'C',
      [r(ENGKIS, 'C-'), r(BIO_, 'C-'), r(['PHY', 'CHE'] + MATH, 'C-')],
      'Mean Grade C plain and C- in English or Kiswahili. C- in Biology/Biological Sciences, C- in any one of the following; Physics, Chemistry, Mathematics'),
    K(35, 'Diploma in Health Insurance Management', 'diploma', None,
      [r(ENGKIS, 'C'), r(BIO_, 'D+'), r(MATH, 'D+'), r(PHY_ + ['CHE', 'GSC', 'GEO', 'HSC', 'AGR', 'CMP', 'COM', 'BST'], 'D+')],
      'C plain in English/Kiswahili. D+ in Biology/Biological Sciences. D+ in Mathematics. D+ in Physics, Chemistry, Physical Science, General Science, Geography, Economics, Home Science, Agriculture, Computer Studies, Commerce, Business Studies',
      notes='The source prints no mean grade for this course. Economics is listed but is not a KCSE subject we hold, so it is left out.'),
    K(36, 'Diploma in Mortuary Science', 'diploma', 'C-',
      [],
      'Mean Grade C-(Minus)',
      notes='The source prints a mean grade and no subject requirements for this course.',
      flags=['no_subject_rules_listed']),
]
