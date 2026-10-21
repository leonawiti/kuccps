"""
Class and school analysis: the single-learner engine run over a whole class, summarised for a teacher or head.

Stateless: learners are passed in and nothing is kept. Names are only labels in the response.
"""
from collections import Counter

from .careers import PATHWAYS
from .colleges import evaluate_college
from .grades import mean_grade
from .recommend import evaluate, learner_from_grades
from .subjects import SUBJECTS

MAX_LEARNERS = 300


def _share(count, total):
    return round(count / total, 3) if total else 0.0


def analyse_class(learners, programmes, mode='flexible', fill=True, colleges=None):
    """
    `learners` is a list of {'name': optional label, 'grades': {subject: grade}}. Learners whose grades cannot be
    read are listed under `rejected` and left out of the cohort figures. With `colleges` (KMTC and TVET entries)
    each learner also gets a count of those they are eligible for, since a learner with no safe degree may still
    have a college route.
    """
    if not learners:
        raise ValueError('At least one learner is needed.')
    if len(learners) > MAX_LEARNERS:
        raise ValueError(f'A class can have at most {MAX_LEARNERS} learners; {len(learners)} given.')

    rows, rejected = [], []
    subject_points = {}
    for i, entry in enumerate(learners, start=1):
        name = (entry.get('name') or '').strip() or f'Learner {i}'
        try:
            learner = learner_from_grades(entry.get('grades') or {})
        except ValueError as e:
            rejected.append({'name': name, 'error': str(e)})
            continue

        bands = Counter()
        pathways = {p: 0 for p in PATHWAYS}
        best_cluster = None
        cache = {}
        for programme in programmes:
            result = evaluate(programme, learner, mode, fill, cache)
            bands[result['band'] or 'no_data'] += 1
            if result['band'] in ('best_fit', 'safe') and result['pathway'] in pathways:
                pathways[result['pathway']] += 1
            if result['cluster'] is not None and (best_cluster is None or result['cluster'] > best_cluster):
                best_cluster = result['cluster']
        colleges_eligible = None
        if colleges is not None:
            colleges_eligible = sum(1 for c in colleges if evaluate_college(c, learner)['status'] == 'eligible')
        for key, points in learner.points.items():
            subject_points.setdefault(key, []).append(points)

        rows.append({
            'name': name, 'total': learner.total, 'mean_grade': mean_grade(learner.total),
            'best_cluster': best_cluster, 'colleges_eligible': colleges_eligible,
            'bands': {b: bands.get(b, 0) for b in ('best_fit', 'safe', 'stretch', 'excluded', 'no_data')},
            'pathways': pathways,
            'at_risk': bands.get('best_fit', 0) + bands.get('safe', 0) == 0,
        })

    n = len(rows)
    cohort = {
        'learners': n,
        'mean_total': round(sum(r['total'] for r in rows) / n, 3) if n else None,
        'mean_grades': dict(Counter(r['mean_grade'] for r in rows)),
        'safe_reach': _share(sum(1 for r in rows if r['bands']['safe'] > 0), n),
        'pathway_reach': {p: _share(sum(1 for r in rows if r['pathways'][p] > 0), n) for p in PATHWAYS},
        'at_risk': [r['name'] for r in rows if r['at_risk']],
        'college_reach': None if colleges is None else _share(sum(1 for r in rows if r['colleges_eligible']), n),
        'at_risk_with_college_option': [r['name'] for r in rows if r['at_risk'] and r['colleges_eligible']],
        'subjects': [
            {'key': key, 'name': SUBJECTS[key].name, 'learners': len(values),
             'mean_points': round(sum(values) / len(values), 2)}
            for key, values in sorted(subject_points.items(), key=lambda kv: SUBJECTS[kv[0]].number)
        ],
    }
    return {'learners': rows, 'cohort': cohort, 'rejected': rejected}
