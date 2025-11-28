from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from users.models import Lecturer
from users.serializers import LecturerSerializer
from learning.models import LecturerAssignment
from learning.serializers import LecturerAssignmentSerializer


class LecturerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lecturer.objects.all()
    serializer_class = LecturerSerializer

    @action(detail=True, methods=['get'])
    def assignments(self, request, pk=None):
        lecturer = self.get_object()
        assignments = LecturerAssignment.objects.filter(lecturer=lecturer)
        serializer = LecturerAssignmentSerializer(assignments, many=True)
        return Response(serializer.data)
