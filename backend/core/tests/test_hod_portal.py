from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Department
from learning.models import Course

User = get_user_model()

class HodPortalTests(TestCase):
    def setUp(self):
        # Create test users
        self.admin_user = User.objects.create_user(
            username='admin',
            password='testpass123',
            role='admin',
            is_staff=True,
            is_superuser=True
        )
        
        self.hod_user = User.objects.create_user(
            username='hod',
            password='testpass123',
            role='admin',
            is_staff=True
        )
        
        self.lecturer_user = User.objects.create_user(
            username='lecturer',
            password='testpass123',
            role='lecturer'
        )
        
        # Create department
        self.department = Department.objects.create(
            name='Test Department',
            code='TEST',
            head=self.hod_user
        )
        
        # Create test course
        self.course = Course.objects.create(
            name='Test Course',
            code='TEST101',
            department=self.department,
            status='pending'
        )
        
        # Setup API clients
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin_user)
        
        self.hod_client = APIClient()
        self.hod_client.force_authenticate(user=self.hod_user)
        
        self.lecturer_client = APIClient()
        self.lecturer_client.force_authenticate(user=self.lecturer_user)

    def test_hod_dashboard_access(self):
        """Test dashboard access permissions"""
        # Admin can access
        response = self.admin_client.get(reverse('hod-dashboard-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # HOD can access their department
        response = self.hod_client.get(reverse('hod-dashboard-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # Only their department
        
        # Lecturer cannot access
        response = self.lecturer_client.get(reverse('hod-dashboard-list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lecturer_management(self):
        """Test lecturer management features"""
        # Add new lecturer
        new_lecturer_data = {
            'username': 'newlecturer',
            'email': 'new@test.com',
            'password': 'testpass123',
            'display_name': 'New Lecturer'
        }
        
        response = self.hod_client.post(
            reverse('department-add-lecturer', args=[self.department.id]),
            new_lecturer_data
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify lecturer was created
        self.assertTrue(
            User.objects.filter(username='newlecturer', role='lecturer').exists()
        )
        
        # Assign course to lecturer
        assign_data = {
            'course_id': self.course.id,
            'lecturer_id': self.lecturer_user.id
        }
        
        response = self.hod_client.post(
            reverse('department-assign-course', args=[self.department.id]),
            assign_data
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify course assignment
        self.course.refresh_from_db()
        self.assertEqual(self.course.lecturer, self.lecturer_user)

    def test_course_approval(self):
        """Test course approval process"""
        # Try to approve course as lecturer (should fail)
        response = self.lecturer_client.post(
            reverse('department-approve-course', args=[self.department.id]),
            {'course_id': self.course.id}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Approve course as HOD
        response = self.hod_client.post(
            reverse('department-approve-course', args=[self.department.id]),
            {'course_id': self.course.id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify course status changed
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, 'approved')

    def test_dashboard_statistics(self):
        """Test dashboard statistics accuracy"""
        response = self.hod_client.get(reverse('hod-dashboard-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        dept_data = response.data[0]
        stats = dept_data['statistics']
        
        self.assertEqual(stats['total_courses'], Course.objects.filter(department=self.department).count())
        self.assertEqual(stats['total_lecturers'], User.objects.filter(role='lecturer', taught_courses__department=self.department).distinct().count())
        self.assertEqual(stats['pending_courses'], Course.objects.filter(department=self.department, status='pending').count())
        self.assertEqual(stats['active_courses'], Course.objects.filter(department=self.department, status='active').count())