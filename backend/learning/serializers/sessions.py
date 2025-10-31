from rest_framework import serializers
from django.utils import timezone
from ..session_models import CourseSchedule, CourseSession, VoiceAttendance, SessionReminder


class CourseScheduleSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)

    class Meta:
        model = CourseSchedule
        fields = [
            'id', 'course', 'course_code', 'course_name', 'term',
            'day_of_week', 'start_time', 'duration_minutes', 'room',
            'is_active', 'voice_reminder', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        """Ensure day_of_week is 0-6"""
        day = data.get('day_of_week')
        if day is not None and (day < 0 or day > 6):
            raise serializers.ValidationError({
                'day_of_week': 'Day must be between 0 (Monday) and 6 (Sunday)'
            })
        return data


class CourseSessionSerializer(serializers.ModelSerializer):
    schedule_details = CourseScheduleSerializer(source='schedule', read_only=True)
    attendance_count = serializers.SerializerMethodField()
    voice_attendance_count = serializers.SerializerMethodField()

    class Meta:
        model = CourseSession
        fields = [
            'id', 'schedule', 'schedule_details', 'date', 'actual_start',
            'actual_end', 'status', 'cancellation_reason', 'voice_announcement',
            'attendance_count', 'voice_attendance_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        """Validate session times and status transitions"""
        if data.get('actual_end') and data.get('actual_start'):
            if data['actual_end'] < data['actual_start']:
                raise serializers.ValidationError({
                    'actual_end': 'End time must be after start time'
                })

        # Prevent marking future sessions as completed
        if data.get('status') == 'completed' and data.get('date'):
            if data['date'] > timezone.now().date():
                raise serializers.ValidationError({
                    'status': 'Cannot mark future sessions as completed'
                })

        return data

    def get_attendance_count(self, obj):
        return obj.voice_attendance.count()

    def get_voice_attendance_count(self, obj):
        return obj.voice_attendance.exclude(voice_recording='').count()


class VoiceAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    verifier_name = serializers.CharField(source='verified_by.display_name', read_only=True)
    session_details = serializers.SerializerMethodField()

    class Meta:
        model = VoiceAttendance
        fields = [
            'id', 'student', 'student_name', 'session', 'session_details',
            'voice_recording', 'transcript', 'confidence_score',
            'verified_by', 'verifier_name', 'location_data',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'verified_by']

    def get_session_details(self, obj):
        """Return basic session info"""
        return {
            'date': obj.session.date,
            'course_code': obj.session.schedule.course.code,
            'status': obj.session.status
        }

    def validate(self, data):
        """Prevent duplicate attendance records"""
        student = data.get('student')
        session = data.get('session')
        
        if student and session:
            if self.Meta.model.objects.filter(
                student=student,
                session=session
            ).exists():
                raise serializers.ValidationError(
                    'Attendance record already exists for this student and session'
                )
        return data


class SessionReminderSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    session_details = serializers.SerializerMethodField()

    class Meta:
        model = SessionReminder
        fields = [
            'id', 'session', 'session_details', 'student', 'student_name',
            'scheduled_for', 'sent_at', 'acknowledged_at', 'reminder_type',
            'voice_message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'sent_at', 'acknowledged_at']

    def get_session_details(self, obj):
        """Return basic session info"""
        return {
            'date': obj.session.date,
            'course_code': obj.session.schedule.course.code,
            'start_time': obj.session.schedule.start_time
        }

    def validate(self, data):
        """Ensure reminder is scheduled before session"""
        scheduled_for = data.get('scheduled_for')
        session = data.get('session')
        
        if scheduled_for and session and scheduled_for.date() > session.date:
            raise serializers.ValidationError({
                'scheduled_for': 'Reminder must be scheduled before the session date'
            })
        return data