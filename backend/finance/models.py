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

