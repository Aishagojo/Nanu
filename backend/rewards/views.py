from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import F

from .serializers import AwardMeritSerializer, MeritSerializer
from .models import Merit
from users.models import Student
from users.serializers import StudentSerializer
from core.permissions import IsAdminOrLecturer

class AwardMeritView(generics.CreateAPIView):
    """
    Awards merit stars to a student.
    Only accessible by Lecturers and Admins.
    """
    serializer_class = AwardMeritSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrLecturer]

    def perform_create(self, serializer):
        merit = serializer.save(awarded_by=self.request.user)
        student = merit.student
        Student.objects.filter(pk=student.pk).update(stars=F('stars') + merit.stars)


class StudentRewardsView(APIView):
    """
    Retrieves a student's total stars and their reward history.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, student_id):
        try:
            student = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        # Basic permission check: user can only see their own rewards, or if they are staff.
        if not request.user.is_staff and request.user.id != student.user_id:
             # A parent should also be able to see this.
            is_parent = hasattr(request.user, 'guardian_profile') and request.user.guardian_profile.linked_students.filter(student=student).exists()
            if not is_parent:
                return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        merits = Merit.objects.filter(student=student).order_by('-created_at')
        student_data = StudentSerializer(student).data
        merits_data = MeritSerializer(merits, many=True).data

        return Response({
            "stars": student_data['stars'],
            "history": merits_data
        })


class LeaderboardView(generics.ListAPIView):
    """
    Shows a leaderboard of students with the most stars.
    """
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Student.objects.order_by('-stars')[:10]