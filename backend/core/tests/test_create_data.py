from django.test import TestCase
from django.core.management import call_command
from django.contrib.auth import get_user_model
from core.models import Department
from learning.models import Course, Unit, Schedule, Session

User = get_user_model()

class TestDataCommandTests(TestCase):
    def test_create_test_data(self):
        """Test the create_test_data command creates all required objects"""
        # Run the command
        call_command('create_test_data')
        
        # Test users were created
        self.assertTrue(User.objects.filter(username='student1').exists())
        self.assertTrue(User.objects.filter(username='student2').exists())
        self.assertTrue(User.objects.filter(username='student3').exists())
        self.assertTrue(User.objects.filter(username='lecturer1').exists())
        self.assertTrue(User.objects.filter(username='lecturer2').exists())
        self.assertTrue(User.objects.filter(username='lecturer3').exists())
        self.assertTrue(User.objects.filter(username='cs_hod').exists())
        self.assertTrue(User.objects.filter(username='math_hod').exists())
        self.assertTrue(User.objects.filter(username='admin1').exists())
        
        # Test departments were created
        cs_dept = Department.objects.get(code='CS')
        math_dept = Department.objects.get(code='MATH')
        
        self.assertEqual(cs_dept.name, 'Computer Science')
        self.assertEqual(math_dept.name, 'Mathematics')
        
        # Test HODs were assigned
        cs_hod = User.objects.get(username='cs_hod')
        math_hod = User.objects.get(username='math_hod')
        
        self.assertEqual(cs_dept.head, cs_hod)
        self.assertEqual(math_dept.head, math_hod)
        
        # Test courses were created
        self.assertTrue(Course.objects.filter(code='CS101').exists())
        self.assertTrue(Course.objects.filter(code='CS201').exists())
        self.assertTrue(Course.objects.filter(code='CS301').exists())
        self.assertTrue(Course.objects.filter(code='MATH101').exists())
        self.assertTrue(Course.objects.filter(code='MATH201').exists())
        self.assertTrue(Course.objects.filter(code='MATH301').exists())
        
        # Test course details
        cs101 = Course.objects.get(code='CS101')
        self.assertEqual(cs101.department, cs_dept)
        self.assertEqual(cs101.status, 'active')
        
        # Test units were created
        self.assertTrue(Unit.objects.filter(course=cs101).exists())
        
        # Test schedules were created
        self.assertTrue(Schedule.objects.filter(course=cs101).exists())
        
        # Test sessions were created
        schedule = Schedule.objects.filter(course=cs101).first()
        self.assertTrue(Session.objects.filter(schedule=schedule).exists())
        
        # Test user roles
        student = User.objects.get(username='student1')
        lecturer = User.objects.get(username='lecturer1')
        hod = User.objects.get(username='cs_hod')
        admin = User.objects.get(username='admin1')
        
        self.assertEqual(student.role, 'student')
        self.assertEqual(lecturer.role, 'lecturer')
        self.assertEqual(hod.role, 'admin')
        self.assertTrue(admin.is_superuser)
        
        # Test lecturer assignments
        cs_lecturers = User.objects.filter(
            role='lecturer',
            taught_courses__department=cs_dept
        ).distinct()
        self.assertTrue(cs_lecturers.exists())