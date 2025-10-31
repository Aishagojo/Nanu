from rest_framework import serializers
from django.utils import timezone
from ..goals_models import LearningGoal, LearningMilestone, LearningSupport, GoalReflection


class GoalReflectionSerializer(serializers.ModelSerializer):
    """Serializer for student reflections on goals"""
    class Meta:
        model = GoalReflection
        fields = [
            'id', 'goal', 'milestone', 'voice_recording', 'transcript',
            'mood', 'needs_help', 'help_type_requested',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        """Validate help type is provided when needed"""
        if data.get('needs_help') and not data.get('help_type_requested'):
            raise serializers.ValidationError({
                'help_type_requested': 'Help type is required when needs_help is True'
            })
        return data


class LearningSupportSerializer(serializers.ModelSerializer):
    """Serializer for tracking learning support and interventions"""
    provider_name = serializers.CharField(source='provided_by.display_name', read_only=True)
    milestone_title = serializers.CharField(source='milestone.title', read_only=True)

    class Meta:
        model = LearningSupport
        fields = [
            'id', 'milestone', 'milestone_title', 'provided_by',
            'provider_name', 'support_type', 'description', 'voice_notes',
            'notes_transcript', 'duration_minutes', 'resources_provided',
            'follow_up_date', 'outcome_notes', 'parent_notified',
            'parent_feedback', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_follow_up_date(self, value):
        """Ensure follow-up date is not in the past"""
        if value and value < timezone.now().date():
            raise serializers.ValidationError(
                'Follow-up date cannot be in the past'
            )
        return value


class LearningMilestoneSerializer(serializers.ModelSerializer):
    """Serializer for learning milestones within goals"""
    goal_title = serializers.CharField(source='goal.title', read_only=True)
    verifier_name = serializers.CharField(source='verified_by.display_name', read_only=True)
    support_count = serializers.SerializerMethodField()
    reflection_count = serializers.SerializerMethodField()

    class Meta:
        model = LearningMilestone
        fields = [
            'id', 'goal', 'goal_title', 'title', 'description',
            'voice_description', 'order', 'required_points',
            'required_attendance', 'required_resources',
            'custom_criteria', 'completed', 'completed_at',
            'verified_by', 'verifier_name', 'completion_recording',
            'completion_transcript', 'support_count', 'reflection_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'verified_by',
            'completed_at'
        ]

    def get_support_count(self, obj):
        return obj.support_records.count()

    def get_reflection_count(self, obj):
        return obj.reflections.count()

    def validate(self, data):
        """Validate milestone data"""
        if data.get('required_attendance'):
            if data['required_attendance'] < 0 or data['required_attendance'] > 100:
                raise serializers.ValidationError({
                    'required_attendance': 'Attendance requirement must be between 0 and 100'
                })

        # Check if resources exist
        resources = data.get('required_resources')
        if resources:
            for resource in resources.all():
                if not resource.pk:
                    raise serializers.ValidationError({
                        'required_resources': f'Resource {resource} does not exist'
                    })

        return data


class LearningGoalSerializer(serializers.ModelSerializer):
    """Detailed serializer for learning goals"""
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    creator_name = serializers.CharField(source='created_by.display_name', read_only=True)
    approver_name = serializers.CharField(source='approved_by.display_name', read_only=True)
    milestones = LearningMilestoneSerializer(many=True, read_only=True)
    reflection_summary = serializers.SerializerMethodField()

    class Meta:
        model = LearningGoal
        fields = [
            'id', 'student', 'student_name', 'course', 'course_code',
            'term', 'title', 'description', 'voice_description',
            'target_date', 'progress_percentage', 'status',
            'created_by', 'creator_name', 'approved_by', 'approver_name',
            'parent_notified', 'milestones', 'reflection_summary',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'created_by',
            'approved_by', 'progress_percentage'
        ]

    def get_reflection_summary(self, obj):
        """Summarize student reflections on this goal"""
        reflections = GoalReflection.objects.filter(goal=obj)
        if not reflections.exists():
            return None

        moods = reflections.values_list('mood', flat=True)
        needs_help = reflections.filter(needs_help=True).count()

        return {
            'total_reflections': len(moods),
            'mood_distribution': {
                mood: moods.count(mood) for mood in set(moods)
            },
            'needs_help_count': needs_help,
            'latest_reflection': reflections.order_by('-created_at').first().created_at
        }

    def validate_target_date(self, value):
        """Ensure target date is not in the past"""
        if value and value < timezone.now().date():
            raise serializers.ValidationError(
                'Target date cannot be in the past'
            )
        return value


class LearningGoalListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for goal list views"""
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    milestone_count = serializers.SerializerMethodField()
    completed_milestone_count = serializers.SerializerMethodField()

    class Meta:
        model = LearningGoal
        fields = [
            'id', 'student', 'student_name', 'title', 'status',
            'progress_percentage', 'target_date', 'milestone_count',
            'completed_milestone_count'
        ]

    def get_milestone_count(self, obj):
        return obj.milestones.count()

    def get_completed_milestone_count(self, obj):
        return obj.milestones.filter(completed=True).count()