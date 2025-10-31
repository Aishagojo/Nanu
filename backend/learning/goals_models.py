from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from core.models import TimeStampedModel


class LearningGoal(TimeStampedModel):
    """Personalized learning goals for students"""
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name='learning_goals',
                              limit_choices_to={'role': 'student'})
    course = models.ForeignKey('learning.Course', on_delete=models.CASCADE, related_name='student_goals')
    term = models.CharField(max_length=20)
    
    # Goal details
    title = models.CharField(max_length=255)
    description = models.TextField()
    voice_description = models.TextField(blank=True, help_text="Simple description for TTS")
    target_date = models.DateField(null=True, blank=True)
    
    # Progress tracking
    progress_percentage = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    status = models.CharField(max_length=20, choices=[
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('needs_revision', 'Needs Revision'),
    ], default='not_started')
    
    # Support and guidance
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                 null=True, related_name='created_goals')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                  null=True, related_name='approved_goals')
    parent_notified = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.student.username} - {self.title}"


class LearningMilestone(TimeStampedModel):
    """Specific milestones within learning goals"""
    goal = models.ForeignKey(LearningGoal, on_delete=models.CASCADE, related_name='milestones')
    title = models.CharField(max_length=255)
    description = models.TextField()
    voice_description = models.TextField(blank=True, help_text="Simple description for TTS")
    order = models.PositiveIntegerField(default=0)
    
    # Achievement criteria
    required_points = models.PositiveIntegerField(default=0)
    required_attendance = models.PositiveIntegerField(default=0, help_text="Required attendance percentage")
    required_resources = models.ManyToManyField('repository.Resource', blank=True,
                                              related_name='required_for_milestones')
    custom_criteria = models.JSONField(null=True, blank=True)
    
    # Progress
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                  null=True, related_name='verified_milestones')
    
    # Voice feedback
    completion_recording = models.FileField(upload_to='milestones/voice/', blank=True)
    completion_transcript = models.TextField(blank=True)
    
    class Meta:
        ordering = ['goal', 'order']
        
    def __str__(self):
        return f"{self.goal.student.username} - {self.title}"


class LearningSupport(TimeStampedModel):
    """Track support and interventions for learning goals"""
    milestone = models.ForeignKey(LearningMilestone, on_delete=models.CASCADE, related_name='support_records')
    provided_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                  related_name='provided_support')
    support_type = models.CharField(max_length=20, choices=[
        ('guidance', 'Additional Guidance'),
        ('resources', 'Extra Resources'),
        ('practice', 'Practice Session'),
        ('accommodation', 'Learning Accommodation'),
        ('intervention', 'Teacher Intervention'),
    ])
    
    # Support details
    description = models.TextField()
    voice_notes = models.FileField(upload_to='support/voice/', blank=True)
    notes_transcript = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    
    # Resources and follow-up
    resources_provided = models.ManyToManyField('repository.Resource', blank=True,
                                              related_name='used_in_support')
    follow_up_date = models.DateField(null=True, blank=True)
    outcome_notes = models.TextField(blank=True)
    
    # Parent communication
    parent_notified = models.BooleanField(default=False)
    parent_feedback = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.milestone.goal.student.username} - {self.support_type}"


class GoalReflection(TimeStampedModel):
    """Student reflections on their learning goals"""
    goal = models.ForeignKey(LearningGoal, on_delete=models.CASCADE, related_name='reflections')
    milestone = models.ForeignKey(LearningMilestone, null=True, blank=True,
                                on_delete=models.SET_NULL, related_name='reflections')
    
    # Reflection content
    voice_recording = models.FileField(upload_to='reflections/voice/', blank=True)
    transcript = models.TextField(blank=True)
    mood = models.CharField(max_length=20, choices=[
        ('happy', 'Happy'),
        ('proud', 'Proud'),
        ('worried', 'Worried'),
        ('confused', 'Confused'),
        ('determined', 'Determined'),
    ])
    
    # Support needs
    needs_help = models.BooleanField(default=False)
    help_type_requested = models.CharField(max_length=20, blank=True, choices=[
        ('explanation', 'Better Explanation'),
        ('practice', 'More Practice'),
        ('different_method', 'Different Learning Method'),
        ('teacher_help', 'Teacher Help'),
        ('parent_help', 'Parent Help'),
    ])
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.goal.student.username} - {self.created_at}"