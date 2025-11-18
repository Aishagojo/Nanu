from rest_framework import permissions, viewsets

from core.mixins import ScopedListMixin
from core.permissions import IsSelfOrElevated

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(ScopedListMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.select_related("user").order_by("-created_at")
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfOrElevated]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(user=self.request.user)
