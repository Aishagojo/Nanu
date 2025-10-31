from django.contrib.auth import get_user_model

from users.models import ParentStudentLink
from learning.models import Course, Unit, Enrollment, Grade
from finance.models import FeeItem, Payment
from communications.models import Thread, Message


class ParentStudentFixtureMixin:
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        User = get_user_model()
        cls.parent = User.objects.create_user(
            username="parent_test",
            password="parentpass",
            role=User.Roles.PARENT,
            email="parent@example.com",
        )
        cls.student = User.objects.create_user(
            username="student_test",
            password="studentpass",
            role=User.Roles.STUDENT,
            email="student@example.com",
        )
        cls.teacher = User.objects.create_user(
            username="teacher_test",
            password="teacherpass",
            role=User.Roles.LECTURER,
            email="teacher@example.com",
        )
        cls.other_parent = User.objects.create_user(
            username="other_parent",
            password="parentpass",
            role=User.Roles.PARENT,
            email="other_parent@example.com",
        )
        cls.unlinked_student = User.objects.create_user(
            username="student_unlinked",
            password="studentpass",
            role=User.Roles.STUDENT,
            email="student_unlinked@example.com",
        )

        ParentStudentLink.objects.create(
            parent=cls.parent,
            student=cls.student,
            relationship="Mother",
        )

        cls.course = Course.objects.create(
            code="DEM101",
            name="Demo Course",
            description="Course for testing",
            lecturer=cls.teacher,
        )
        cls.unit_one = Unit.objects.create(
            course=cls.course,
            title="Unit One",
            description="Basics",
        )
        cls.unit_two = Unit.objects.create(
            course=cls.course,
            title="Unit Two",
            description="Advanced",
        )

        cls.enrollment = Enrollment.objects.create(
            student=cls.student,
            course=cls.course,
        )

        Grade.objects.create(
            enrollment=cls.enrollment,
            unit=cls.unit_one,
            score=90,
            out_of=100,
        )
        Grade.objects.create(
            enrollment=cls.enrollment,
            unit=cls.unit_two,
            score=70,
            out_of=100,
        )

        cls.fee_item = FeeItem.objects.create(
            student=cls.student,
            title="Tuition",
            amount=500,
            paid=0,
        )
        Payment.objects.create(
            fee_item=cls.fee_item,
            amount=250,
            method="Card",
        )

        cls.thread = Thread.objects.create(
            subject="Progress check",
            student=cls.student,
            teacher=cls.teacher,
            parent=cls.parent,
        )
        cls.parent_message = Message.objects.create(
            thread=cls.thread,
            author=cls.parent,
            body="How is my child doing?",
            sender_role=Message.SenderRoles.PARENT,
        )
        cls.teacher_message = Message.objects.create(
            thread=cls.thread,
            author=cls.teacher,
            body="Doing well!",
            sender_role=Message.SenderRoles.TEACHER,
        )
