from django.db import models
from core.models import TimeStampedModel


class Resource(TimeStampedModel):
    class Kind(models.TextChoices):
        VIDEO = "video", "Video"
        IMAGE = "image", "Image"
        PDF = "pdf", "PDF"
        AUDIO = "audio", "Audio"
        DOCUMENT = "document", "Document"
        LINK = "link", "Link"

    title = models.CharField(max_length=255)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    description = models.TextField(blank=True)
    url = models.URLField(blank=True)
    file = models.FileField(upload_to="resources/", blank=True)
