from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver

from .models import AuditLog

User = get_user_model()


@receiver(user_logged_in)
def audit_user_login(sender, request, user, **kwargs):
    AuditLog.objects.create(
        user=user,
        action="login",
        model=user._meta.label,
        object_id=str(user.pk),
        changes={
            "remote_addr": request.META.get("REMOTE_ADDR"),
            "user_agent": request.META.get("HTTP_USER_AGENT"),
        },
    )


@receiver(user_logged_out)
def audit_user_logout(sender, request, user, **kwargs):
    AuditLog.objects.create(
        user=user if isinstance(user, User) else None,
        action="logout",
        model=user._meta.label if isinstance(user, User) else "auth.User",
        object_id=str(user.pk) if isinstance(user, User) else "",
        changes={
            "remote_addr": request.META.get("REMOTE_ADDR"),
            "user_agent": request.META.get("HTTP_USER_AGENT"),
        },
    )
