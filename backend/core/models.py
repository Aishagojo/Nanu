from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=10, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    head_of_department = models.OneToOneField('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='headed_department')

    def __str__(self):
        return f"{self.name} ({self.code})"


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

