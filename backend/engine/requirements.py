"""
Reading the subject requirements in the workbook: up to four "slots", each written `CODE(num)/CODE(num):GRADE`.

A slot is satisfied by one subject out of its alternatives, at or above the minimum grade. The workbook's cells
are messy (line breaks inside codes, cells cut off, grades missing); anything that cannot be read with
certainty is refused with BadRequirement so the catalogue builder can report it instead of guessing.
"""
import re
from dataclasses import dataclass

from .grades import InvalidGrade, parse_grade
from .subjects import SUBJECTS, UnknownSubject, subject_key

MAX_SLOTS = 4


class BadRequirement(ValueError):
    """A requirement cell that cannot be read with certainty."""


@dataclass(frozen=True)
class Slot:
    alternatives: tuple  # subject keys, any one of which satisfies the slot
    min_grade: str


_PART = re.compile(r'^(?P<code>[A-Z]+[AB]?)\((?P<number>\d{3})\)$')


def parse_slot(text):
    if not isinstance(text, str) or not text.strip():
        raise BadRequirement('Empty requirement cell')
    s = re.sub(r'\s+', '', text).upper()
    if s.count(':') != 1:
        raise BadRequirement(f'Expected one grade after a colon: {text!r}')
    subjects_part, grade_part = s.split(':')
    if not grade_part:
        raise BadRequirement(f'No minimum grade: {text!r}')
    try:
        grade = parse_grade(grade_part)
    except InvalidGrade as e:
        raise BadRequirement(str(e)) from e

    keys = []
    for part in subjects_part.split('/'):
        m = _PART.match(part)
        if not m:
            raise BadRequirement(f'Cannot read subject {part!r} in {text!r}')
        try:
            key = subject_key(m.group('code'))
        except UnknownSubject as e:
            raise BadRequirement(f'Unknown subject in {text!r}') from e
        if SUBJECTS[key].number != m.group('number'):
            raise BadRequirement(f'Code {part!r} does not match {key} ({SUBJECTS[key].number})')
        keys.append(key)
    return Slot(tuple(keys), grade)


def parse_requirements(cells):
    """The slots from a programme's (up to four) requirement cells; empty cells are skipped."""
    slots = [parse_slot(c) for c in cells if isinstance(c, str) and c.strip()]
    if len(slots) > MAX_SLOTS:
        raise BadRequirement(f'More than {MAX_SLOTS} slots')
    return slots
