from django.urls import path, include
from rest_framework.routers import DefaultRouter
# TODO: Refactor all the views in core_views.py and uncomment the lines below
# from .core_views import (
#     CourseViewSet,
#     UnitViewSet,
#     EnrollmentViewSet,
#     ProgressSummaryView,
#     QuickEnrollmentView,
#     CourseRosterView,
#     AttendanceCheckInView,
#     ExamRegistrationView,
# )
from .views.catalogue_views import ProgrammeViewSet, TermOfferingViewSet, LecturerAssignmentViewSet, TimetableViewSet
from .views.achievements import (
    AchievementCategoryViewSet,
    AchievementViewSet,
    StudentAchievementViewSet,
    RewardClaimViewSet,
    TermProgressViewSet,
)
from .views.assignments import (
    AssignmentViewSet,
    RegistrationViewSet,
    SubmissionViewSet,
)
from .views.progress_views import ProgressSummaryView

router = DefaultRouter()
router.register(r"programmes", ProgrammeViewSet, basename="programme")
router.register(r"term-offerings", TermOfferingViewSet, basename="term-offering")
router.register(r"lecturer-assignments", LecturerAssignmentViewSet, basename="lecturer-assignment")
router.register(r"timetables", TimetableViewSet, basename="timetable")
router.register(r"submissions", SubmissionViewSet, basename="submission")
# router.register(r"courses", CourseViewSet, basename="course")
# router.register(r"units", UnitViewSet, basename="unit")
# router.register(r"enrollments", EnrollmentViewSet, basename="enrollment")
router.register(r"achievement-categories", AchievementCategoryViewSet, basename="achievement-category")
router.register(r"achievements", AchievementViewSet, basename="achievement")
router.register(r"student-achievements", StudentAchievementViewSet, basename="student-achievement")
router.register(r"reward-claims", RewardClaimViewSet, basename="reward-claim")
router.register(r"term-progress", TermProgressViewSet, basename="term-progress")
router.register(r"assignments", AssignmentViewSet, basename="assignment")
router.register(r"registrations", RegistrationViewSet, basename="registration")

custom_patterns = [
    path("students/<int:student_id>/progress/", ProgressSummaryView.as_view(), name="progress-summary"),
    # path("enrollments/quick/", QuickEnrollmentView.as_view(), name="quick-enrollment"),
    # path("courses/<int:course_id>/roster/", CourseRosterView.as_view(), name="course-roster"),
    # path("attendance/check-in/", AttendanceCheckInView.as_view(), name="attendance-check-in"),
    # path("exams/register/", ExamRegistrationView.as_view(), name="exam-register"),
]

urlpatterns = router.urls + custom_patterns
