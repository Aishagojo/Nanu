from django.db import models
from core.models import TimeStampedModel


class ResourceTag(TimeStampedModel):
    """Tags for categorizing and filtering resources"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon identifier for the frontend")
    
    def __str__(self):
        return self.name


class ResourceCategory(TimeStampedModel):
    """High-level categories for organizing resources"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    order = models.PositiveIntegerField(default=0)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon identifier for the frontend")
    
    class Meta:
        verbose_name_plural = "Resource categories"
        ordering = ["order", "name"]
    
    def __str__(self):
        return self.name


class Resource(TimeStampedModel):
    class Kind(models.TextChoices):
        VIDEO = "video", "Video"
        IMAGE = "image", "Image"
        PDF = "pdf", "PDF"
        AUDIO = "audio", "Audio"
        DOCUMENT = "document", "Document"
        LINK = "link", "Link"
        
    class DifficultyLevel(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    title = models.CharField(max_length=255)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    description = models.TextField(blank=True)
    url = models.URLField(blank=True)
    file = models.FileField(upload_to="resources/", blank=True)
    
    # Organization
    category = models.ForeignKey(ResourceCategory, null=True, on_delete=models.SET_NULL, related_name='resources')
    course = models.ForeignKey('learning.Course', null=True, blank=True, on_delete=models.SET_NULL, related_name='resources')
    tags = models.ManyToManyField(ResourceTag, blank=True, related_name='resources')
    difficulty_level = models.CharField(max_length=20, choices=DifficultyLevel.choices, default=DifficultyLevel.BEGINNER)
    order_in_category = models.PositiveIntegerField(default=0)
    
    # Accessibility features
    voice_description = models.TextField(blank=True, help_text="Simple description to be read by TTS")
    has_captions = models.BooleanField(default=False, help_text="Whether video/audio has captions")
    has_sign_language = models.BooleanField(default=False, help_text="Whether video has sign language")
    requires_sound = models.BooleanField(default=False, help_text="Whether sound is essential for this resource")
    high_contrast_url = models.URLField(blank=True, help_text="URL to high contrast version if available")
    simplified_text_url = models.URLField(blank=True, help_text="URL to simplified language version if available")
    duration_seconds = models.PositiveIntegerField(null=True, blank=True, help_text="Duration for audio/video content")
    recommended_breaks = models.JSONField(null=True, blank=True, help_text="Suggested break points in seconds")
    
    # Content warnings and prerequisites
    content_warnings = models.TextField(blank=True, help_text="Any content warnings or prerequisites")
    requires_parent = models.BooleanField(default=False, help_text="Whether parent supervision is recommended")
    requires_teacher = models.BooleanField(default=False, help_text="Whether teacher guidance is recommended")
    
    class Meta:
        ordering = ["category__order", "order_in_category", "title"]
    
    def __str__(self):
        return self.title


class ResourceFeedback(TimeStampedModel):
    """Track student engagement and feedback with resources"""
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='feedback')
    student = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='resource_feedback',
                              limit_choices_to={'role': 'student'})
    
    # Engagement metrics
    completed = models.BooleanField(default=False)
    completion_time = models.PositiveIntegerField(null=True, blank=True, help_text="Time taken in seconds")
    difficulty_rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text="1-5 scale")
    enjoyment_rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text="1-5 scale")
    
    # Voice feedback
    voice_feedback = models.FileField(upload_to='feedback/voice/', blank=True)
    voice_feedback_transcript = models.TextField(blank=True)
    
    # Accessibility feedback
    was_accessible = models.BooleanField(null=True, help_text="Whether student found content accessible")
    accessibility_issues = models.TextField(blank=True)
    needed_help = models.BooleanField(default=False)
    helper = models.CharField(max_length=50, blank=True, help_text="Who helped (parent/teacher/none)")
    
    class Meta:
        unique_together = ['resource', 'student']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.student.username} - {self.resource.title}"
