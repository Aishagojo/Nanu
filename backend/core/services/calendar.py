from __future__ import annotations

from datetime import timedelta
from typing import Iterable, Optional

from django.utils import timezone

from core.models import CalendarEvent

DEFAULT_TIMEZONE = "Africa/Nairobi"


def _normalize_datetime(value):
    if value is None:
        return timezone.now()
    if timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return value


def upsert_calendar_event(
    owner,
    *,
    source_type: str,
    source_id: str,
    title: str,
    start_at,
    end_at=None,
    description: str = "",
    timezone_hint: str = DEFAULT_TIMEZONE,
    metadata: Optional[dict] = None,
    is_active: bool = True,
):
    if owner is None or not getattr(owner, "id", None):
        return None

    start_at = _normalize_datetime(start_at)
    end_at = _normalize_datetime(end_at) if end_at else start_at + timedelta(minutes=30)

    event, _ = CalendarEvent.objects.update_or_create(
        owner_user=owner,
        source_type=source_type,
        source_id=str(source_id),
        defaults={
            "title": title,
            "description": description,
            "start_at": start_at,
            "end_at": end_at,
            "timezone_hint": timezone_hint,
            "metadata": metadata or {},
            "is_active": is_active,
        },
    )
    return event


def upsert_calendar_events_for_users(
    users: Iterable,
    *,
    source_type: str,
    source_id: str,
    title: str,
    start_at,
    end_at=None,
    description: str = "",
    timezone_hint: str = DEFAULT_TIMEZONE,
    metadata: Optional[dict] = None,
    is_active: bool = True,
):
    events = []
    for user in users:
        event = upsert_calendar_event(
            user,
            source_type=source_type,
            source_id=source_id,
            title=title,
            start_at=start_at,
            end_at=end_at,
            description=description,
            timezone_hint=timezone_hint,
            metadata=metadata,
            is_active=is_active,
        )
        if event:
            events.append(event)
    return events


def remove_calendar_events_for_source(source_type: str, source_id: str):
    CalendarEvent.objects.filter(source_type=source_type, source_id=str(source_id)).delete()
