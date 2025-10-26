from rest_framework import serializers
from .models import Course, Unit, Enrollment, AttendanceEvent


class CourseSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ["id", "code", "name", "description", "owner", "owner_name"]

    def get_owner_name(self, obj):
        if obj.owner_id and obj.owner:
            return obj.owner.display_name or obj.owner.get_full_name() or obj.owner.username
        return ""


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ["id", "course", "title", "description"]



class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = ["id", "student", "course", "active", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class AttendanceEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceEvent
        fields = ["id", "enrollment", "marked_by", "event_type", "note", "reward_tagged", "created_at"]
        read_only_fields = ["id", "marked_by", "reward_tagged", "created_at"]

