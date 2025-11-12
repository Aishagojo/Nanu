from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import permissions, viewsets, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.models import FeeItem
from users.models import User
from .models import Course, Unit, Enrollment, AttendanceEvent
from .serializers import (
    CourseSerializer,
    UnitSerializer,
    EnrollmentSerializer,
    AttendanceEventSerializer,
)
from .rewards import dispatch_attendance_reward


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all().order_by("code")
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["code", "name", "description"]

    def get_queryset(self):
        qs = super().get_queryset().select_related("lecturer")
        user = self.request.user
        params = self.request.query_params
        student_param = params.get("student") or params.get("student_id")
        if user.is_staff:
            filtered = qs
        elif user.role == User.Roles.LECTURER:
            filtered = qs.filter(lecturer=user)
        elif user.role == User.Roles.STUDENT:
            filtered = qs.filter(enrollments__student=user)
        elif user.role == User.Roles.PARENT:
            student_ids = list(
                user.linked_students.values_list("student_id", flat=True)
            )
            if student_ids:
                filtered = qs.filter(enrollments__student_id__in=student_ids)
            else:
                filtered = qs.none()
        else:
            filtered = qs.none()

        if student_param:
            try:
                student_id = int(student_param)
            except (TypeError, ValueError):
                student_id = None
            if student_id:
                filtered = filtered.filter(enrollments__student_id=student_id)
        return filtered.distinct()


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
            return qs.filter(course__lecturer=user)
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


class QuickEnrollmentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role not in [User.Roles.HOD, User.Roles.RECORDS] and not user.is_staff:
            raise PermissionDenied("Only HOD, records, or staff may enroll students.")
        student_id = request.data.get("student_id")
        student_username = request.data.get("student_username")
        course_id = request.data.get("course_id")
        course_code = request.data.get("course_code")
        if not (student_id or student_username):
            raise ValidationError({"detail": "student_id or student_username is required."})
        if not (course_id or course_code):
            raise ValidationError({"detail": "course_id or course_code is required."})
        if student_username:
            student = get_object_or_404(User, username=student_username, role=User.Roles.STUDENT)
        else:
            student = get_object_or_404(User, pk=student_id, role=User.Roles.STUDENT)
        if course_code:
            course = get_object_or_404(Course, code__iexact=course_code)
        else:
            course = get_object_or_404(Course, pk=course_id)
        serializer = EnrollmentSerializer(
            data={"student": student.id, "course": course.id, "active": True}
        )
        try:
            serializer.is_valid(raise_exception=True)
            enrollment = serializer.save()
        except ValidationError as exc:
            detail = exc.detail
            if isinstance(detail, dict):
                message = detail.get("detail")
                non_field = detail.get("non_field_errors")
                if non_field:
                    # Already enrolled – make the message explicit
                    raise ValidationError(
                        {
                            "detail": f"{student.display_name or student.username} is already enrolled in {course.code}.",
                            "code": "already_enrolled",
                        }
                    ) from exc
                if message:
                    raise ValidationError(detail) from exc
            raise
        return Response(
            {
                "detail": "Student enrolled successfully.",
                "enrollment": EnrollmentSerializer(enrollment).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CourseRosterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_id):
        course = get_object_or_404(Course, pk=course_id)
        user = request.user
        allowed_roles = {User.Roles.HOD, User.Roles.RECORDS, User.Roles.ADMIN}
        if not (
            user.role in allowed_roles
            or user.is_staff
            or (course.lecturer_id and course.lecturer_id == user.id)
        ):
            raise PermissionDenied("You are not allowed to view this roster.")

        enrollments = (
            Enrollment.objects.filter(course=course)
            .select_related("student")
            .order_by("student__username")
        )
        data = {
            "course": {
                "id": course.id,
                "code": course.code,
                "name": course.name,
            },
            "students": [
                {
                    "id": enrollment.student.id,
                    "username": enrollment.student.username,
                    "display_name": enrollment.student.display_name,
                    "active": enrollment.active,
                    "enrollment_id": enrollment.id,
                }
                for enrollment in enrollments
            ],
        }
        return Response(data)


class AttendanceCheckInView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        event_type = request.data.get("event_type") or AttendanceEvent.EventType.LECTURER_MARK
        note = request.data.get("note", "")
        enrollment_id = request.data.get("enrollment_id")
        student_id = request.data.get("student_id")
        course_id = request.data.get("course_id")

        if event_type not in AttendanceEvent.EventType.values:
            raise ValidationError({"detail": f"Invalid event_type '{event_type}'."})

        if enrollment_id:
            enrollment = get_object_or_404(Enrollment, pk=enrollment_id)
        elif student_id and course_id:
            enrollment = get_object_or_404(Enrollment, student_id=student_id, course_id=course_id)
        else:
            raise ValidationError({"detail": "Provide enrollment_id or (student_id + course_id)."})

        if event_type == AttendanceEvent.EventType.STUDENT_CHECKIN:
            if user.role != User.Roles.STUDENT or enrollment.student_id != user.id:
                raise PermissionDenied("Only the student may confirm their own attendance.")
        else:
            if user.role == User.Roles.LECTURER:
                if enrollment.course.lecturer_id != user.id:
                    raise PermissionDenied("Lecturers may only mark attendance for their courses.")
            elif user.role not in {User.Roles.HOD, User.Roles.RECORDS} and not user.is_staff:
                raise PermissionDenied("Role not allowed to mark attendance.")

        event = AttendanceEvent.objects.create(
            enrollment=enrollment,
            marked_by=user,
            event_type=event_type,
            note=note,
        )
        dispatch_attendance_reward(event)
        return Response(AttendanceEventSerializer(event).data, status=status.HTTP_201_CREATED)


class ExamRegistrationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role != User.Roles.STUDENT:
            raise PermissionDenied("Only students can submit exam registration requests.")
        outstanding = Decimal("0")
        for item in FeeItem.objects.filter(student=user):
            outstanding += max(item.amount - item.paid, Decimal("0"))
        if outstanding > 0:
            return Response(
                {
                    "detail": "Fee clearance required before exam registration. Contact finance for assistance.",
                    "allowed": False,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({"detail": "Exam registration confirmed.", "allowed": True})

