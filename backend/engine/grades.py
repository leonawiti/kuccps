"""
The KCSE grading scale: grades, their points, the total over a learner's best seven subjects, and the
mean grade that total converts to.

The 12-point scale (A is 12 down to E at 1) is the one used throughout the workbook and the KUCCPS and KMTC
documents. The conversion from a total to a mean grade is the KNEC table as I know it; it is **not in any of
the documents provided**, so it must be checked against KNEC's own published table before anyone relies on it.
"""
import re

# Best first. The position in this list is the grade's rank.
GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E']
GRADE_POINTS = {grade: 12 - i for i, grade in enumerate(GRADES)}

BEST_COUNT = 7  # the subjects counted in a learner's total

# (lowest total, highest total, mean grade) over the best seven subjects. TO VERIFY against KNEC.
MEAN_GRADE_BANDS = [
    (81, 84, 'A'), (74, 80, 'A-'), (67, 73, 'B+'), (60, 66, 'B'), (53, 59, 'B-'), (46, 52, 'C+'),
    (39, 45, 'C'), (32, 38, 'C-'), (25, 31, 'D+'), (18, 24, 'D'), (11, 17, 'D-'), (7, 10, 'E'),
]


class InvalidGrade(ValueError):
    """The text is not a KCSE grade."""


def parse_grade(text):
    """
    A grade as one of GRADES, from the many ways it is written: any case, spaces, and the "(plain)",
    "(minus)" and "(plus)" the KMTC and TVET documents use. `C (minus)` means C-.
    """
    if not isinstance(text, str):
        raise InvalidGrade(f'Not a grade: {text!r}')
    s = re.sub(r'\s+', '', text).upper().replace('−', '-').replace('–', '-').replace('—', '-')
    s = s.replace('(PLAIN)', '').replace('PLAIN', '')
    if '(MINUS)' in s:
        s = s.replace('(MINUS)', '')
        s = s if s.endswith('-') else s + '-'
    if '(PLUS)' in s:
        s = s.replace('(PLUS)', '')
        s = s if s.endswith('+') else s + '+'
    if s not in GRADE_POINTS:
        raise InvalidGrade(f'Not a KCSE grade: {text!r}')
    return s


def points_of(grade):
    return GRADE_POINTS[parse_grade(grade)]


def total_of_best(points, count=BEST_COUNT):
    """The total of the best `count` subjects' points. Fewer subjects than that cannot be totalled."""
    if len(points) < count:
        raise ValueError(f'At least {count} subjects are needed; {len(points)} given.')
    return sum(sorted(points, reverse=True)[:count])


def mean_grade(total):
    """The mean grade for a total over seven subjects (7 to 84)."""
    for low, high, grade in MEAN_GRADE_BANDS:
        if low <= total <= high:
            return grade
    raise ValueError(f'A total over seven subjects is between 7 and 84, not {total}.')
