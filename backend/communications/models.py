from django.conf import settings
from django.db import models
from core.models import TimeStampedModel
from learning.models import CurriculumUnit
from users.models import User

# New models for course chatrooms
class CourseChatroom(TimeStampedModel):
    unit = models.ForeignKey(CurriculumUnit, on_delete=models.CASCADE, related_name='chatrooms', null=True, blank=True)

    def __str__(self):
        return f"Chatroom for {self.unit.title}"

class ChatMessage(TimeStampedModel):
    chatroom = models.ForeignKey(CourseChatroom, on_delete=models.CASCADE, related_name='messages', null=True, blank=True)
    author_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages', null=True, blank=True)
    message = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message by {self.author_user.username} in {self.chatroom.unit.title}"

# Existing models for private threads and support chat
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
