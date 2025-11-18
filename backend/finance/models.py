from decimal import Decimal

from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class FeeItem(TimeStampedModel):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="fee_items")
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    @property
    def balance(self):
        return max(self.amount - self.paid, 0)

    @property
    def status(self):
        # green / amber / red mapping to labels (front-end will color + label)
        pct = (self.paid / self.amount) if self.amount else 0
        if pct >= 1:
            return "Complete"
        if pct >= 0.5:
            return "In progress"
        return "Action needed"


class Payment(TimeStampedModel):
    fee_item = models.ForeignKey(FeeItem, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=50, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # naive denormalization for demo; in production use signals/transactions
        total = sum(p.amount for p in self.fee_item.payments.all())
        self.fee_item.paid = total
        self.fee_item.save(update_fields=["paid"])
        from .services import update_finance_status_for_student

        update_finance_status_for_student(self.fee_item.student)


class FinanceThreshold(TimeStampedModel):
    course = models.ForeignKey(
        "learning.Course",
        on_delete=models.CASCADE,
        related_name="finance_thresholds",
        null=True,
        blank=True,
    )
    academic_year = models.CharField(max_length=9)
    trimester = models.PositiveSmallIntegerField(default=1)
    threshold_amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ("course", "academic_year", "trimester")
        ordering = ["course_id", "academic_year", "trimester"]

    def __str__(self):
        label = self.course.code if self.course else "General"
        return f"{label} {self.academic_year} T{self.trimester}"


class FinanceStatus(TimeStampedModel):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="finance_statuses",
    )
    course = models.ForeignKey(
        "learning.Course",
        on_delete=models.CASCADE,
        related_name="finance_statuses",
        null=True,
        blank=True,
    )
    academic_year = models.CharField(max_length=9)
    trimester = models.PositiveSmallIntegerField(default=1)
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    threshold_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    meets_threshold = models.BooleanField(default=False)
    last_payment = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("student", "course", "academic_year", "trimester")
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.student_id} {self.academic_year}T{self.trimester} meets={self.meets_threshold}"
