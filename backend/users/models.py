from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import pyotp

from core.models import TimeStampedModel


class User(AbstractUser):
    class Roles(models.TextChoices):
        STUDENT = "student", "Student"
        PARENT = "parent", "Parent"
        LECTURER = "lecturer", "Lecturer"
        ADMIN = "admin", "Administrator"
        SUPERADMIN = "superadmin", "Super Administrator"
        HOD = "hod", "Head of Department"
        FINANCE = "finance", "Finance"
        RECORDS = "records", "Student Records"
        LIBRARIAN = "librarian", "Librarian"

    role = models.CharField(max_length=32, choices=Roles.choices, default=Roles.STUDENT)
    display_name = models.CharField(max_length=255, blank=True)
    must_change_password = models.BooleanField(default=False)
    department = models.ForeignKey(
        'core.Department',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='staff_members',
    )
    # Accessibility preferences
    prefers_simple_language = models.BooleanField(default=True)
    prefers_high_contrast = models.BooleanField(default=False)
    speech_rate = models.FloatField(default=0.9)  # for TTS front-end hint
    totp_secret = models.CharField(max_length=32, blank=True, default="")
    totp_enabled = models.BooleanField(default=False)
    totp_activated_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.username

    def ensure_totp_secret(self) -> bool:
        if not self.totp_secret:
            self.totp_secret = pyotp.random_base32()
            return True
        return False

    def provisioning_uri(self) -> str:
        if not self.totp_secret:
            return ""
        identifier = self.email or self.username
        totp = pyotp.TOTP(self.totp_secret)
        return totp.provisioning_uri(name=identifier, issuer_name="EduAssist")

    def verify_totp(self, code: str) -> bool:
        if not self.totp_secret or not code:
            return False
        try:
            totp = pyotp.TOTP(self.totp_secret)
            return totp.verify(str(code), valid_window=1)
        except Exception:
            return False

    def reset_totp(self):
        self.totp_secret = ""
        self.totp_enabled = False
        self.totp_activated_at = None


class ParentStudentLink(TimeStampedModel):
    parent = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="linked_students",
        limit_choices_to={"role": User.Roles.PARENT},
    )
    student = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="parent_links",
        limit_choices_to={"role": User.Roles.STUDENT},
    )
    relationship = models.CharField(max_length=50, blank=True)

    class Meta:
        unique_together = ("parent", "student")
        verbose_name = "Parent-student link"
        verbose_name_plural = "Parent-student links"

    def __str__(self):
        rel = f" ({self.relationship})" if self.relationship else ""
        return f"{self.parent.username} -> {self.student.username}{rel}"


class UserProvisionRequest(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    requested_by = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="provision_requests",
    )
    username = models.CharField(max_length=150)
    display_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    role = models.CharField(max_length=32, choices=User.Roles.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        "users.User",
        null=True,
        blank=True,
        related_name="provision_reviews",
        on_delete=models.SET_NULL,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_user = models.ForeignKey(
        "users.User",
        null=True,
        blank=True,
        related_name="provision_source_request",
        on_delete=models.SET_NULL,
    )
    temporary_password = models.CharField(max_length=128, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("username", "status")

    def __str__(self):
        return f"{self.username} ({self.role}) - {self.status}"
