from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, UnitViewSet, EnrollmentViewSet, ProgressSummaryView

router = DefaultRouter()
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"units", UnitViewSet, basename="unit")
router.register(r"enrollments", EnrollmentViewSet, basename="enrollment")

urlpatterns = router.urls + [
    path("students/<int:student_id>/progress/", ProgressSummaryView.as_view(), name="progress-summary"),
]
