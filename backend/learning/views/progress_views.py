from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404

from users.models import Student
from learning.models import Registration, Submission, CurriculumUnit

class ProgressSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, student_id):
        student = get_object_or_404(Student, pk=student_id)
        user = request.user

        # Permission check
        if user.role == 'student':
            if user.id != student.user_id:
                return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'parent':
            if not hasattr(user, 'guardian_profile') or not user.guardian_profile.linked_students.filter(student=student).exists():
                return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        elif user.role not in ['lecturer', 'hod', 'records', 'admin', 'superadmin']:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        registrations = Registration.objects.filter(student=student, status='approved').select_related('unit__programme')
        
        unit_progress = []
        completed_units = 0
        total_units = registrations.count()
        
        all_submissions = Submission.objects.filter(student=student).select_related('assignment__unit')
        
        # Group submissions by unit
        submissions_by_unit = {}
        for sub in all_submissions:
            if sub.assignment.unit.id not in submissions_by_unit:
                submissions_by_unit[sub.assignment.unit.id] = []
            submissions_by_unit[sub.assignment.unit.id].append(sub)

        for reg in registrations:
            unit = reg.unit
            submissions_for_unit = submissions_by_unit.get(unit.id, [])
            
            grades = [float(s.grade) for s in submissions_for_unit if s.grade is not None]
            average_grade = sum(grades) / len(grades) if grades else None

            is_completed = average_grade is not None # Or some other logic

            if is_completed:
                completed_units += 1

            unit_progress.append({
                'unit_id': unit.id,
                'unit_code': unit.code,
                'unit_title': unit.title,
                'programme_id': unit.programme.id,
                'programme_name': unit.programme.name,
                'average_grade': average_grade,
                'completed': is_completed,
                'submissions': [{
                    'assignment_id': s.assignment.id,
                    'assignment_title': s.assignment.title,
                    'grade': s.grade,
                } for s in submissions_for_unit]
            })

        overall_average = sum(up['average_grade'] for up in unit_progress if up['average_grade'] is not None) / completed_units if completed_units > 0 else None

        response_data = {
            "student": {
                "id": student.user.id,
                "username": student.user.username,
                "display_name": student.user.display_name,
            },
            "unit_progress": unit_progress,
            "completed_units": completed_units,
            "total_units": total_units,
            "overall_average": overall_average,
        }
        
        return Response(response_data)
