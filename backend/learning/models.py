from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel
from .achievement_models import AchievementCategory, Achievement, StudentAchievement, RewardClaim, TermProgress
from .session_models import CourseSchedule, CourseSession, VoiceAttendance, SessionReminder
from .progress_models import StudentProgress, ActivityLog, CompletionRecord
from .goals_models import LearningGoal, LearningMilestone, LearningSupport, GoalReflection


class Course(TimeStampedModel):
    MAX_COURSES_PER_LECTURER = 4

    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    department = models.ForeignKey('core.Department', on_delete=models.CASCADE, related_name='courses', null=True, blank=True)
    lecturer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='taught_courses',
        limit_choices_to={'role': 'lecturer'}
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('pending', 'Pending Approval'),
            ('approved', 'Approved'),
            ('active', 'Active'),
            ('archived', 'Archived')
        ],
        default='draft'
    )

    def __str__(self):
        return f"{self.code} - {self.name}"

    def clean(self):
        super().clean()
        if self.lecturer_id:
            active_courses = (
                Course.objects.exclude(pk=self.pk)
                .filter(lecturer_id=self.lecturer_id)
                .exclude(status='archived')
                .count()
            )
            if active_courses >= self.MAX_COURSES_PER_LECTURER:
                raise ValidationError(
                    f"Lecturers can only be assigned to {self.MAX_COURSES_PER_LECTURER} courses."
                )

    class Meta:
        ordering = ['code']
        permissions = [
            ('approve_course', 'Can approve course'),
            ('assign_lecturer', 'Can assign lecturer to course'),
        ]

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class Unit(TimeStampedModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="units")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.title

    def is_taught_by(self, lecturer) -> bool:
        """
        Helper to check if the provided lecturer (User) is assigned to this unit's course.
        """
        if not lecturer:
            return False
        lecturer_id = getattr(lecturer, "id", None)
        if lecturer_id is None:
            lecturer = getattr(lecturer, "user", None)
            lecturer_id = getattr(lecturer, "id", None)
        if lecturer_id is None or not self.course_id:
            return False
        return self.course.lecturer_id == lecturer_id


class Assignment(TimeStampedModel):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("closed", "Closed"),
    ]

    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="assignments")
    lecturer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="draft")
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_assignments",
    )

    class Meta:
        ordering = ["-due_at", "-created_at"]

    def save(self, *args, **kwargs):
        if not self.owner_user_id:
            self.owner_user_id = self.lecturer_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.unit_id})"


class Registration(TimeStampedModel):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="registrations",
    )
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="registrations")
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="pending")
    academic_year = models.CharField(max_length=9, blank=True)
    trimester = models.PositiveSmallIntegerField(default=1)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_registrations",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("student", "unit", "academic_year", "trimester")
        ordering = ["-created_at"]

    def mark_approved(self, approver):
        self.status = "approved"
        self.approved_by = approver
        self.approved_at = timezone.now()
        self.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])


class Enrollment(TimeStampedModel):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("student", "course")

    MAX_ACTIVE_COURSES = 4

    def clean(self):
        super().clean()
        if self.student_id:
            current = (
                Enrollment.objects.exclude(pk=self.pk)
                .filter(student_id=self.student_id, active=True)
                .count()
            )
            if self.active and current >= self.MAX_ACTIVE_COURSES:
                raise ValidationError(f"Students may enroll in at most {self.MAX_ACTIVE_COURSES} courses.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class Grade(TimeStampedModel):
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="grades")
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="grades")
    score = models.DecimalField(max_digits=5, decimal_places=2)
    out_of = models.DecimalField(max_digits=5, decimal_places=2, default=100)


class AttendanceEvent(TimeStampedModel):
    class EventType(models.TextChoices):
        LECTURER_MARK = "lecturer_mark", "Lecturer Mark"
        STUDENT_CHECKIN = "student_checkin", "Student Check-in"

    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="attendance_events")
    marked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_marked")
    event_type = models.CharField(max_length=32, choices=EventType.choices)
    note = models.CharField(max_length=255, blank=True)
    reward_tagged = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
