from rest_framework import serializers
from .models import Merit
from users.serializers import UserSerializer
from users.models import Student

class MeritSerializer(serializers.ModelSerializer):
    awarded_by = UserSerializer(read_only=True)

    class Meta:
        model = Merit
        fields = ['id', 'student', 'awarded_by', 'stars', 'reason', 'created_at']

class AwardMeritSerializer(serializers.Serializer):
    student = serializers.PrimaryKeyRelatedField(queryset=Student.objects.all())
    stars = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=500)

    def create(self, validated_data):
        # The 'awarded_by' will be added in the view from request.user
        merit = Merit.objects.create(**validated_data)
        return merit
