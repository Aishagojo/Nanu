from django.shortcuts import get_object_or_404
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User
from .models import Course, Unit, Enrollment
from .serializers import CourseSerializer, UnitSerializer, EnrollmentSerializer


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all().order_by("code")
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["code", "name", "description"]


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all().order_by("id")
    serializer_class = UnitSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["title", "description"]


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.select_related("student", "course").order_by("student_id", "course__code")
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.role == User.Roles.HOD or user.is_staff:
            return qs
        if user.role == User.Roles.STUDENT:
            return qs.filter(student=user)
        if user.role == User.Roles.LECTURER:
            return qs.filter(course__owner=user)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.HOD] and not user.is_staff:
            raise PermissionDenied("Only heads of department can assign courses to students.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.HOD] and not user.is_staff:
            raise PermissionDenied("Only heads of department can update student course assignments.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in [User.Roles.HOD] and not user.is_staff:
            raise PermissionDenied("Only heads of department can remove student course assignments.")
        instance.delete()


class ProgressSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, student_id):
        student = get_object_or_404(User, pk=student_id, role=User.Roles.STUDENT)
        user = request.user
        if user.role == User.Roles.PARENT:
            if not user.linked_students.filter(student=student).exists():
                raise PermissionDenied("Parent cannot access this student's progress.")
        elif user.role == User.Roles.STUDENT:
            if student.id != user.id:
                raise PermissionDenied("Students can only view their own progress.")
        elif user.role not in [User.Roles.LECTURER, User.Roles.HOD, User.Roles.RECORDS] and not user.is_staff:
            raise PermissionDenied("Role not allowed to view student progress.")

        enrollments = (
            Enrollment.objects.filter(student=student)
            .select_related("course")
            .prefetch_related("grades__unit", "course__units")
        )

        course_summaries = []
        overall_scores = []
        completed_units = 0
        total_units = 0

        for enrollment in enrollments:
            course = enrollment.course
            units = list(course.units.all())
            total_units += len(units)
            grades = enrollment.grades.all()
            grade_items = []
            course_scores = []
            for grade in grades:
                percent = float((grade.score / (grade.out_of or 1)) * 100)
                course_scores.append(percent)
                overall_scores.append(percent)
                completed_units += 1
                grade_items.append(
                    {
                        "unit_id": grade.unit_id,
                        "unit_title": grade.unit.title,
                        "score": float(grade.score),
                        "out_of": float(grade.out_of),
                        "percent": percent,
                    }
                )

            course_average = sum(course_scores) / len(course_scores) if course_scores else None
            course_summaries.append(
                {
                    "course": {
                        "id": course.id,
                        "code": course.code,
                        "name": course.name,
                    },
                    "active": enrollment.active,
                    "unit_count": len(units),
                    "completed_units": len(course_scores),
                    "average_score": course_average,
                    "grades": grade_items,
                }
            )

        overall_average = sum(overall_scores) / len(overall_scores) if overall_scores else None

        response = {
            "student": {
                "id": student.id,
                "username": student.username,
                "display_name": student.display_name,
            },
            "overall_average": overall_average,
            "courses": course_summaries,
            "completed_units": completed_units,
            "total_units": total_units,
        }
        return Response(response)
