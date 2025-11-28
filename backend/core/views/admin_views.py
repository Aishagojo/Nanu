from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from users.models import Student
from users.serializers import StudentSerializer


class AdminPipelineView(viewsets.ReadOnlyModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAdminUser]

    @action(detail=True, methods=['get'])
    def preview_pipeline(self, request, pk=None):
        student = self.get_object()
        
        pipeline_status = {
            "student_id": student.id,
            "current_status": student.current_status,
            "next_expected_step": "",
            "progress": [],
            "message": "",
        }

        if student.current_status == Student.Status.NEW:
            pipeline_status["next_expected_step"] = "Admission by Records Officer"
            pipeline_status["progress"].append("Student Registered")
            pipeline_status["message"] = "Student is awaiting admission approval."
        elif student.current_status == Student.Status.ADMITTED:
            pipeline_status["next_expected_step"] = "Fee Validation by Finance Officer"
            pipeline_status["progress"].extend(["Student Registered", "Admission Approved"])
            pipeline_status["message"] = "Student is admitted and awaiting fee payment."
        elif student.current_status == Student.Status.FINANCE_OK:
            pipeline_status["next_expected_step"] = "Curriculum Approval by HOD"
            pipeline_status["progress"].extend(["Student Registered", "Admission Approved", "Finance Cleared"])
            pipeline_status["message"] = "Student has cleared finances and is awaiting HOD approval for curriculum."
        elif student.current_status == Student.Status.PENDING_HOD:
            pipeline_status["next_expected_step"] = "Curriculum Approval by HOD"
            pipeline_status["progress"].extend(["Student Registered", "Admission Approved", "Finance Cleared"])
            pipeline_status["message"] = "Student is awaiting HOD approval for curriculum."
        elif student.current_status == Student.Status.ACTIVE:
            pipeline_status["next_expected_step"] = "Course Access Granted"
            pipeline_status["progress"].extend(["Student Registered", "Admission Approved", "Finance Cleared", "Curriculum Approved"])
            pipeline_status["message"] = "Student is active and has full course access."
        elif student.current_status == Student.Status.BLOCKED:
            pipeline_status["next_expected_step"] = "Intervention Required"
            pipeline_status["progress"].append("Student Blocked")
            pipeline_status["message"] = "Student account is blocked. Manual intervention is required."

        return Response(pipeline_status)
