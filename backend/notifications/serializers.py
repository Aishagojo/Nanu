from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id",
            "user",
            "title",
            "body",
            "read",
            "kind",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
