from rest_framework.response import Response
from rest_framework.views import APIView

from catalogue.loader import catalogue, programmes_by_code
from engine.bands import BAND_ORDER
from engine.careers import PATHWAYS
from engine.classes import analyse_class
from engine.grades import GRADE_POINTS, GRADES, MEAN_GRADE_BANDS, mean_grade
from engine.recommend import analyse_choices, learner_from_grades, rank_programmes
from engine.subjects import SUBJECTS

from .serializers import ChoicesSerializer, ClassSerializer, EligibilitySerializer

BAND_LABELS = {
    'best_fit': ('Best fit', 'Within reach and close to the cut-off: the programmes to aim for.'),
    'safe': ('Safe', 'Comfortably above the cut-off: a dependable fallback.'),
    'stretch': ('Stretch', 'Just below the cut-off: possible if the cut-off falls this year.'),
    'excluded': ('Excluded', 'Too far below the cut-off, or a required subject grade is not met.'),
}
LISTED_BANDS = BAND_ORDER + ['no_data']


def _learner_summary(learner):
    return {'total': learner.total, 'mean_grade': mean_grade(learner.total), 'points': learner.points,
            'subjects': len(learner.points)}


def _matching(programmes, institutions=None, pathways=None, q=None):
    q = (q or '').strip().lower()
    out = []
    for p in programmes:
        if institutions and p['institution'] not in institutions:
            continue
        if pathways and p.get('pathway') not in pathways:
            continue
        if q and q not in p['name'].lower() and q not in p['institution'].lower() and q not in p['code'].lower():
            continue
        out.append(p)
    return out


class Meta(APIView):
    def get(self, request):
        data = catalogue()
        return Response({
            'subjects': [{'key': s.key, 'number': s.number, 'name': s.name, 'group': s.group}
                         for s in sorted(SUBJECTS.values(), key=lambda s: s.number)],
            'grades': [{'grade': g, 'points': GRADE_POINTS[g]} for g in GRADES],
            'mean_grade_bands': [{'grade': g, 'min': lo, 'max': hi} for lo, hi, g in MEAN_GRADE_BANDS],
            'pathways': [{'key': k, 'label': v} for k, v in PATHWAYS.items()],
            'bands': [{'key': k, 'label': BAND_LABELS[k][0], 'description': BAND_LABELS[k][1]} for k in BAND_ORDER],
            'catalogue': {
                'programmes': len(data['programmes']),
                'institutions': sorted({p['institution'] for p in data['programmes']}),
                'source': data.get('source'), 'report': data.get('report'),
            },
        })


class Programmes(APIView):
    def get(self, request):
        params = request.query_params
        try:
            limit = max(1, min(500, int(params.get('limit', 50))))
        except ValueError:
            limit = 50
        found = _matching(
            catalogue()['programmes'],
            [params['institution']] if params.get('institution') else None,
            [params['pathway']] if params.get('pathway') else None,
            params.get('q'),
        )
        return Response({'total': len(found), 'results': found[:limit]})


class Eligibility(APIView):
    def post(self, request):
        s = EligibilitySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        learner = learner_from_grades(d['grades'])
        programmes = _matching(catalogue()['programmes'], d.get('institutions'), d.get('pathways'), d.get('q'))
        ranked = rank_programmes(programmes, learner, d['mode'], d['fill'], d.get('preferences'))

        bands = {b: [] for b in LISTED_BANDS}
        for result in ranked:
            bands[result['band'] or 'no_data'].append(result)
        return Response({
            'learner': _learner_summary(learner), 'mode': d['mode'], 'fill': d['fill'],
            'counts': {b: len(v) for b, v in bands.items()},
            'truncated': {b: len(v) > d['limit'] for b, v in bands.items()},
            'bands': {b: v[:d['limit']] for b, v in bands.items()},
        })


class Choices(APIView):
    def post(self, request):
        s = ChoicesSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        by_code = programmes_by_code()
        unknown = [c for c in d['choices'] if c not in by_code]
        if unknown:
            return Response({'choices': [f'Unknown programme code: {", ".join(unknown)}']}, status=400)
        learner = learner_from_grades(d['grades'])
        result = analyse_choices([by_code[c] for c in d['choices']], learner, d['mode'], d['fill'])
        return Response({'learner': _learner_summary(learner), 'mode': d['mode'], **result})


class ClassAnalysis(APIView):
    def post(self, request):
        s = ClassSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        return Response(analyse_class(d['learners'], catalogue()['programmes'], d['mode'], d['fill']))
