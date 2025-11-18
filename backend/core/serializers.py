from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import CalendarEvent, Department, DeviceRegistration
from learning.models import Course, Enrollment

User = get_user_model()

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'head']
        read_only_fields = ['head']

class LecturerSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()
    course_count = serializers.IntegerField(read_only=True)
    course_codes = serializers.SerializerMethodField()
    remaining_capacity = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'display_name', 
            'department_name', 'date_joined', 'course_count',
            'course_codes', 'remaining_capacity'
        ]
        read_only_fields = ['date_joined']
        extra_kwargs = {
            'password': {'write_only': True}
        }
        
    def get_department_name(self, obj):
        if obj.department:
            return obj.department.name
        course = obj.taught_courses.select_related('department').first()
        return course.department.name if course and course.department else None

    def get_course_codes(self, obj):
        courses = getattr(obj, 'department_courses', None)
        if courses is None:
            courses = obj.taught_courses.all()
        return [course.code for course in courses]

    def get_remaining_capacity(self, obj):
        course_count = getattr(obj, 'course_count', None)
        if course_count is None:
            course_count = obj.taught_courses.exclude(status='archived').count()
        return max(Course.MAX_COURSES_PER_LECTURER - course_count, 0)
        
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
        user.role = 'lecturer'
        user.save()
        return user

class CourseAssignmentSerializer(serializers.ModelSerializer):
    lecturer_name = serializers.CharField(source='lecturer.display_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    lecturer_id = serializers.IntegerField(source='lecturer.id', read_only=True)
    students = serializers.SerializerMethodField()
    lecturer_email = serializers.EmailField(source='lecturer.email', read_only=True)
    
    class Meta:
        model = Course
        fields = [
            'id', 'code', 'name', 'description', 'status',
            'lecturer', 'lecturer_id', 'lecturer_name', 'lecturer_email',
            'department', 'department_name', 'students'
        ]
        read_only_fields = ['status', 'department']

    def get_students(self, obj):
        enrollments = obj.enrollments.select_related('student').order_by('student__username')
        return [
            {
                'id': enrollment.student.id,
                'username': enrollment.student.username,
                'display_name': enrollment.student.display_name,
            }
            for enrollment in enrollments
        ]

class CourseApprovalSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    approval_notes = serializers.CharField(required=False)

class CourseAssignSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    lecturer_id = serializers.IntegerField()

class CourseCreateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=20)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    lecturer_id = serializers.IntegerField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=[choice[0] for choice in Course._meta.get_field('status').choices],
        required=False,
    )
    student_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )

class CourseEnrollSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    student_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )

class StudentSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    display_name = serializers.CharField(allow_blank=True)
    course_ids = serializers.ListField(child=serializers.IntegerField())
    course_codes = serializers.ListField(child=serializers.CharField())


class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = [
            "id",
            "owner_user",
            "title",
            "description",
            "start_at",
            "end_at",
            "timezone_hint",
            "source_type",
            "source_id",
            "metadata",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class DeviceRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceRegistration
        fields = ["platform", "push_token", "app_id"]
