from decimal import Decimal
from django.db import models

from core.models import TimeStampedModel
from users.models import Student
from learning.models import Programme


class FeeStructure(TimeStampedModel):
    programme = models.ForeignKey(Programme, on_delete=models.CASCADE, null=True, blank=True)
    academic_year = models.IntegerField()
    trimester = models.IntegerField()
    line_items = models.JSONField()

    def __str__(self):
        return f"Fee Structure for {self.programme.code} - {self.academic_year}/T{self.trimester}"

class Payment(TimeStampedModel):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="payments", null=True, blank=True)
    academic_year = models.IntegerField()
    trimester = models.IntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=50, blank=True)
    ref = models.CharField(max_length=100, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Payment of {self.amount} for {self.student.user.username} for {self.academic_year}/T{self.trimester}"

class FinanceThreshold(TimeStampedModel):
    programme = models.ForeignKey(Programme, on_delete=models.CASCADE, related_name="finance_thresholds", null=True, blank=True)
    academic_year = models.IntegerField()
    trimester = models.IntegerField()
    threshold_amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = ("programme", "academic_year", "trimester")

    def __str__(self):
        return f"Threshold for {self.programme.code} {self.academic_year}/T{self.trimester} is {self.threshold_amount}"

class FinanceStatus(TimeStampedModel):
    class Status(models.TextChoices):
        PAID = 'paid', 'Paid'
        PARTIAL = 'partial', 'Partial'
        PENDING = 'pending', 'Pending'

    class Clearance(models.TextChoices):
        CLEARED_FOR_REGISTRATION = 'cleared_for_registration', 'Cleared for Registration'
        CLEARED_FOR_EXAMS = 'cleared_for_exams', 'Cleared for Exams'
        BLOCKED = 'blocked', 'Blocked'

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="finance_statuses", null=True, blank=True)
    academic_year = models.IntegerField()
    trimester = models.IntegerField()
    total_due = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    
    @property
    def balance(self):
        return self.total_due - self.total_paid

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    clearance_status = models.CharField(max_length=30, choices=Clearance.choices, default=Clearance.BLOCKED)

    class Meta:
        unique_together = ("student", "academic_year", "trimester")

    def __str__(self):
        return f"Finance status for {self.student.user.username} for {self.academic_year}/T{self.trimester} is {self.status}"
