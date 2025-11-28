from django.db import models
from core.models import TimeStampedModel
from learning.models import Programme, CurriculumUnit

class ResourceTag(TimeStampedModel):
    """Tags for categorizing and filtering resources"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon identifier for the frontend")
    
    def __str__(self):
        return self.name

class LibraryAsset(TimeStampedModel):
    class AssetType(models.TextChoices):
        PDF = 'pdf', 'PDF'
        VIDEO = 'video', 'Video'
        AUDIO = 'audio', 'Audio'
        LINK = 'link', 'Link'

    class Visibility(models.TextChoices):
        PROGRAMME = 'programme', 'Programme'
        UNIT = 'unit', 'Unit'

    programme = models.ForeignKey(Programme, on_delete=models.CASCADE, null=True, blank=True, related_name='library_assets')
    unit = models.ForeignKey(CurriculumUnit, on_delete=models.CASCADE, null=True, blank=True, related_name='library_assets')
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=AssetType.choices)
    url = models.URLField()
    tags = models.ManyToManyField(ResourceTag, blank=True)
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.PROGRAMME)

    def __str__(self):
        return self.title
