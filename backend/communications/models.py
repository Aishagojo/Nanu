from django.conf import settings
from django.db import models
from core.models import TimeStampedModel


class Thread(TimeStampedModel):
    subject = models.CharField(max_length=255, blank=True)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="threads_as_student",
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="threads_as_teacher",
    )
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="threads_as_parent",
        null=True,
        blank=True,
    )


class Message(TimeStampedModel):
    class SenderRoles(models.TextChoices):
        STUDENT = "student", "Student"
        TEACHER = "teacher", "Teacher"
        PARENT = "parent", "Parent"

    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    body = models.TextField(blank=True)
    sender_role = models.CharField(max_length=20, choices=SenderRoles.choices)
    audio = models.FileField(upload_to="communications/audio/", blank=True)
    transcript = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]


class SupportChatSession(TimeStampedModel):
    """Represents a user-visible support session for the in-app helper."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    anonymous_id = models.CharField(max_length=128, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)


class SupportChatMessage(TimeStampedModel):
    session = models.ForeignKey(SupportChatSession, on_delete=models.CASCADE, related_name="messages")
    author_is_user = models.BooleanField(default=True)
    text = models.TextField(blank=True)
    redacted_text = models.TextField(blank=True)
    response_for = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["created_at"]
