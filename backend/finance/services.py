from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from core.services import (
    notify_users,
    remove_calendar_events_for_source,
    upsert_calendar_events_for_users,
)
from .models import FeeItem, FinanceStatus, FinanceThreshold


def _current_term():
    now = timezone.now()
    year = now.strftime("%Y")
    trimester = ((now.month - 1) // 4) + 1
    return year, trimester


def _active_course(student):
    enrollment = (
        student.enrollments.select_related("course")
        .order_by("-created_at")
        .first()
        if hasattr(student, "enrollments")
        else None
    )
    return enrollment.course if enrollment else None


def update_finance_status_for_student(student):
    if not student:
        return

    academic_year, trimester = _current_term()
    course = _active_course(student)
    total_paid = (
        FeeItem.objects.filter(student=student).aggregate(total=Sum("paid"))["total"] or Decimal("0")
    )
    threshold = FinanceThreshold.objects.filter(
        course=course, academic_year=academic_year, trimester=trimester
    ).first()
    if not threshold:
        threshold = FinanceThreshold.objects.filter(
            course__isnull=True, academic_year=academic_year, trimester=trimester
        ).first()

    threshold_amount = threshold.threshold_amount if threshold else Decimal("0")
    meets_threshold = bool(threshold_amount and total_paid >= threshold_amount)

    status, _ = FinanceStatus.objects.update_or_create(
        student=student,
        course=course,
        academic_year=academic_year,
        trimester=trimester,
        defaults={
            "total_paid": total_paid,
            "threshold_amount": threshold_amount,
            "meets_threshold": meets_threshold,
            "last_payment": timezone.now(),
        },
    )

    source_id = f"finance-{status.student_id}-{status.academic_year}-T{status.trimester}"

    if meets_threshold:
        owners = [student]
        parents = [link.parent for link in student.parent_links.select_related("parent").all()]
        owners.extend(parents)
        course_department = getattr(course, "department", None)
        hod_user = getattr(course_department, "head_of_department", None) if course_department else None
        if hod_user:
            owners.append(hod_user)
        upsert_calendar_events_for_users(
            owners,
            source_type="finance-threshold",
            source_id=source_id,
            title="Finance clearance threshold met",
            start_at=timezone.now(),
            description="You have met the finance clearance threshold for the current term.",
            metadata={
                "total_paid": str(total_paid),
                "threshold": str(threshold_amount),
                "academic_year": academic_year,
                "trimester": trimester,
            },
        )
        notify_users(
            owners,
            "Finance clearance unlocked",
            "Finance threshold satisfied. You can proceed with HoD approvals.",
            kind="finance",
        )
    else:
        remove_calendar_events_for_source("finance-threshold", source_id)
