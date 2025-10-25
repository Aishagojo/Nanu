from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied

from users.models import User

from .models import Resource
from .serializers import ResourceSerializer


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all().order_by("id")
    serializer_class = ResourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["title", "description", "kind"]

    def get_queryset(self):
        return Resource.objects.all().order_by("id")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.LECTURER] and not user.is_staff:
            raise PermissionDenied("Only lecturers can upload learning materials.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.LECTURER] and not user.is_staff:
            raise PermissionDenied("Only lecturers can update learning materials.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in [User.Roles.LECTURER] and not user.is_staff:
            raise PermissionDenied("Only lecturers can remove learning materials.")
        instance.delete()
