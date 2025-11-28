from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import CalendarEvent, Department, DeviceRegistration
from users.models import HOD

User = get_user_model()


class HODSerializer(serializers.ModelSerializer):
    class Meta:
        model = HOD
        fields = "__all__"


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'head_of_department']
        read_only_fields = ['head_of_department']


class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = [
            "id",
            "owner_user",
            "title",
            "description",
            "start_at",
            "end_at",
            "timezone_hint",
            "source_type",
            "source_id",
            "metadata",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class DeviceRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceRegistration
        fields = ["platform", "push_token", "app_id"]