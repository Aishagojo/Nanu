import logging

logger = logging.getLogger(__name__)


def dispatch_attendance_reward(event):
    """
    Placeholder hook for future rewards logic. When the Hedera-backed rewards
    service is ready, replace this stub with an async task that awards tokens
    for punctual attendance events.
    """
    logger.info(
        "Rewards stub: attendance event %s for enrollment %s (%s)",
        event.id,
        event.enrollment_id,
        event.event_type,
    )
