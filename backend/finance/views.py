from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from decimal import Decimal
from django_filters.rest_framework import DjangoFilterBackend
import csv
from django.http import HttpResponse

from users.models import Student
from .models import Payment, FinanceStatus, FeeStructure
from .serializers import PaymentSerializer, FeeStructureSerializer, FinanceStatusSerializer


class FinanceReportView(APIView):
    def get(self, request):
        programme_id = request.query_params.get('programme_id')
        academic_year = request.query_params.get('year')
        trimester = request.query_params.get('trimester')
        report_format = request.query_params.get('format', 'csv')

        queryset = FinanceStatus.objects.all()
        if programme_id:
            queryset = queryset.filter(student__programme_id=programme_id)
        if academic_year:
            queryset = queryset.filter(academic_year=academic_year)
        if trimester:
            queryset = queryset.filter(trimester=trimester)

        if report_format == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="finance_report.csv"'

            writer = csv.writer(response)
            writer.writerow(['Student Username', 'Programme', 'Academic Year', 'Trimester', 'Total Due', 'Total Paid', 'Balance', 'Status'])

            for fs in queryset:
                writer.writerow([
                    fs.student.user.username,
                    fs.student.programme.name if fs.student.programme else '',
                    fs.academic_year,
                    fs.trimester,
                    fs.total_due,
                    fs.total_paid,
                    fs.balance,
                    fs.status
                ])
            return response
        else:
            return Response({'detail': 'Invalid report format requested.'}, status=status.HTTP_400_BAD_REQUEST)


class FeeStructureViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['programme', 'academic_year', 'trimester']


class FinanceStatusViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FinanceStatus.objects.all()
    serializer_class = FinanceStatusSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'academic_year', 'trimester']


class RecordPaymentView(APIView):
    def post(self, request):
        serializer = PaymentSerializer(data=request.data)
        if serializer.is_valid():
            payment = serializer.save()

            # Update finance status
            try:
                student = payment.student
                finance_status, created = FinanceStatus.objects.get_or_create(
                    student=student,
                    academic_year=student.year,
                    trimester=student.trimester,
                )
                finance_status.total_paid += payment.amount
                finance_status.save()
            except Student.DoesNotExist:
                pass

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)