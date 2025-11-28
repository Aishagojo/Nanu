from django.conf import settings
from django.db import models
from core.models import TimeStampedModel
from users.models import User

class Notification(TimeStampedModel):
    class Channel(models.TextChoices):
        IN_APP = 'in_app', 'In-App'
        EMAIL = 'email', 'Email'
        PUSH = 'push', 'Push'

    class Status(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        SENT = 'sent', 'Sent'
        READ = 'read', 'Read'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications", null=True, blank=True)
    type = models.CharField(max_length=100)
    channel = models.CharField(max_length=20, choices=Channel.choices)
    payload = models.JSONField()
    send_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)

    def __str__(self):
        return f"Notification for {self.user.username} via {self.channel} - {self.status}"

