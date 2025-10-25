from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError

from core.models import TimeStampedModel


class Course(TimeStampedModel):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="owned_courses")

    def __str__(self):
        return f"{self.code} - {self.name}"


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

