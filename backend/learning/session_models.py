from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import TimeStampedModel
from users.models import Student


class CourseSchedule(TimeStampedModel):
    """Course schedule with recurring sessions"""
    programme = models.ForeignKey('learning.Programme', on_delete=models.CASCADE, related_name='schedules')
    term = models.CharField(max_length=20)
    day_of_week = models.PositiveSmallIntegerField(help_text="0=Monday, 6=Sunday")
    start_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField()
    room = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    voice_reminder = models.TextField(blank=True, help_text="Custom voice reminder for this schedule")
    
    class Meta:
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return f"{self.programme.code} - {days[self.day_of_week]} at {self.start_time}"


class CourseSession(TimeStampedModel):
    """Individual class sessions"""
    schedule = models.ForeignKey(CourseSchedule, on_delete=models.CASCADE, related_name='sessions')
    date = models.DateField()
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], default='scheduled')
    cancellation_reason = models.TextField(blank=True)
    voice_announcement = models.TextField(blank=True, help_text="Custom voice announcement for this session")
    
    class Meta:
        ordering = ['-date', '-actual_start']
        
    def __str__(self):
        return f"{self.schedule.programme.code} - {self.date}"

    def clean(self):
        if self.actual_end and self.actual_start and self.actual_end < self.actual_start:
            raise ValidationError("End time must be after start time")


class VoiceAttendance(TimeStampedModel):
    """Voice-based attendance records"""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, 
                              related_name='voice_attendance')
    session = models.ForeignKey(CourseSession, on_delete=models.CASCADE, related_name='voice_attendance')
    voice_recording = models.FileField(upload_to='attendance/voice/', blank=True)
    transcript = models.TextField(blank=True)
    confidence_score = models.FloatField(null=True, help_text="Voice recognition confidence (0-1)")
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                  null=True, related_name='verified_attendance')
    location_data = models.JSONField(null=True, blank=True, help_text="Optional location verification data")
    
    class Meta:
        unique_together = ['student', 'session']
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.student.user.username} - {self.session.date}"


class SessionReminder(TimeStampedModel):
    """Automated session reminders with voice support"""
    session = models.ForeignKey(CourseSession, on_delete=models.CASCADE, related_name='reminders')
    student = models.ForeignKey(Student, on_delete=models.CASCADE,
                              related_name='session_reminders')
    scheduled_for = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    reminder_type = models.CharField(max_length=20, choices=[
        ('day_before', 'Day Before'),
        ('morning_of', 'Morning Of'),
        ('hour_before', 'Hour Before'),
    ])
    voice_message = models.TextField(blank=True, help_text="Custom voice message for this reminder")
    
    class Meta:
        ordering = ['-scheduled_for']
        unique_together = ['session', 'student', 'reminder_type']
        
    def __str__(self):
        return f"{self.student.user.username} - {self.session.date} ({self.reminder_type})"
        
    def clean(self):
        if self.scheduled_for and self.scheduled_for > self.session.date:
            raise ValidationError("Reminder must be scheduled before the session")