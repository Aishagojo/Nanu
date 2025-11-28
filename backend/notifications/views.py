from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.mixins import ScopedListMixin
from core.permissions import IsSelfOrElevated
from users.models import User

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(ScopedListMixin, viewsets.ModelViewSet):
    queryset = Notification.objects.select_related("user").order_by("-created_at")
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfOrElevated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role in [User.Roles.ADMIN, User.Roles.HOD, User.Roles.RECORDS, User.Roles.FINANCE] or user.is_staff:
            user_id = self.request.query_params.get("user_id")
            if user_id:
                qs = qs.filter(user_id=user_id)
            return qs
        return qs.filter(user=user)

    @action(detail=False, methods=['post'])
    def schedule(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
