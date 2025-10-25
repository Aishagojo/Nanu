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
