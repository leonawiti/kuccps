"""
Eligibility for KMTC and TVET (diploma, certificate and artisan) programmes.

Unlike degrees, these have no cut-off points: a learner is eligible when their KCSE mean grade reaches the
programme's minimum and each of its subject-grade rules is met by a *different* subject. So the answer is
"eligible", "near" (everything would be met if every minimum were one grade lower) or "not eligible", with the
exact shortfalls listed. Entries are plain dicts (see catalogue/colleges_data.py).

A rule is {'subjects': [keys], 'grade': minimum, 'count': how many different subjects from the list}. The
subject '*' stands for any subject (used for "two teaching subjects"). An entry can offer several `options`
(for example Alternative A and Alternative B): meeting any one of them is enough.
"""
from .cluster import assign_slots
from .grades import GRADES, GRADE_POINTS, mean_grade
from .requirements import Slot
from .subjects import SUBJECTS

STATUS_ORDER = {'eligible': 0, 'near': 1, 'not_eligible': 2}
LEVEL_ORDER = {'diploma': 0, 'certificate': 1, 'artisan': 2}


def lower_grade(grade):
    """The grade one step below (A to A-, D- to E); E stays E."""
    return GRADES[min(GRADES.index(grade) + 1, len(GRADES) - 1)]


def _subjects(rule):
    return list(SUBJECTS) if rule['subjects'] == ['*'] else rule['subjects']


def _slots(rules, relax):
    slots = []
    for rule in rules:
        grade = rule['grade']
        for _ in range(relax):
            grade = lower_grade(grade)
        slots.extend(Slot(tuple(_subjects(rule)), grade) for _ in range(rule.get('count', 1)))
    return slots


def _meets(rules, points, relax):
    return assign_slots(points, _slots(rules, relax), fill=False).ok


def _unmet_rules(rules, points):
    """The rules that fall short, as readable shortfalls. A subject can count only once, so when every rule is
    met on its own but they cannot all be met together, that clash is reported instead."""
    unmet = []
    for rule in rules:
        need = GRADE_POINTS[rule['grade']]
        qualifying = [k for k in _subjects(rule) if points.get(k, 0) >= need]
        if len(qualifying) < rule.get('count', 1):
            unmet.append({'kind': 'subject', 'alternatives': list(rule['subjects']), 'min_grade': rule['grade'],
                          'count': rule.get('count', 1)})
    if not unmet and not _meets(rules, points, 0):
        unmet.append({'kind': 'overlap'})
    return unmet


def _mean_ok(min_mean, mean, relax):
    if min_mean is None:
        return True
    need = min_mean
    for _ in range(relax):
        need = lower_grade(need)
    return GRADE_POINTS[mean] >= GRADE_POINTS[need]


def evaluate_college(entry, learner):
    mean = mean_grade(learner.total)
    min_mean = entry['min_mean']
    warnings = list(entry.get('flags') or [])
    if min_mean is None and 'mean_grade_not_stated' not in warnings:
        warnings.append('mean_grade_not_stated')

    mean_ok = _mean_ok(min_mean, mean, 0)
    chosen = None
    for option in entry['options']:
        rules = option['rules']
        ok = _meets(rules, learner.points, 0)
        unmet = [] if ok else _unmet_rules(rules, learner.points)
        candidate = {'label': option.get('label'), 'ok': ok, 'unmet': unmet,
                     'near': ok or _meets(rules, learner.points, 1)}
        if chosen is None or (candidate['ok'] and not chosen['ok']) or (
                not chosen['ok'] and (candidate['near'], -len(candidate['unmet'])) > (chosen['near'], -len(chosen['unmet']))):
            chosen = candidate
        if candidate['ok']:
            break

    unmet = []
    if not mean_ok:
        unmet.append({'kind': 'mean', 'need': min_mean, 'have': mean})
    unmet.extend(chosen['unmet'])

    if mean_ok and chosen['ok']:
        status = 'eligible'
    elif _mean_ok(min_mean, mean, 1) and chosen['near']:
        status = 'near'
    else:
        status = 'not_eligible'

    return {
        'id': entry['id'], 'provider': entry['provider'], 'name': entry['name'], 'level': entry['level'],
        'category': entry.get('category'), 'section': entry.get('section'), 'audience': entry.get('audience'),
        'min_mean': min_mean, 'mean_grade': mean, 'status': status, 'unmet': unmet, 'option': chosen['label'],
        'warnings': warnings, 'options': entry['options'], 'page': entry.get('page'), 'source': entry.get('source'), 'notes': entry.get('notes', ''),
    }


def rank_colleges(entries, learner):
    """Every entry evaluated: eligible first, then near misses, then the rest; diplomas before certificates."""
    results = [evaluate_college(e, learner) for e in entries]
    return sorted(results, key=lambda r: (STATUS_ORDER[r['status']], LEVEL_ORDER.get(r['level'], 9), r['provider'], r['name']))
