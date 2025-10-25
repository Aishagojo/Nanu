from rest_framework import serializers
from .models import User, ParentStudentLink


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "role",
            "must_change_password",
            "prefers_simple_language",
            "prefers_high_contrast",
            "speech_rate",
            "totp_enabled",
        ]
        read_only_fields = ["totp_enabled"]


class ParentStudentLinkSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Roles.PARENT)
    )
    student = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Roles.STUDENT)
    )
    parent_detail = UserSerializer(source="parent", read_only=True)
    student_detail = UserSerializer(source="student", read_only=True)

    class Meta:
        model = ParentStudentLink
        fields = [
            "id",
            "parent",
            "student",
            "relationship",
            "created_at",
            "updated_at",
            "parent_detail",
            "student_detail",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "parent_detail", "student_detail"]
