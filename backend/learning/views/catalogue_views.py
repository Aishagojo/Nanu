from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Programme, CurriculumUnit, TermOffering, LecturerAssignment, Timetable
from ..serializers import ProgrammeSerializer, CurriculumUnitSerializer, TermOfferingSerializer, LecturerAssignmentSerializer, TimetableSerializer


class ProgrammeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Programme.objects.all()
    serializer_class = ProgrammeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['department']

    @action(detail=True, methods=['get'])
    def curriculum(self, request, pk=None):
        programme = self.get_object()
        curriculum = CurriculumUnit.objects.filter(programme=programme)
        serializer = CurriculumUnitSerializer(curriculum, many=True)
        return Response(serializer.data)


class TermOfferingViewSet(viewsets.ModelViewSet):
    queryset = TermOffering.objects.all()
    serializer_class = TermOfferingSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['programme', 'academic_year', 'trimester']


class LecturerAssignmentViewSet(viewsets.ModelViewSet):
    queryset = LecturerAssignment.objects.all()
    serializer_class = LecturerAssignmentSerializer


class TimetableViewSet(viewsets.ModelViewSet):
    queryset = Timetable.objects.all()
    serializer_class = TimetableSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['programme', 'lecturer']
