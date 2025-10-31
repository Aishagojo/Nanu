from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from learning.models import (
    AchievementCategory,
    Achievement,
    StudentAchievement,
    RewardClaim,
    TermProgress,
    Course,
    Unit,
    Enrollment,
    Schedule,
    Session,
    Attendance,
    Resource,
    ResourceCategory,
    ResourceFeedback,
    LearningGoal,
    GoalMilestone
)

User = get_user_model()

class ButtonInteractionTests(TestCase):
    def setUp(self):
        # Create test users
        self.student = User.objects.create_user(
            username='test_student',
            password='test123',
            role='student'
        )
        self.lecturer = User.objects.create_user(
            username='test_lecturer',
            password='test123',
            role='lecturer'
        )
        self.admin = User.objects.create_user(
            username='test_admin',
            password='test123',
            role='admin'
        )
        
        # Setup test clients
        self.student_client = APIClient()
        self.student_client.force_authenticate(user=self.student)
        
        self.lecturer_client = APIClient()
        self.lecturer_client.force_authenticate(user=self.lecturer)
        
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin)

    def test_student_achievement_interactions(self):
        """Test all student achievement-related button interactions"""
        # View achievements list
        response = self.student_client.get(reverse('achievement-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Claim achievement
        response = self.student_client.post(reverse('achievement-claim', args=[1]))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # View progress
        response = self.student_client.get(reverse('term-progress-current-term'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Claim reward (only for students)
        response = self.student_client.post(reverse('reward-claim-create'))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # View leaderboard
        response = self.student_client.get(reverse('term-progress-leaderboard'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_lecturer_achievement_interactions(self):
        """Test all lecturer achievement-related button interactions"""
        # View all achievements
        response = self.lecturer_client.get(reverse('achievement-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Create achievement
        response = self.lecturer_client.post(reverse('achievement-create'))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Approve achievement claim
        response = self.lecturer_client.post(reverse('student-achievement-approve', args=[1]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Bulk approve achievements
        response = self.lecturer_client.post(reverse('student-achievement-bulk-approve', args=[1]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # View student progress
        response = self.lecturer_client.get(reverse('term-progress-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_achievement_interactions(self):
        """Test all admin achievement-related button interactions"""
        # Manage achievement categories
        response = self.admin_client.post(reverse('achievement-category-create'))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Edit achievement
        response = self.admin_client.put(reverse('achievement-detail', args=[1]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # View all statistics
        response = self.admin_client.get(reverse('term-progress-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_course_and_resource_interactions(self):
        """Test course and resource-related button interactions"""
        # Student interactions
        responses = [
            self.student_client.get(reverse('course-list')),
            self.student_client.get(reverse('resource-list')),
            self.student_client.post(reverse('attendance-check-in')),
            self.student_client.post(reverse('resource-feedback-create')),
        ]
        for response in responses:
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
        # Lecturer interactions
        responses = [
            self.lecturer_client.post(reverse('course-create')),
            self.lecturer_client.post(reverse('resource-create')),
            self.lecturer_client.get(reverse('course-roster', args=[1])),
        ]
        for response in responses:
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_learning_goals_interactions(self):
        """Test learning goals-related button interactions"""
        # Student interactions
        responses = [
            self.student_client.post(reverse('learning-goal-create')),
            self.student_client.post(reverse('goal-milestone-create')),
            self.student_client.put(reverse('goal-milestone-complete', args=[1])),
        ]
        for response in responses:
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            
        # Lecturer interactions
        responses = [
            self.lecturer_client.get(reverse('learning-goal-list')),
            self.lecturer_client.get(reverse('goal-milestone-list')),
        ]
        for response in responses:
            self.assertEqual(response.status_code, status.HTTP_200_OK)