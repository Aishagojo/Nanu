from decimal import Decimal
from django.test import TestCase

from finance.models import FinanceStatus
from finance.services import update_finance_status
from users.models import User, Student
from learning.models import Programme, Department
from finance.models import FeeStructure, Payment

class FinanceLogicTests(TestCase):

    def setUp(self):
        # Create common test data
        self.department = Department.objects.create(name='Test Department', code='TD')
        self.programme = Programme.objects.create(
            department=self.department,
            name='Test Programme',
            code='TP',
            award_level='Diploma',
            duration_years=2,
            trimesters_per_year=3
        )
        self.user = User.objects.create_user(username='teststudent', role=User.Roles.STUDENT)
        self.student = Student.objects.create(
            user=self.user,
            programme=self.programme,
            year=1,
            trimester=1,
            trimester_label='T1',
            cohort_year=2025
        )
        self.academic_year = 2025
        self.trimester = 1
        self.total_due = Decimal('1000.00')
        self.fee_structure = FeeStructure.objects.create(
            programme=self.programme,
            academic_year=self.academic_year,
            trimester=self.trimester,
            line_items=[{'name': 'Tuition', 'amount': str(self.total_due)}]
        )

    def test_0_percent_paid(self):
        update_finance_status(self.student.pk, self.academic_year, self.trimester)
        status = FinanceStatus.objects.get(student=self.student)
        self.assertEqual(status.clearance_status, FinanceStatus.Clearance.BLOCKED)

    def test_less_than_60_percent_paid(self):
        Payment.objects.create(
            student=self.student,
            academic_year=self.academic_year,
            trimester=self.trimester,
            amount=self.total_due * Decimal('0.59')
        )
        update_finance_status(self.student.pk, self.academic_year, self.trimester)
        status = FinanceStatus.objects.get(student=self.student)
        self.assertEqual(status.clearance_status, FinanceStatus.Clearance.BLOCKED)

    def test_60_percent_paid(self):
        Payment.objects.create(
            student=self.student,
            academic_year=self.academic_year,
            trimester=self.trimester,
            amount=self.total_due * Decimal('0.60')
        )
        update_finance_status(self.student.pk, self.academic_year, self.trimester)
        status = FinanceStatus.objects.get(student=self.student)
        self.assertEqual(status.clearance_status, FinanceStatus.Clearance.CLEARED_FOR_REGISTRATION)

    def test_more_than_60_less_than_100_percent_paid(self):
        Payment.objects.create(
            student=self.student,
            academic_year=self.academic_year,
            trimester=self.trimester,
            amount=self.total_due * Decimal('0.80')
        )
        update_finance_status(self.student.pk, self.academic_year, self.trimester)
        status = FinanceStatus.objects.get(student=self.student)
        self.assertEqual(status.clearance_status, FinanceStatus.Clearance.CLEARED_FOR_REGISTRATION)

    def test_100_percent_paid(self):
        Payment.objects.create(
            student=self.student,
            academic_year=self.academic_year,
            trimester=self.trimester,
            amount=self.total_due
        )
        update_finance_status(self.student.pk, self.academic_year, self.trimester)
        status = FinanceStatus.objects.get(student=self.student)
        self.assertEqual(status.clearance_status, FinanceStatus.Clearance.CLEARED_FOR_EXAMS)

    def test_more_than_100_percent_paid(self):
        Payment.objects.create(
            student=self.student,
            academic_year=self.academic_year,
            trimester=self.trimester,
            amount=self.total_due * Decimal('1.1')
        )
        update_finance_status(self.student.pk, self.academic_year, self.trimester)
        status = FinanceStatus.objects.get(student=self.student)
        self.assertEqual(status.clearance_status, FinanceStatus.Clearance.CLEARED_FOR_EXAMS)

    def test_zero_total_due(self):
        self.fee_structure.line_items = []
        self.fee_structure.save()
        update_finance_status(self.student.pk, self.academic_year, self.trimester)
        status = FinanceStatus.objects.get(student=self.student)
        self.assertEqual(status.clearance_status, FinanceStatus.Clearance.CLEARED_FOR_EXAMS)
