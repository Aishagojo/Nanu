from rest_framework import serializers
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from ..progress_models import StudentProgress, ActivityLog, CompletionRecord


class StudentProgressSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    engagement_level = serializers.SerializerMethodField()

    class Meta:
        model = StudentProgress
        fields = [
            'id', 'student', 'student_name', 'course', 'course_name',
            'course_code', 'term', 'completion_percentage', 'activity_score',
            'total_time_spent', 'last_activity_at', 'consecutive_days',
            'latest_voice_feedback', 'latest_feedback_transcript',
            'engagement_level', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'consecutive_days',
            'last_activity_at'
        ]

    def get_engagement_level(self, obj):
        """Calculate engagement level based on activity score"""
        if obj.activity_score >= 80:
            return "High"
        elif obj.activity_score >= 50:
            return "Medium"
        else:
            return "Low"

    def validate(self, data):
        """Validate percentage fields are between 0-100"""
        for field in ['completion_percentage', 'activity_score']:
            value = data.get(field)
            if value is not None and (value < 0 or value > 100):
                raise serializers.ValidationError({
                    field: 'Value must be between 0 and 100'
                })
        return data


class ActivityLogSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    resource_title = serializers.CharField(source='resource.title', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'student', 'student_name', 'course', 'course_code',
            'activity_type', 'duration_minutes', 'resource', 'resource_title',
            'details', 'was_successful', 'difficulty_reported',
            'needed_help', 'helper_type', 'voice_notes',
            'voice_notes_transcript', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_difficulty_reported(self, value):
        """Ensure difficulty rating is between 1-5"""
        if value is not None and (value < 1 or value > 5):
            raise serializers.ValidationError('Difficulty must be between 1 and 5')
        return value

    def validate(self, data):
        """Additional validation logic"""
        if data.get('needed_help') and not data.get('helper_type'):
            raise serializers.ValidationError({
                'helper_type': 'Helper type is required when needed_help is True'
            })
        return data


class CompletionRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    unit_title = serializers.CharField(source='unit.title', read_only=True)
    resource_title = serializers.CharField(source='resource.title', read_only=True)
    verifier_name = serializers.CharField(source='verified_by.display_name', read_only=True)

    class Meta:
        model = CompletionRecord
        fields = [
            'id', 'student', 'student_name', 'course', 'course_code',
            'unit', 'unit_title', 'resource', 'resource_title',
            'completed_at', 'completion_type', 'verified_by', 'verifier_name',
            'score', 'time_taken', 'attempts', 'voice_reflection',
            'reflection_transcript', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'verified_by',
            'completed_at'
        ]

    def validate(self, data):
        """Validate score and completion type"""
        score = data.get('score')
        if score is not None and (score < 0 or score > 100):
            raise serializers.ValidationError({
                'score': 'Score must be between 0 and 100'
            })

        # Only teachers can verify completions
        completion_type = data.get('completion_type')
        request = self.context.get('request')
        if completion_type == 'teacher_verified' and request:
            if request.user.role != 'lecturer':
                raise serializers.ValidationError({
                    'completion_type': 'Only teachers can verify completions'
                })

        return data


class CompletionRecordListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    unit_title = serializers.CharField(source='unit.title', read_only=True)

    class Meta:
        model = CompletionRecord
        fields = [
            'id', 'student', 'student_name', 'unit', 'unit_title',
            'completed_at', 'completion_type', 'score', 'attempts'
        ]