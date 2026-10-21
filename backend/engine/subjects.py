"""
The KCSE subjects: their short keys, KNEC numbers, names and groups.

Keys and numbers come from the workbook's subject requirements (28 subjects), which follow the real KNEC
codes. The technical subjects numbered 444 to 450 do not appear in the workbook, so their keys here are my
own and the whole list should be checked against KNEC's. Groups: 1 compulsory, 2 sciences, 3 humanities,
4 applied and technical, 5 languages, music and business.
"""
import re
from dataclasses import dataclass


class UnknownSubject(ValueError):
    """The text names no known KCSE subject."""


@dataclass(frozen=True)
class Subject:
    key: str
    number: str
    name: str
    group: int
    in_workbook: bool = True  # False where the key is assumed, not seen in the workbook


_ROWS = [
    ('ENG', '101', 'English', 1, True), ('KIS', '102', 'Kiswahili', 1, True),
    ('MAT A', '121', 'Mathematics (Alternative A)', 1, True), ('MAT B', '122', 'Mathematics (Alternative B)', 1, True),
    ('BIO', '231', 'Biology', 2, True), ('PHY', '232', 'Physics', 2, True), ('CHE', '233', 'Chemistry', 2, True),
    ('PSC', '234', 'Physical Sciences', 2, True), ('BSC', '235', 'Biological Sciences', 2, True),
    ('GSC', '237', 'General Science', 2, True),
    ('HAG', '311', 'History and Government', 3, True), ('GEO', '312', 'Geography', 3, True),
    ('CRE', '313', 'Christian Religious Education', 3, True), ('IRE', '314', 'Islamic Religious Education', 3, True),
    ('HRE', '315', 'Hindu Religious Education', 3, True), ('SEE', '316', 'Social Education and Ethics', 3, True),
    ('HSC', '441', 'Home Science', 4, True), ('ARD', '442', 'Art and Design', 4, True), ('AGR', '443', 'Agriculture', 4, True),
    ('WWK', '444', 'Woodwork', 4, False), ('MTW', '445', 'Metalwork', 4, False),
    ('BCN', '446', 'Building Construction', 4, False), ('PMC', '447', 'Power Mechanics', 4, False),
    ('ELC', '448', 'Electricity', 4, False), ('DRD', '449', 'Drawing and Design', 4, False),
    ('AVT', '450', 'Aviation Technology', 4, False), ('CMP', '451', 'Computer Studies', 4, True),
    ('FRE', '501', 'French', 5, True), ('GER', '502', 'German', 5, True), ('ARB', '503', 'Arabic', 5, True),
    ('KSL', '504', 'Kenya Sign Language', 5, True), ('MUC', '511', 'Music', 5, True),
    ('ACC', '561', 'Accounting', 5, True), ('COM', '562', 'Commerce', 5, True), ('BST', '565', 'Business Studies', 5, True),
]

SUBJECTS = {key: Subject(key, number, name, group, seen) for key, number, name, group, seen in _ROWS}


def _squash(text):
    """Lower case, with no spaces, punctuation or the word 'and' differences, for matching."""
    return re.sub(r'[^a-z0-9]', '', str(text).lower().replace('&', 'and'))


_LOOKUP = {}
for _s in SUBJECTS.values():
    _LOOKUP[_squash(_s.key)] = _s.key
    _LOOKUP[_s.number] = _s.key
    _LOOKUP[_squash(_s.name)] = _s.key
_LOOKUP[_squash('Mathematics')] = 'MAT A'  # plain "mathematics" means Alternative A unless B is named


def subject_key(text):
    """The key (such as 'MAT A') for a subject given as a key, a number or a name."""
    if not isinstance(text, str) or not text.strip():
        raise UnknownSubject(f'No such subject: {text!r}')
    found = _LOOKUP.get(_squash(text))
    if found is None:
        raise UnknownSubject(f'No such subject: {text!r}')
    return found


def subject(text):
    return SUBJECTS[subject_key(text)]


def group_of(text):
    return subject(text).group
