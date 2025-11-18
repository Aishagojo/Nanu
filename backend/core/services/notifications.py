from typing import Iterable

from notifications.models import Notification


def notify_users(users: Iterable, title: str, body: str, kind: str = "info"):
    payload = []
    seen = set()
    for user in users:
        user_id = getattr(user, "id", None)
        if not user_id or user_id in seen:
            continue
        seen.add(user_id)
        payload.append(
            Notification(
                user=user,
                title=title,
                body=body,
                kind=kind,
            )
        )
    if payload:
        Notification.objects.bulk_create(payload, ignore_conflicts=True)
