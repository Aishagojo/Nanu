from rest_framework.routers import DefaultRouter

from core.views.calendar import CalendarEventViewSet

router = DefaultRouter()
router.register(r"events", CalendarEventViewSet, basename="calendar-event")

urlpatterns = router.urls
