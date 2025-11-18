from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from core.mixins import ScopedListMixin
from core.permissions import IsSelfOrElevated
from learning.models import Assignment, Registration
from learning.serializers import AssignmentSerializer, RegistrationSerializer
from users.models import User


class AssignmentViewSet(ScopedListMixin, viewsets.ModelViewSet):
    queryset = Assignment.objects.select_related("unit", "unit__course", "lecturer")
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfOrElevated]

    def get_queryset(self):
        qs = super().get_queryset()
        unit_id = self.request.query_params.get("unit")
        if unit_id:
            qs = qs.filter(unit_id=unit_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if getattr(user, "role", None) == User.Roles.LECTURER:
            serializer.save(lecturer=user, owner_user=user)
        elif user.is_staff or getattr(user, "role", None) in {User.Roles.ADMIN, User.Roles.HOD}:
            serializer.save(owner_user=user)
        else:
            raise PermissionDenied("Only lecturers or admins can create assignments.")

    def perform_update(self, serializer):
        user = self.request.user
        assignment = self.get_object()
        if getattr(user, "role", None) == User.Roles.LECTURER and assignment.lecturer_id != user.id:
            raise PermissionDenied("Lecturers can only update their own assignments.")
        serializer.save(lecturer=assignment.lecturer, owner_user=assignment.owner_user)


class RegistrationViewSet(ScopedListMixin, viewsets.ModelViewSet):
    queryset = Registration.objects.select_related("student", "unit", "unit__course")
    serializer_class = RegistrationSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfOrElevated]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        unit_param = self.request.query_params.get("unit")
        if unit_param:
            qs = qs.filter(unit_id=unit_param)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if getattr(user, "role", None) == User.Roles.STUDENT:
            serializer.save(student=user)
        else:
            serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user
        if serializer.validated_data.get("status") == "approved":
            serializer.save(approved_by=user, approved_at=timezone.now())
        else:
            serializer.save()
