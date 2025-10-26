from django.conf import settings
from rest_framework import serializers
from .models import User, ParentStudentLink, UserProvisionRequest


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


class UserProvisionSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            "username",
            "password",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "role",
            "prefers_simple_language",
            "prefers_high_contrast",
            "speech_rate",
        ]

    def validate_role(self, value):
        allowed = {User.Roles.STUDENT, User.Roles.PARENT}
        if value not in allowed:
            raise serializers.ValidationError("Only student or parent accounts can be provisioned via this endpoint.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        if not user.display_name:
            names = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
            user.display_name = names or user.username
        user.set_password(password)
        user.must_change_password = True
        user.save()
        return user


class UserProvisionRequestSerializer(serializers.ModelSerializer):
    requested_by_detail = UserSerializer(source="requested_by", read_only=True)
    created_user_detail = UserSerializer(source="created_user", read_only=True)
    records_passcode = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = UserProvisionRequest
        fields = [
            "id",
            "username",
            "display_name",
            "email",
            "role",
            "status",
            "requested_by",
            "requested_by_detail",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "created_user",
            "created_user_detail",
            "temporary_password",
            "created_at",
            "updated_at",
            "records_passcode",
        ]
        read_only_fields = [
            "status",
            "requested_by",
            "requested_by_detail",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
            "created_user",
            "created_user_detail",
            "temporary_password",
            "created_at",
            "updated_at",
        ]

    def validate_role(self, value):
        allowed = {User.Roles.STUDENT, User.Roles.PARENT}
        if value not in allowed:
            raise serializers.ValidationError("Only student or parent roles are supported.")
        return value

    def validate_username(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError("This username already exists.")
        if UserProvisionRequest.objects.filter(username__iexact=normalized, status=UserProvisionRequest.Status.PENDING).exists():
            raise serializers.ValidationError("A pending request already exists for this username.")
        return normalized

    def validate_records_passcode(self, value):
        if value != settings.RECORDS_PROVISION_PASSCODE:
            raise serializers.ValidationError("Invalid records approval passcode.")
        return value

    def validate(self, attrs):
        attrs.pop("records_passcode", None)
        return attrs

    def create(self, validated_data):
        requested_by = self.context["requested_by"]
        validated_data["requested_by"] = requested_by
        return super().create(validated_data)


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
