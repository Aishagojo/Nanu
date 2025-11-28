from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from users.models import Student
from users.serializers import StudentSerializer
from learning.models import Registration, CurriculumUnit, TermOffering
from learning.serializers import RegistrationSerializer


class StudentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer

    @action(detail=True, methods=['get'])
    def curriculum_progress(self, request, pk=None):
        student = self.get_object()
        registrations = Registration.objects.filter(student=student)
        serializer = RegistrationSerializer(registrations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def register(self, request, pk=None):
        student = self.get_object()
        unit_ids = request.data.get('unit_ids', [])

        if len(unit_ids) > 4:
            return Response({'detail': 'You can register a maximum of 4 units.'}, status=status.HTTP_400_BAD_REQUEST)

        units = CurriculumUnit.objects.filter(id__in=unit_ids)
        if len(units) != len(unit_ids):
            return Response({'detail': 'Invalid unit ids provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if units are offered by HOD and prerequisites
        for unit in units:
            term_offering = TermOffering.objects.filter(
                programme=student.programme,
                unit=unit,
                academic_year=student.year,
                trimester=student.trimester,
                offered=True
            ).first()
            if not term_offering:
                return Response({'detail': f'Unit {unit.code} is not offered in this term.'}, status=status.HTTP_400_BAD_REQUEST)

            if unit.has_prereq and unit.prereq_unit:
                prereq_completed = Registration.objects.filter(
                    student=student,
                    unit=unit.prereq_unit,
                    status=Registration.Status.APPROVED
                ).exists()
                if not prereq_completed:
                    return Response({'detail': f'Prerequisite {unit.prereq_unit.code} for unit {unit.code} not met.'}, status=status.HTTP_400_BAD_REQUEST)

        registrations = []
        for unit in units:
            reg, created = Registration.objects.get_or_create(
                student=student,
                unit=unit,
                academic_year=student.year,
                trimester=student.trimester,
            )
            registrations.append(reg)

        serializer = RegistrationSerializer(registrations, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
