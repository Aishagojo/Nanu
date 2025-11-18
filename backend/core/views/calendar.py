from rest_framework import permissions, viewsets

from core.mixins import ScopedListMixin
from core.models import CalendarEvent
from core.permissions import IsSelfOrElevated
from core.serializers import CalendarEventSerializer


class CalendarEventViewSet(ScopedListMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = CalendarEventSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfOrElevated]
    queryset = CalendarEvent.objects.select_related("owner_user").order_by("start_at")

    def get_queryset(self):
        qs = super().get_queryset()
        owner_param = self.request.query_params.get("owner", "me")
        if owner_param != "all" or not (self.request.user.is_staff or self.request.user.is_superuser):
            qs = qs.filter(owner_user=self.request.user)
        start = self.request.query_params.get("from")
        end = self.request.query_params.get("to")
        if start:
            qs = qs.filter(end_at__gte=start)
        if end:
            qs = qs.filter(start_at__lte=end)
        return qs
