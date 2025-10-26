import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def notify_provision_request_approval(request_obj, temp_password: str) -> None:
    """Send basic email/SMS style hooks when a provision request is approved."""
    recipient = request_obj.requested_by.email
    subject = "EduAssist account approved"
    body = (
        f"Hi {request_obj.requested_by.display_name or request_obj.requested_by.username},\n\n"
        f"The account for {request_obj.username} ({request_obj.role}) has been approved.\n"
        f"Temporary password: {temp_password}\n"
        "Ask the family to sign in and change it immediately.\n\n"
        "EduAssist Automations"
    )
    if recipient:
        try:
            send_mail(
                subject,
                body,
                getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@eduassist.local"),
                [recipient],
                fail_silently=True,
            )
        except Exception as exc:  # pragma: no cover - logging fallback
            logger.warning("Failed to email provisioning approval: %s", exc)
    else:
        logger.info("Provision approval lacks requester email; skipping email delivery.")

    sms_contact = getattr(request_obj.requested_by, "phone_number", None)
    if sms_contact:
        logger.info(
            "Provision approval SMS placeholder -> %s (course: %s, username: %s)",
            sms_contact,
            request_obj.role,
            request_obj.username,
        )
