from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied

from users.models import User
from learning.models import Course

from .models import Resource
from .serializers import ResourceSerializer


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all().order_by("id")
    serializer_class = ResourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["title", "description", "kind"]

    def get_queryset(self):
        return Resource.objects.all().order_by("id")

    def _validate_course_access(self, course: Course | None, user: User) -> None:
        if not course or user.is_staff:
            return
        if user.role == User.Roles.LECTURER and course.lecturer_id and course.lecturer_id != user.id:
            raise PermissionDenied("You can only attach materials to your own courses.")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.LECTURER] and not user.is_staff:
            raise PermissionDenied("Only lecturers can upload learning materials.")
        course = serializer.validated_data.get('course')
        self._validate_course_access(course, user)
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.LECTURER] and not user.is_staff:
            raise PermissionDenied("Only lecturers can update learning materials.")
        course = serializer.validated_data.get('course', serializer.instance.course)
        self._validate_course_access(course, user)
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in [User.Roles.LECTURER] and not user.is_staff:
            raise PermissionDenied("Only lecturers can remove learning materials.")
        instance.delete()
