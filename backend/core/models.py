from django.conf import settings
from django.db import models
from django.utils import timezone


class Department(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=10, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    head_of_department = models.ForeignKey(
        'users.HOD',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='headed_department'
    )

    def __str__(self):
        return f"{self.name} ({self.code})"


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditLog(models.Model):
    actor_user = models.ForeignKey(
        "users.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    action = models.CharField(max_length=255, default='')
    target_table = models.CharField(max_length=128, default='')
    target_id = models.CharField(max_length=64, default='')
    before = models.JSONField(default=dict, blank=True, null=True)
    after = models.JSONField(default=dict, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)


class CalendarEvent(TimeStampedModel):
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="calendar_events",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    timezone_hint = models.CharField(max_length=64, default="Africa/Nairobi")
    source_type = models.CharField(max_length=64, blank=True)
    source_id = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["start_at"]
        indexes = [
            models.Index(fields=["owner_user", "start_at"]),
            models.Index(fields=["source_type", "source_id"]),
        ]
        unique_together = ("owner_user", "source_type", "source_id")

    def __str__(self):
        return f"{self.title} ({self.owner_user_id})"


class DeviceRegistration(TimeStampedModel):
    PLATFORM_CHOICES = (
        ("expo", "Expo"),
        ("ios", "Apple"),
        ("android", "Android"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="device_registrations",
    )
    platform = models.CharField(max_length=32, choices=PLATFORM_CHOICES)
    push_token = models.CharField(max_length=255, unique=True)
    last_registered_at = models.DateTimeField(auto_now=True)
    app_id = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-last_registered_at"]
        indexes = [models.Index(fields=["user", "platform"])]

    def __str__(self):
        return f"{self.user_id} - {self.platform}"
