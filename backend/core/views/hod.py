from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Count, Prefetch
from core.models import Department
from learning.models import Course, Enrollment
from django.core.exceptions import ValidationError
from .serializers import (
    DepartmentSerializer,
    LecturerSerializer,
    CourseAssignmentSerializer,
    CourseAssignSerializer,
    CourseCreateSerializer,
    CourseEnrollSerializer,
    StudentSummarySerializer,
)

User = get_user_model()

class DepartmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for department management.
    Only HODs and admins can access.
    """
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Department.objects.all()
        return Department.objects.filter(head=user)

    @action(detail=True, methods=['get'])
    def lecturers(self, request, pk=None):
        """Get all lecturers in this department"""
        department = self.get_object()
        lecturers = (
            User.objects.filter(role=User.Roles.LECTURER)
            .filter(
                Q(department=department)
                | Q(taught_courses__department=department)
            )
            .distinct()
            .annotate(
                course_count=Count(
                    'taught_courses',
                    filter=Q(
                        taught_courses__department=department,
                        taught_courses__status__in=['draft', 'pending', 'approved', 'active'],
                    ),
                )
            )
            .prefetch_related(
                Prefetch(
                    'taught_courses',
                    queryset=Course.objects.filter(department=department).order_by('code'),
                    to_attr='department_courses',
                )
            )
        )
        serializer = LecturerSerializer(lecturers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def courses(self, request, pk=None):
        """Get all courses in this department"""
        department = self.get_object()
        courses = (
            Course.objects.filter(department=department)
            .select_related('lecturer', 'department')
            .prefetch_related('enrollments__student')
            .order_by('code')
        )
        serializer = CourseAssignmentSerializer(courses, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_lecturer(self, request, pk=None):
        """Add a new lecturer to the department"""
        department = self.get_object()
        data = request.data
        required_fields = ['username', 'email', 'display_name', 'password']
        missing = [field for field in required_fields if not data.get(field)]
        if missing:
            return Response(
                {'error': f"Missing required fields: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username=data['username']).exists():
            return Response(
                {'error': 'Username already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            display_name=data.get('display_name', ''),
            role=User.Roles.LECTURER,
            department=department,
        )
        serializer = LecturerSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def assign_course(self, request, pk=None):
        """Assign a course to a lecturer"""
        department = self.get_object()
        serializer = CourseAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course_id = serializer.validated_data['course_id']
        lecturer_id = serializer.validated_data['lecturer_id']
        try:
            course = Course.objects.select_related('department').get(pk=course_id, department=department)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found in this department'},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            lecturer = User.objects.get(pk=lecturer_id, role=User.Roles.LECTURER)
        except User.DoesNotExist:
            return Response({'error': 'Lecturer not found'}, status=status.HTTP_404_NOT_FOUND)
        if lecturer.department_id and lecturer.department_id != department.id:
            return Response(
                {'error': 'Lecturer belongs to another department'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        course.lecturer = lecturer
        try:
            course.save()
        except ValidationError as exc:
            return Response(exc.message_dict or exc.messages, status=status.HTTP_400_BAD_REQUEST)
        if lecturer.department_id != department.id:
            lecturer.department = department
            lecturer.save(update_fields=['department'])
        return Response(CourseAssignmentSerializer(course).data)

    @action(detail=True, methods=['post'])
    def approve_course(self, request, pk=None):
        """Approve a course for the department"""
        department = self.get_object()
        course_id = request.data.get('course_id')

        try:
            course = Course.objects.get(pk=course_id, department=department)
            course.status = 'approved'
            course.save()
            return Response({'status': 'Course approved successfully'})
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found in this department'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """List students enrolled in courses within this department"""
        department = self.get_object()
        enrollments = (
            Enrollment.objects.filter(course__department=department, active=True)
            .select_related('student', 'course')
            .order_by('student__username')
        )
        student_map = {}
        for enrollment in enrollments:
            student = enrollment.student
            entry = student_map.setdefault(
                student.id,
                {
                    'id': student.id,
                    'username': student.username,
                    'display_name': student.display_name or student.username,
                    'course_ids': set(),
                    'course_codes': [],
                },
            )
            entry['course_ids'].add(enrollment.course_id)
            code = enrollment.course.code or enrollment.course.name
            if code and code not in entry['course_codes']:
                entry['course_codes'].append(code)
        results = [
            {
                'id': data['id'],
                'username': data['username'],
                'display_name': data['display_name'],
                'course_ids': list(data['course_ids']),
                'course_codes': data['course_codes'],
            }
            for data in student_map.values()
        ]
        serializer = StudentSummarySerializer(results, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def create_course(self, request, pk=None):
        """Create a new course within the department"""
        department = self.get_object()
        serializer = CourseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        lecturer = None
        if data.get('lecturer_id'):
            try:
                lecturer = User.objects.get(pk=data['lecturer_id'], role=User.Roles.LECTURER)
            except User.DoesNotExist:
                return Response({'error': 'Lecturer not found'}, status=status.HTTP_404_NOT_FOUND)
            if lecturer.department_id and lecturer.department_id != department.id:
                return Response(
                    {'error': 'Lecturer belongs to another department'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        course = Course(
            code=data['code'],
            name=data['name'],
            description=data.get('description', ''),
            department=department,
            lecturer=lecturer,
            status=data.get('status') or 'draft',
        )
        try:
            course.save()
        except ValidationError as exc:
            return Response(exc.message_dict or exc.messages, status=status.HTTP_400_BAD_REQUEST)
        if lecturer and lecturer.department_id != department.id:
            lecturer.department = department
            lecturer.save(update_fields=['department'])
        student_ids = data.get('student_ids') or []
        if student_ids:
            with transaction.atomic():
                for student_id in student_ids:
                    try:
                        student = User.objects.get(pk=student_id, role=User.Roles.STUDENT)
                    except User.DoesNotExist:
                        transaction.set_rollback(True)
                        return Response(
                            {'error': f'Student {student_id} not found'},
                            status=status.HTTP_404_NOT_FOUND,
                        )
                    Enrollment.objects.get_or_create(student=student, course=course, defaults={'active': True})
        course.refresh_from_db()
        return Response(CourseAssignmentSerializer(course).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def enroll_students(self, request, pk=None):
        """Enroll students into a course"""
        department = self.get_object()
        serializer = CourseEnrollSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course_id = serializer.validated_data['course_id']
        student_ids = serializer.validated_data['student_ids']
        try:
            course = Course.objects.get(pk=course_id, department=department)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found in this department'},
                status=status.HTTP_404_NOT_FOUND,
            )
        with transaction.atomic():
            for student_id in student_ids:
                try:
                    student = User.objects.get(pk=student_id, role=User.Roles.STUDENT)
                except User.DoesNotExist:
                    transaction.set_rollback(True)
                    return Response(
                        {'error': f'Student {student_id} not found'},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                enrollment, _ = Enrollment.objects.get_or_create(
                    student=student,
                    course=course,
                    defaults={'active': True},
                )
                if not enrollment.active:
                    enrollment.active = True
                    enrollment.save(update_fields=['active'])
        course.refresh_from_db()
        serializer = CourseAssignmentSerializer(course)
        return Response(serializer.data)

class HodDashboardViewSet(viewsets.ViewSet):
    """
    API endpoint for HOD dashboard.
    Provides overview and statistics for department management.
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        user = request.user
        if not user.is_staff or (not user.is_superuser and not hasattr(user, 'department_headed')):
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get department stats
        departments = Department.objects.filter(head=user) if not user.is_superuser else Department.objects.all()
        
        dashboard_data = []
        for dept in departments:
            courses = Course.objects.filter(department=dept)
            lecturers = User.objects.filter(
                role='lecturer',
                taught_courses__department=dept
            ).distinct()
            
            dept_data = {
                'department': {
                    'id': dept.id,
                    'name': dept.name,
                    'code': dept.code,
                },
                'statistics': {
                    'total_courses': courses.count(),
                    'active_courses': courses.filter(status='active').count(),
                    'pending_courses': courses.filter(status='pending').count(),
                    'total_lecturers': lecturers.count(),
                },
                'recent_courses': CourseAssignmentSerializer(
                    courses.order_by('-created_at')[:5],
                    many=True
                ).data,
                'recent_lecturers': LecturerSerializer(
                    lecturers.order_by('-date_joined')[:5],
                    many=True
                ).data,
            }
            dashboard_data.append(dept_data)
            
        return Response(dashboard_data)
