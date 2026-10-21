"""
Cluster points and the choice of which subjects fill a programme's four cluster slots.

C = 48 * sqrt((r / 48) * (t / 84)), where r is the sum of the points of the four cluster subjects (at most 48)
and t is the total of the learner's best seven subjects (at most 84).
"""
import math
from dataclasses import dataclass, field
from itertools import product

from .grades import BEST_COUNT, GRADE_POINTS

CLUSTER_SLOTS = 4


def cluster_points(r, t):
    if not 4 <= r <= 48 or not 7 <= t <= 84:
        raise ValueError(f'r must be 4 to 48 and t 7 to 84; got r={r}, t={t}.')
    return round(48 * math.sqrt((r / 48) * (t / 84)), 3)


@dataclass
class Assignment:
    ok: bool
    r: int = 0
    picks: list = field(default_factory=list)  # (subject key, points) per slot, in slot order
    failed: list = field(default_factory=list)  # indexes of slots no subject satisfies
    filled: int = 0  # cluster positions topped up with the best remaining subjects


def assign_slots(points_by_subject, slots, fill=True):
    """
    Give each slot a different subject that meets its minimum grade, maximising r. If any slot cannot be
    satisfied the assignment is not ok and `failed` lists those slots. With `fill`, positions beyond the
    listed slots take the best remaining subjects.
    """
    options = []
    failed = []
    for i, slot in enumerate(slots):
        need = GRADE_POINTS[slot.min_grade]
        ok_subjects = [k for k in slot.alternatives if points_by_subject.get(k, 0) >= need]
        if not ok_subjects:
            failed.append(i)
        options.append(ok_subjects)
    if failed:
        return Assignment(ok=False, failed=failed)

    best = None
    for combo in product(*options):
        if len(set(combo)) < len(combo):
            continue
        total = sum(points_by_subject[k] for k in combo)
        if best is None or total > best[0]:
            best = (total, combo)
    if best is None:  # every combination reuses a subject: the slots cannot be filled by different subjects
        clashing = list(range(len(slots)))
        return Assignment(ok=False, failed=clashing)

    total, combo = best
    picks = [(k, points_by_subject[k]) for k in combo]
    filled = 0
    if fill:
        rest = sorted(((p, k) for k, p in points_by_subject.items() if k not in combo), reverse=True)
        extra = rest[: CLUSTER_SLOTS - len(combo)]
        total += sum(p for p, _ in extra)
        filled = len(extra)
    return Assignment(ok=True, r=total, picks=picks, filled=filled)
