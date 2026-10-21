from rest_framework import serializers

from engine.careers import PATHWAYS
from engine.recommend import learner_from_grades

MODES = ['flexible', 'classic']


class GradesField(serializers.DictField):
    """{subject: grade}. The grades are read by the engine in validate_grades so every error says what is wrong."""

    def __init__(self, **kwargs):
        super().__init__(child=serializers.CharField(), allow_empty=False, **kwargs)


class PreferencesSerializer(serializers.Serializer):
    institutions = serializers.DictField(child=serializers.FloatField(min_value=0), required=False)
    pathways = serializers.DictField(child=serializers.FloatField(min_value=0), required=False)

    def validate_pathways(self, value):
        unknown = sorted(set(value) - set(PATHWAYS))
        if unknown:
            raise serializers.ValidationError(f'Unknown pathway: {", ".join(unknown)}')
        return value


class LearnerGradesSerializer(serializers.Serializer):
    grades = GradesField()
    mode = serializers.ChoiceField(choices=MODES, default='flexible')
    fill = serializers.BooleanField(default=True)

    def validate_grades(self, value):
        try:
            learner_from_grades(value)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return value


class EligibilitySerializer(LearnerGradesSerializer):
    institutions = serializers.ListField(child=serializers.CharField(), required=False)
    pathways = serializers.ListField(child=serializers.ChoiceField(choices=list(PATHWAYS)), required=False)
    q = serializers.CharField(required=False, allow_blank=True)
    limit = serializers.IntegerField(min_value=1, max_value=500, default=50)
    preferences = PreferencesSerializer(required=False)


class ChoicesSerializer(LearnerGradesSerializer):
    choices = serializers.ListField(child=serializers.CharField(), min_length=1, max_length=4)


class ClassLearnerSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    grades = GradesField()


class ClassSerializer(serializers.Serializer):
    learners = ClassLearnerSerializer(many=True, allow_empty=False)
    mode = serializers.ChoiceField(choices=MODES, default='flexible')
    fill = serializers.BooleanField(default=True)
