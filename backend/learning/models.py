from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError

from core.models import TimeStampedModel
from .achievement_models import AchievementCategory, Achievement, StudentAchievement, RewardClaim, TermProgress
from .session_models import CourseSchedule, CourseSession, VoiceAttendance, SessionReminder
from .progress_models import StudentProgress, ActivityLog, CompletionRecord
from .goals_models import LearningGoal, LearningMilestone, LearningSupport, GoalReflection


class Course(TimeStampedModel):
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
    MAX_COURSES_PER_LECTURER = 4

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        ordering = ['code']
        permissions = [
            ('approve_course', 'Can approve course'),
            ('assign_lecturer', 'Can assign lecturer to course'),
        ]

    def clean(self):
        super().clean()
        if self.lecturer_id:
            active_courses = (
                Course.objects.filter(lecturer_id=self.lecturer_id)
                .exclude(pk=self.pk)
                .exclude(status='archived')
                .count()
            )
            if active_courses >= self.MAX_COURSES_PER_LECTURER:
                raise ValidationError(
                    {
                        'lecturer': f'Lecturers can only be assigned to {self.MAX_COURSES_PER_LECTURER} courses.'
                    }
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class Unit(TimeStampedModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="units")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.title


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
