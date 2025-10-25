from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditLog(models.Model):
    at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey("users.User", null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=32)
    model = models.CharField(max_length=128)
    object_id = models.CharField(max_length=64)
    changes = models.JSONField(default=dict, blank=True)

