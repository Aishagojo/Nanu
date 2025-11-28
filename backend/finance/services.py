from decimal import Decimal
from django.db.models import Sum

from .models import FinanceStatus, FeeStructure, Payment
from users.models import Student

def update_finance_status(student_id: int, academic_year: int, trimester: int):
    """
    Updates the finance status for a student for a given term.
    This should be triggered after a payment is made.
    """
    try:
        student = Student.objects.get(pk=student_id)
        programme = student.programme
    except Student.DoesNotExist:
        return

    # Get or create the finance status
    finance_status, _ = FinanceStatus.objects.get_or_create(
        student=student,
        academic_year=academic_year,
        trimester=trimester,
    )

    # Get the total due amount from the fee structure
    try:
        fee_structure = FeeStructure.objects.get(
            programme=programme,
            academic_year=academic_year,
            trimester=trimester,
        )
        # Assuming line_items is a list of dicts with 'amount' key
        total_due = sum(Decimal(item['amount']) for item in fee_structure.line_items)
    except FeeStructure.DoesNotExist:
        total_due = Decimal("0")

    # Calculate the total paid amount
    total_paid = Payment.objects.filter(
        student=student,
        academic_year=academic_year,
        trimester=trimester
    ).aggregate(total=Sum('amount'))['total'] or Decimal("0")
    
    finance_status.total_due = total_due
    finance_status.total_paid = total_paid

    if total_due > 0:
        if total_paid >= total_due:
            finance_status.status = FinanceStatus.Status.PAID
            finance_status.clearance_status = FinanceStatus.Clearance.CLEARED_FOR_EXAMS
        elif total_paid > 0:
            finance_status.status = FinanceStatus.Status.PARTIAL
            # 60/40 rule
            if total_paid >= (total_due * Decimal("0.6")):
                finance_status.clearance_status = FinanceStatus.Clearance.CLEARED_FOR_REGISTRATION
            else:
                finance_status.clearance_status = FinanceStatus.Clearance.BLOCKED
        else:
            finance_status.status = FinanceStatus.Status.PENDING
            finance_status.clearance_status = FinanceStatus.Clearance.BLOCKED
    else: # total_due is 0
        finance_status.status = FinanceStatus.Status.PAID
        finance_status.clearance_status = FinanceStatus.Clearance.CLEARED_FOR_EXAMS

    finance_status.save()

    return finance_status