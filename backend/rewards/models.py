from django.db import models
from core.models import TimeStampedModel
from users.models import Student, User

class Merit(TimeStampedModel):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='merits')
    awarded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='awarded_merits')
    stars = models.IntegerField()
    reason = models.TextField()

    def __str__(self):
        return f"{self.stars} stars for {self.student.user.username}"