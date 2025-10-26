from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    CourseViewSet,
    UnitViewSet,
    EnrollmentViewSet,
    ProgressSummaryView,
    QuickEnrollmentView,
    CourseRosterView,
    AttendanceCheckInView,
    ExamRegistrationView,
)

router = DefaultRouter()
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"units", UnitViewSet, basename="unit")
router.register(r"enrollments", EnrollmentViewSet, basename="enrollment")

urlpatterns = router.urls + [
    path("students/<int:student_id>/progress/", ProgressSummaryView.as_view(), name="progress-summary"),
    path("enrollments/quick/", QuickEnrollmentView.as_view(), name="quick-enrollment"),
    path("courses/<int:course_id>/roster/", CourseRosterView.as_view(), name="course-roster"),
    path("attendance/check-in/", AttendanceCheckInView.as_view(), name="attendance-check-in"),
    path("exams/register/", ExamRegistrationView.as_view(), name="exam-register"),
]
