"""
TVET programmes from tvet-cluster-document.pdf ("Minimum Subject Requirements for TVET Programmes", 6 pages).
See colleges_data.py for how entries are written and the judgement calls made.

The printed table has three blocks, which are kept as `section`:
  General              pages 1 to 3, categories 1 to 14 (the heading row is not repeated on these pages)
  KNEC examination     page 4, categories 1 to 9 (the heading sits at the foot of page 3), and the avionics row on page 5
  Internal examiners   pages 5 and 6
The placement of the first heading is read from the layout of the page, not stated in words.
"""
from .colleges_data import BIO_, CHE_, ENGKIS, MAT_A, MATH, PHY_, _entry, r

GENERAL = 'General'
KNEC = 'KNEC examination'
INTERNAL = 'Internal examiners'

_LEVEL_LABEL = {'diploma': 'Diploma', 'certificate': 'Certificate', 'artisan': 'Artisan'}


def T(category, level, mean, rules, page, section, source, label=None, options=None, name=None, audience=None, notes='', flags=None):
    """One TVET programme at one level. `options` replaces `rules` where the document gives Alternative A and B."""
    slug = (name or category).lower().replace('&', 'and')
    slug = ''.join(c if c.isalnum() else '-' for c in slug).strip('-')
    slug = '-'.join(p for p in slug.split('-') if p)
    suffix = f'-{label.lower().replace(" ", "-")}' if label else ''
    opts = options if options is not None else [{'label': None, 'rules': rules}]
    return _entry(f'tvet-{slug}-{level}{suffix}', 'tvet', name or category, level, category, mean, opts, page, source,
                  notes=notes, flags=flags, section=section, audience=audience)


def levels(category, page, section, diploma, certificate, artisan=None, name=None):
    """Diploma, certificate and (optionally) artisan entries with no subject requirements, as printed 'None'."""
    out = [
        T(category, 'diploma', diploma, [], page, section, f'Diploma | {_mean_text(diploma)} | None', name=name),
        T(category, 'certificate', certificate, [], page, section, f'Certificate | {_mean_text(certificate)} | None', name=name),
    ]
    if artisan:
        out.append(T(category, 'artisan', 'E', [], page, section, 'Artisan | D- (minus) and below | None', name=name,
                     notes='Printed as "D- (minus) and below". Read as no minimum mean grade; the course is aimed at lower grades '
                           'but the document does not bar a higher grade.'))
    return out


def _mean_text(mean):
    return {'C': 'C (plain)', 'C-': 'C- (minus)', 'D': 'D (plain)', 'D+': 'D+'}.get(mean, mean)


_ANY_TWO_TEACHING = lambda grade: r(['*'], grade, count=2)  # noqa: E731  "<grade> in two teaching subjects"

TVET = [
    # ---- General, page 1 ----
    T('Law', 'diploma', 'C', [r(ENGKIS, 'C+')], 1, GENERAL, 'Diploma | C plain | ENG/KIS - C+'),
    T('Law', 'certificate', 'C-', [r(ENGKIS, 'C')], 1, GENERAL, 'Certificate | C- (minus) | ENG/KIS - C(plain)'),
    T('Education', 'diploma', 'C+', [r(['ENG'], 'C'), r(MATH, 'C'), _ANY_TWO_TEACHING('C+')], 1, GENERAL,
      'Diploma | C+ | Science Based Courses: ENG - C (plain), MATH - C (plain), C+ in two teaching subjects',
      name='Education (science based courses)'),
    T('Education', 'diploma', 'C+', [r(['ENG'], 'C'), r(MATH, 'D+'), _ANY_TWO_TEACHING('C+')], 1, GENERAL,
      'Diploma | C+ | Non-Science Based Courses: ENG - C (plain), MATH - D+, C+ in two teaching subjects',
      name='Education (non-science based courses)'),
    T('Education', 'diploma', 'C', [r(['ENG'], 'C-'), r(MATH, 'C-'), _ANY_TWO_TEACHING('C')], 1, GENERAL,
      'Diploma for Visually and Hearing Impaired Applicants | C (plain) | (Science Based Courses) ENG - C- (Minus), MATH - C- (minus), C (plain) in two teaching subjects',
      name='Education (science based courses, visually or hearing impaired applicants)', audience='visually_or_hearing_impaired'),
    T('Education', 'diploma', 'C', [r(['ENG'], 'C-'), r(MATH, 'D'), _ANY_TWO_TEACHING('C')], 1, GENERAL,
      'Diploma for Visually and Hearing Impaired Applicants | C (plain) | (Non-Science Based Courses) ENG - C- (Minus), MATH - D (plain), C (plain) in two teaching subjects',
      name='Education (non-science based courses, visually or hearing impaired applicants)', audience='visually_or_hearing_impaired'),
    T('Accountancy', 'diploma', 'C-', [], 1, GENERAL, 'Diploma | C- (minus) | None'),
    T('Accountancy', 'certificate', 'D', [], 1, GENERAL, 'Certificate | D(plain) | None'),
    T('Architecture', 'diploma', 'C', [r(MAT_A, 'C'), r(['PHY'], 'C'), r(ENGKIS, 'C')], 1, GENERAL,
      'Diploma | C (plain) | MATH Alternative A - C (plain), PHY - C (plain), ENG/KIS - C (plain)'),
    T('Architecture', 'certificate', 'C-', [r(MATH, 'C-'), r(['PHY'], 'C-'), r(ENGKIS, 'C-')], 1, GENERAL,
      'Certificate | C- (minus) | MATH - C- (minus), PHY - C- (minus), ENG/KIS - C- (minus)'),
    T('Quantity Survey', 'diploma', 'C', [r(MAT_A, 'C'), r(['PHY'], 'C'), r(ENGKIS, 'C')], 1, GENERAL,
      'Diploma | C (plain) | MATH Alternative A - C (plain), PHY - C (plain), ENG/KIS - C (plain)'),
    # ---- General, page 2 ----
    T('Quantity Survey', 'certificate', 'C-', [r(MATH, 'C-'), r(['PHY'], 'C-'), r(ENGKIS, 'C-')], 2, GENERAL,
      'Certificate | C- (minus) | MATH - C- (minus), PHY - C- (minus), ENG/KIS - C- (minus)',
      notes='This row starts page 2 with no category printed; it continues Quantity Survey from page 1.'),
    T('Engineering, Engineering Technology', 'diploma', 'C-', [], 2, GENERAL, 'Diploma | C- (minus) | None'),
    T('Engineering, Engineering Technology', 'certificate', 'D+', [], 2, GENERAL, 'Certificate | D+ | None'),
    T('Pharmacy', 'diploma', 'C', None, 2, GENERAL,
      'Diploma | C (plain) | Alternative A: CHE - C, BIO - C, MATH/PHY - C, ENG/KIS - C. Alternative B: Biological Sciences - C, Physical Sciences - C, MATH - C, ENG/KIS - C',
      options=[
          {'label': 'Alternative A', 'rules': [r(['CHE'], 'C'), r(['BIO'], 'C'), r(MATH + ['PHY'], 'C'), r(ENGKIS, 'C')]},
          {'label': 'Alternative B', 'rules': [r(['BSC'], 'C'), r(['PSC'], 'C'), r(MATH, 'C'), r(ENGKIS, 'C')]},
      ]),
    T('Environmental Health', 'diploma', 'C', [r(ENGKIS, 'C'), r(BIO_, 'C'), r(CHE_, 'C-'), r(MAT_A, 'C-')], 2, GENERAL,
      'Diploma | C (plain) | ENG/KIS - C (plain), BIO/Biological Sciences - C (plain), CHE/Physical Sciences - C- (minus), MATH Alternative A - C- (minus)'),
    T('Environmental Health', 'certificate', 'C-', [r(ENGKIS, 'C-'), r(BIO_, 'C-'), r(['PHY', 'CHE', 'HSC', 'AGR', 'GSC'] + MATH, 'D+')], 2, GENERAL,
      'Certificate | C- (minus) | ENG/KIS - C- (minus), BIO/Biological Sciences - C- (minus), PHY/CHE/MATH/HSC/AGRIC/GSC - D+'),
    T('Nursing', 'diploma', 'C', [r(BIO_, 'C'), r(ENGKIS, 'C'), r(PHY_ + ['CHE'] + MATH, 'C-')], 2, GENERAL,
      'Diploma | C (plain) | BIO/Biological Sciences - C (plain), ENG/KIS - C (plain), PHY/Physical Sciences/CHE/MATH - C- (minus)'),
    T('Nursing', 'certificate', 'C-', [r(BIO_, 'C-'), r(ENGKIS, 'C-'), r(PHY_ + ['CHE'] + MATH, 'D+')], 2, GENERAL,
      'Certificate | C - (minus) | BIO/Biological Sciences - C - (minus), ENG/KIS - C - (minus), PHY/Physical Sciences/CHE/MATH - D+'),
    T('Animal Health', 'diploma', 'C', [r(['BIO'], 'C'), r(['CHE'], 'C-'), r(MATH + ['PHY', 'AGR'], 'C-')], 2, GENERAL,
      'Diploma | C (plain) | BIO - C (plain), CHE - C- (minus), MATH/PHY/AGRIC - C- (minus)'),
    T('Animal Health', 'certificate', 'C-', [r(['BIO'], 'C-')], 2, GENERAL,
      'Certificate | C- (minus) | BIO - C- (minus)',
      notes='The printed row is cut off at the bottom of page 2 and shows only the Biology line. The Diploma row above has more '
            'subject lines, so this certificate probably has them too. Confirm with KUCCPS.',
      flags=['incomplete_source']),
    # ---- General, page 3 ----
    T('Medical Laboratory Science', 'diploma', 'C', [r(ENGKIS, 'C'), r(MATH + ['PHY'], 'C'), r(['BIO'], 'C'), r(['CHE'], 'C')], 3, GENERAL,
      'Diploma | C (plain) | ENG/KIS - C (plain), MATH/PHY - C (plain), BIO - C (plain), CHE - C (plain)'),
    T('Nutrition & Dietetics', 'diploma', 'C-', [r(CHE_, 'D+'), r(BIO_, 'D+'), r(ENGKIS, 'D+'), r(['PHY', 'HSC', 'AGR', 'GSC'] + MATH, 'D')], 3, GENERAL,
      'Diploma | C- (minus) | CHE/Physical Sciences - D+, BIO/Biological Sciences - D+, ENG/KIS - D+, PHY/MATH/HSC/AGRIC/GSC - D (plain)'),
    T('Nutrition & Dietetics', 'certificate', 'D', [r(CHE_, 'D'), r(BIO_, 'D'), r(ENGKIS, 'D'), r(['PHY', 'HSC', 'AGR', 'GSC'] + MATH, 'D')], 3, GENERAL,
      'Certificate | D (plain) | CHE/Physical Sciences - D (plain), BIO/Biological Sciences - D (plain), ENG/KIS - D (plain), PHY/MATH/HSC/AGRIC/GSC - D (plain)'),
    T('Land Surveying', 'diploma', 'C-', [r(['ENG'], 'C-'), r(MAT_A, 'C-'), r(['PHY'], 'C-')], 3, GENERAL,
      'Diploma | C- (minus) | ENG - C- (minus), MATH Alternative A - C- (minus), PHY - C- (minus)'),
    T('Land Surveying', 'certificate', 'D', [], 3, GENERAL, 'Certificate | D (plain) | None'),
    T('Clinical Medicine and Surgery and Community Health', 'diploma', 'C', None, 3, GENERAL,
      'Diploma (Alternative A) | C (plain) | ENG/KIS - C, BIO - C, CHE - C-, MATH/PHY - C-. Diploma (Alternative B) | ENG/KIS - C, Biological Sciences - C, Physical Sciences - C-, MATH - C-',
      options=[
          {'label': 'Alternative A', 'rules': [r(ENGKIS, 'C'), r(['BIO'], 'C'), r(['CHE'], 'C-'), r(MATH + ['PHY'], 'C-')]},
          {'label': 'Alternative B', 'rules': [r(ENGKIS, 'C'), r(['BSC'], 'C'), r(['PSC'], 'C-'), r(MATH, 'C-')]},
      ]),
    T('Health Records and Information Technology', 'diploma', 'C',
      [r(ENGKIS, 'C'), r(MATH, 'C-'), r(BIO_, 'D+'), r(['PHY', 'CHE', 'CMP', 'AGR', 'HSC', 'GEO', 'COM', 'BST'], 'C-')], 3, GENERAL,
      'Diploma | C (plain) | ENG/KIS - C (plain), MATH A/MAT B - C- (minus), BIO/BSC - D+, PHY/CHE/COMP/AGR/HSC/ECON/GEO/COM/BST - C- (minus)',
      notes='ECON is listed in the source but is not a KCSE subject we hold, so it is left out.'),
    T('Health Records and Information Technology', 'certificate', 'C-',
      [r(ENGKIS, 'C-'), r(MATH, 'D'), r(BIO_, 'D'), r(['PHY', 'CHE', 'CMP', 'AGR', 'HSC', 'GEO', 'COM', 'BST'], 'D+')], 3, GENERAL,
      'Certificate | C- (minus) | ENG/KIS - C- (minus), MATH A/MAT B - D (plain), BIO/BSC - D (plain), PHY/CHE/COMP/AGR/HSC/ECON/GEO/COM/BST - D+',
      notes='ECON is listed in the source but is not a KCSE subject we hold, so it is left out.'),
    # ---- KNEC examination, page 4 (no subject requirements) ----
    *levels('Business courses', 4, KNEC, 'C-', 'D', artisan=True),
    *levels('Humanities (Social Sciences)', 4, KNEC, 'C-', 'D', artisan=True),
    *levels('Computing', 4, KNEC, 'C-', 'D', artisan=True),
    *levels('Tourism and Hotel Management', 4, KNEC, 'C-', 'D', artisan=True),
    *levels('Clothing & Textile', 4, KNEC, 'C-', 'D', artisan=True),
    *levels('Applied Biology', 4, KNEC, 'C-', 'D', artisan=True),
    *levels('Applied Chemistry', 4, KNEC, 'C-', 'D', artisan=True),
    *levels('Analytical Chemistry', 4, KNEC, 'C-', 'D', artisan=True),
    *levels('Agricultural Courses', 4, KNEC, 'C-', 'D', artisan=True),
    *levels('Natural Resources (Geology, Petroleum, Nautical Sciences, Fisheries and Aquatic Sciences)', 4, KNEC, 'C-', 'D', artisan=True),
    T('Aeronautical Engineering (Airframes and Engines)', 'diploma', 'C', [r(MAT_A, 'C-'), r(['ENG'], 'C-'), r(['PHY'], 'C-')], 4, KNEC,
      'Diploma | C (plain) | MATH Alternative A - C- (minus), ENG - C - (minus), PHY - C - (minus)'),
    T('Aeronautical Engineering (Avionics)', 'diploma', 'C', [r(MAT_A, 'C-'), r(['ENG'], 'C-'), r(['PHY'], 'C-')], 5, KNEC,
      'Diploma | C (plain) | MATH Alternative A - C- (minus), ENG - C - (minus), PHY - C - (minus)'),
    # ---- Internal examiners, pages 5 and 6 ----
    T('Photogrammetry & Remote Sensing', 'diploma', 'C-', [r(['ENG'], 'C-'), r(MAT_A, 'C-'), r(['PHY'], 'C-')], 5, INTERNAL,
      'Diploma | C - (minus) | ENG - C- (minus), MATH Alternative A - C- (minus), PHY - C- (minus)'),
    T('Cartography', 'diploma', 'C-', [r(['ENG'], 'C-'), r(MAT_A, 'C-'), r(['GEO'], 'C-')], 5, INTERNAL,
      'Diploma | C - (minus) | ENG - C- (minus), MATH Alternative A - C- (minus), GEO - C- (minus)'),
    T('Map Reproduction (Printing)', 'diploma', 'C-', [r(['ENG'], 'C-'), r(MAT_A, 'C-'), r(['CHE'], 'C-')], 5, INTERNAL,
      'Diploma | C - (minus) | ENG - C- (minus), MATH Alternative A - C- (minus), CHE - C- (minus)'),
    T('Forestry', 'certificate', 'D+', [r(MAT_A, 'D+'), r(['BIO', 'PHY', 'CHE', 'AGR'], 'C-', count=2), r(ENGKIS, 'C-')], 5, INTERNAL,
      'Certificate | D+ (plus) | MATH Alternative A - D+, BIO/PHY/CHE/AGRIC - C- (minus), BIO/PHY/CHE/AGRIC - C- (minus), ENG/KIS - C- (minus)',
      notes='The two BIO/PHY/CHE/AGRIC lines are the same list, so two different subjects from it are needed.'),
    T('Tax Administration', 'diploma', 'C', [r(['ENG'], 'C-'), r(MAT_A, 'C-')], 5, INTERNAL,
      'Diploma | C (plain) | ENG - C- (minus), MATH Alternative A - C- (minus)'),
    T('Tax Administration', 'certificate', 'C-', [r(['ENG'], 'D+'), r(MAT_A, 'D+')], 5, INTERNAL,
      'Certificate | C- (minus) | ENG - D+, MATH Alternative A - D+'),
    T('Customs Administration', 'diploma', 'C', [r(['ENG'], 'C-'), r(MAT_A, 'C-')], 5, INTERNAL,
      'Diploma | C (plain) | ENG - C- (minus), MATH Alternative A - C- (minus)'),
    T('Customs Administration', 'certificate', 'C-', [r(['ENG'], 'D+'), r(MAT_A, 'D+')], 5, INTERNAL,
      'Certificate | C - (minus) | ENG - D+, MATH Alternative A - D+'),
    T('Agricultural Irrigation and Drainage Engineering', 'diploma', 'C-',
      [r(ENGKIS, 'D'), r(MAT_A, 'D'), r(['PHY', 'CHE'], 'D'), r(['BIO', 'GEO', 'HSC', 'AGR', 'BST'], 'C-')], 6, INTERNAL,
      'Diploma | C - (minus) | ENG / KIS - D (plain), MAT A - D (plain), PHY/CHE - D (plain), BIO/GEO/HSC/AGR/BST - C- (minus)'),
]
