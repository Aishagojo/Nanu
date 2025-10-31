from pathlib import Path
from django.db import models
from rest_framework import serializers

from .models import Resource, ResourceTag, ResourceCategory, ResourceFeedback
from learning.models import Course

ALLOWED_EXTENSIONS = {
    ".pdf": Resource.Kind.PDF,
    ".doc": Resource.Kind.DOCUMENT,
    ".docx": Resource.Kind.DOCUMENT,
    ".jpeg": Resource.Kind.IMAGE,
    ".jpg": Resource.Kind.IMAGE,
    ".png": Resource.Kind.IMAGE,
    ".gif": Resource.Kind.IMAGE,
    ".mp4": Resource.Kind.VIDEO,
    ".mpeg": Resource.Kind.VIDEO,
    ".mpg": Resource.Kind.VIDEO,
    ".mov": Resource.Kind.VIDEO,
    ".avi": Resource.Kind.VIDEO,
    ".mkv": Resource.Kind.VIDEO,
    ".mp3": Resource.Kind.AUDIO,
    ".wav": Resource.Kind.AUDIO,
    ".aac": Resource.Kind.AUDIO,
    ".m4a": Resource.Kind.AUDIO,
    ".ogg": Resource.Kind.AUDIO,
}


class ResourceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_parent_name = serializers.CharField(source='category.parent.name', read_only=True)
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), required=False, allow_null=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)

    class Meta:
        model = Resource
        fields = [
            "id",
            "title",
            "kind",
            "description",
            "url",
            "file",
            "category",
            "category_name",
            "category_parent_name",
            "course",
            "course_name",
            "course_code",
        ]

    def validate(self, attrs):
        url = attrs.get("url") or getattr(self.instance, "url", "")
        file = attrs.get("file")

        if not url and not file:
            raise serializers.ValidationError("Provide either a URL or upload a file.")

        if file:
            ext = Path(file.name or "").suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                allowed = ", ".join(sorted(set(ALLOWED_EXTENSIONS.keys())))
                raise serializers.ValidationError(f"Unsupported file type. Allowed extensions: {allowed}")
            inferred_kind = ALLOWED_EXTENSIONS[ext]
            attrs["kind"] = inferred_kind
            attrs["url"] = ""  # ensure we don't persist stale URL when file is uploaded
        elif url and not attrs.get("kind"):
            attrs["kind"] = Resource.Kind.LINK

        return attrs


class ResourceTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceTag
        fields = ['id', 'name', 'description', 'icon', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ResourceCategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = ResourceCategory
        fields = [
            'id', 'name', 'description', 'parent', 'order', 'icon',
            'children', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_children(self, obj):
        """Get child categories, if any"""
        if obj.children.exists():
            return ResourceCategorySerializer(obj.children.all(), many=True).data
        return []

    def validate(self, data):
        """Prevent circular parent references"""
        parent = data.get('parent')
        if parent:
            current = parent
            while current:
                if current == self.instance:
                    raise serializers.ValidationError({
                        'parent': 'Cannot create circular category references'
                    })
                current = current.parent
        return data


class ResourceDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for individual resource views"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    tags = ResourceTagSerializer(many=True, read_only=True)
    feedback_summary = serializers.SerializerMethodField()
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), required=False, allow_null=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)

    class Meta:
        model = Resource
        fields = [
            'id', 'title', 'kind', 'description', 'url', 'file',
            'category', 'category_name', 'tags', 'difficulty_level',
            'order_in_category', 'voice_description', 'has_captions',
            'has_sign_language', 'requires_sound', 'high_contrast_url',
            'simplified_text_url', 'duration_seconds', 'recommended_breaks',
            'content_warnings', 'requires_parent', 'requires_teacher', 'course', 'course_name', 'course_code',
            'feedback_summary', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_feedback_summary(self, obj):
        """Get aggregated feedback metrics"""
        feedback = obj.feedback.all()
        if not feedback.exists():
            return None

        completed_count = feedback.filter(completed=True).count()
        avg_completion_time = feedback.filter(completion_time__isnull=False).values_list(
            'completion_time', flat=True
        ).aggregate(avg=models.Avg('completion_time'))['avg']

        return {
            'total_feedback': feedback.count(),
            'completed_count': completed_count,
            'avg_completion_time': round(avg_completion_time) if avg_completion_time else None,
            'avg_difficulty': feedback.filter(difficulty_rating__isnull=False).values_list(
                'difficulty_rating', flat=True
            ).aggregate(avg=models.Avg('difficulty_rating'))['avg'],
            'avg_enjoyment': feedback.filter(enjoyment_rating__isnull=False).values_list(
                'enjoyment_rating', flat=True
            ).aggregate(avg=models.Avg('enjoyment_rating'))['avg'],
            'accessibility_issues_count': feedback.filter(
                was_accessible=False
            ).count(),
        }


class ResourceFeedbackSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.display_name', read_only=True)

    class Meta:
        model = ResourceFeedback
        fields = [
            'id', 'resource', 'student', 'student_name', 'completed',
            'completion_time', 'difficulty_rating', 'enjoyment_rating',
            'voice_feedback', 'voice_feedback_transcript', 'was_accessible',
            'accessibility_issues', 'needed_help', 'helper',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        """Validate ratings are between 1-5"""
        for field in ['difficulty_rating', 'enjoyment_rating']:
            value = data.get(field)
            if value is not None and (value < 1 or value > 5):
                raise serializers.ValidationError({
                    field: 'Rating must be between 1 and 5'
                })
        return data
