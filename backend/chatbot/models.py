from django.conf import settings
from django.db import models
from core.models import TimeStampedModel


class Conversation(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversations")
    title = models.CharField(max_length=255, blank=True)
    state = models.JSONField(default=dict, blank=True)


class Turn(TimeStampedModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="turns")
    sender = models.CharField(max_length=20, default="user")  # user|bot
    text = models.TextField()

