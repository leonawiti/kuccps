"""
Putting a learner and a programme together: eligibility, cluster points, margin and band, and the ranking and
four-choice analysis built on that.

A programme is a plain dict (see catalogue/build.py): code, institution, name, family, cutoffs by year,
requirement slots, and slots_status ('ok', 'none' = no requirements listed, 'defect' = unreadable cell).
"""
from dataclasses import dataclass

from .bands import BAND_ORDER, CLASSIC_WIDTH, classify, flexible_width
from .cluster import assign_slots, cluster_points
from .grades import BEST_COUNT, points_of, total_of_best
from .requirements import Slot
from .subjects import subject_key

MAX_CHOICES = 4


@dataclass
class Learner:
    points: dict  # subject key -> points
    total: int  # best seven subjects


def learner_from_grades(grades):
    """A Learner from {subject (key, number or name): grade}. Raises ValueError for anything unreadable."""
    points = {}
    for name, grade in grades.items():
        points[subject_key(name)] = points_of(grade)
    if len(points) < BEST_COUNT:
        raise ValueError(f'At least {BEST_COUNT} different subjects are needed; {len(points)} given.')
    return Learner(points=points, total=total_of_best(list(points.values())))


def _cutoff_history(prog):
    """[(year, cutoff)] in year order, ignoring missing values: '-', None and zero."""
    history = []
    for year in sorted(prog.get('cutoffs') or {}):
        value = prog['cutoffs'][year]
        if isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0:
            history.append((year, float(value)))
    return history


def evaluate(prog, learner, mode='flexible', fill=True, cache=None):
    """
    The learner against one programme. `mode` is 'classic' (fixed 2 points) or 'flexible' (the programme's own
    history). state is 'assessed', 'subjects_not_met' or 'no_cutoff'; band is None only for no_cutoff.
    `cache` (a dict kept per learner) remembers slot assignments: many programmes share a requirement pattern.
    """
    out = {
        'code': prog['code'], 'institution': prog['institution'], 'name': prog['name'],
        'family': prog.get('family'), 'pathway': prog.get('pathway'), 'preference': 0, 'mode': mode, 'band': None, 'state': None, 'cluster': None,
        'margin': None, 'cutoff': None, 'cutoff_year': None, 'width': None, 'r': None, 't': learner.total,
        'picks': [], 'failed_slots': [], 'warnings': [],
        'cutoffs': prog.get('cutoffs') or {}, 'slots': prog.get('slots') or [],
        'slots_status': prog.get('slots_status', 'ok'),
    }
    history = _cutoff_history(prog)
    if not history:
        out['state'] = 'no_cutoff'
        return out
    year, cutoff = history[-1]
    out['cutoff'], out['cutoff_year'] = cutoff, year

    status = prog.get('slots_status', 'ok')
    slots = [Slot(tuple(s['alternatives']), s['min_grade']) for s in prog.get('slots') or []]
    if status == 'none':
        out['warnings'].append('subject_requirements_unknown')
        slots = []
    elif status == 'defect':
        out['warnings'].append('subject_requirements_defective')
        slots = []

    key = (tuple(slots), fill)
    if cache is not None and key in cache:
        assignment = cache[key]
    else:
        assignment = assign_slots(learner.points, slots, fill=fill)
        if cache is not None:
            cache[key] = assignment
    if not assignment.ok:
        out['state'] = 'subjects_not_met'
        out['band'] = 'excluded'
        out['failed_slots'] = [
            {'alternatives': list(slots[i].alternatives), 'min_grade': slots[i].min_grade} for i in assignment.failed
        ]
        return out
    if assignment.filled:
        out['warnings'].append('cluster_subjects_filled')

    out['r'] = assignment.r
    out['picks'] = [list(p) for p in assignment.picks]
    out['cluster'] = cluster_points(assignment.r, learner.total)
    out['margin'] = round(out['cluster'] - cutoff, 3)
    out['width'] = CLASSIC_WIDTH if mode == 'classic' else flexible_width([c for _, c in history])
    out['band'] = classify(out['margin'], out['width'])
    out['state'] = 'assessed'
    return out


def _rank_key(result):
    if result['band'] is None:
        return (len(BAND_ORDER), 0, 0)
    position = BAND_ORDER.index(result['band'])
    if result['band'] in ('best_fit', 'safe'):
        return (position, -result['preference'], -result['cutoff'])  # more selective first
    return (position, -result['preference'], -(result['margin'] if result['margin'] is not None else -999))


def _weights(preferences):
    """{'institutions': {name: weight}, 'pathways': {pathway: weight}} checked: weights are numbers of 0 or more."""
    preferences = preferences or {}
    for group in ('institutions', 'pathways'):
        for key, weight in (preferences.get(group) or {}).items():
            if isinstance(weight, bool) or not isinstance(weight, (int, float)) or weight < 0:
                raise ValueError(f'Preference weight for {key!r} must be a number of 0 or more.')
    return preferences.get('institutions') or {}, preferences.get('pathways') or {}


def rank_programmes(programmes, learner, mode='flexible', fill=True, preferences=None):
    """
    Every programme evaluated and ordered: best fit, safe, stretch, excluded, then those with no cut-off.
    Preferences (a weight for each preferred institution and pathway) reorder programmes *within* a band only;
    they never lift a programme into a better one, so a wish cannot make an out-of-reach course look attainable.
    """
    institution_weights, pathway_weights = _weights(preferences)
    results = []
    cache = {}
    for prog in programmes:
        result = evaluate(prog, learner, mode, fill, cache)
        result['preference'] = (institution_weights.get(result['institution'], 0)
                                + pathway_weights.get(result['pathway'], 0))
        results.append(result)
    return sorted(results, key=_rank_key)


def analyse_choices(programmes, learner, mode='flexible', fill=True):
    """Evaluate a learner's one to four choices in the order given, with counselling advice on the mix."""
    if not 1 <= len(programmes) <= MAX_CHOICES:
        raise ValueError(f'Choose between 1 and {MAX_CHOICES} programmes; {len(programmes)} given.')
    choices = [evaluate(p, learner, mode, fill) for p in programmes]
    advice = []
    bands = [c['band'] for c in choices]
    codes = [c['code'] for c in choices]

    if len(set(codes)) < len(codes):
        advice.append({'code': 'duplicate_choice', 'message': 'The same programme is chosen more than once.'})
    if any(c['state'] == 'no_cutoff' for c in choices):
        advice.append({'code': 'no_data_choice',
                       'message': 'A choice has no published cut-off, so it could not be placed in a band.'})
    if all(b == 'excluded' for b in bands):
        advice.append({'code': 'all_excluded',
                       'message': 'Every choice is out of reach on current points or subject requirements.'})
    if 'safe' not in bands:
        advice.append({'code': 'no_safe_choice',
                       'message': 'No choice is safe. Add at least one programme the learner clears comfortably.'})
    if len(choices) < MAX_CHOICES:
        advice.append({'code': 'fewer_than_four',
                       'message': f'Only {len(choices)} of {MAX_CHOICES} choices are used.'})
    return {'choices': choices, 'advice': advice}
