from django.contrib.auth import get_user_model
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from core.models import AuditLog

User = get_user_model()


@receiver(pre_save, sender=User)
def store_previous_password(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_password = None
        return
    try:
        existing = sender.objects.get(pk=instance.pk)
        instance._previous_password = existing.password
    except sender.DoesNotExist:
        instance._previous_password = None


@receiver(post_save, sender=User)
def audit_password_change(sender, instance, created, **kwargs):
    if created:
        return
    previous = getattr(instance, "_previous_password", None)
    if previous is None:
        return
    if instance.password != previous:
        actor = getattr(instance, "_password_changed_by", None)
        AuditLog.objects.create(
            actor_user=actor if hasattr(actor, "pk") else None,
            action="password_change",
            target_table=sender._meta.db_table,
            target_id=str(instance.pk),
            after={"password_changed": True},
        )
        if hasattr(instance, "_password_changed_by"):
            instance._password_changed_by = None
