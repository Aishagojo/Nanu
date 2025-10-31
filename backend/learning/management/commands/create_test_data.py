from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
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
    GoalMilestone,
    ActivityLog
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates test data for all learning app features'

    def handle(self, *args, **kwargs):
        # Create test users
        student = User.objects.create_user(
            username='test_student',
            password='test123',
            role='student',
            display_name='Test Student'
        )
        lecturer = User.objects.create_user(
            username='test_lecturer',
            password='test123',
            role='lecturer',
            display_name='Test Lecturer'
        )
        admin = User.objects.create_user(
            username='test_admin',
            password='test123',
            role='admin',
            display_name='Test Admin'
        )

        # Create Achievement Categories
        math_category = AchievementCategory.objects.create(
            name='Mathematics',
            description='Math achievements'
        )
        science_category = AchievementCategory.objects.create(
            name='Science',
            description='Science achievements'
        )

        # Create Achievements
        math_achievement = Achievement.objects.create(
            category=math_category,
            name='Math Master',
            description='Complete 5 math exercises',
            points_value=50,
            max_claims_per_term=1,
            requires_approval=True
        )
        science_achievement = Achievement.objects.create(
            category=science_category,
            name='Science Explorer',
            description='Complete a science experiment',
            points_value=30,
            max_claims_per_term=2,
            requires_approval=True
        )

        # Create Student Achievements
        StudentAchievement.objects.create(
            student=student,
            achievement=math_achievement,
            term='2025-3',
            evidence='Completed exercises',
            approved_by=lecturer,
            approved_at=timezone.now()
        )

        # Create Reward Claims
        RewardClaim.objects.create(
            student=student,
            term='2025-3',
            points_spent=50,
            reward_choice='Extra Break Time'
        )

        # Create Term Progress
        TermProgress.objects.create(
            student=student,
            term='2025-3',
            total_points=80,
            badges_earned=['Math Master'],
            rewards_claimed=1
        )

        # Create Courses and Units
        course = Course.objects.create(
            name='Introduction to Mathematics',
            description='Basic math concepts',
            lecturer=lecturer
        )
        unit = Unit.objects.create(
            course=course,
            name='Basic Arithmetic',
            description='Addition and subtraction'
        )

        # Create Enrollment
        Enrollment.objects.create(
            student=student,
            course=course,
            status='active'
        )

        # Create Schedule and Sessions
        schedule = Schedule.objects.create(
            course=course,
            day_of_week=1,
            start_time='09:00',
            end_time='10:30'
        )
        session = Session.objects.create(
            schedule=schedule,
            date=timezone.now().date(),
            status='scheduled'
        )

        # Create Attendance
        Attendance.objects.create(
            student=student,
            session=session,
            status='present',
            check_in_time=timezone.now()
        )

        # Create Resources
        category = ResourceCategory.objects.create(
            name='Learning Materials',
            description='Study materials and guides'
        )
        resource = Resource.objects.create(
            category=category,
            title='Math Workbook',
            description='Practice exercises',
            file_path='path/to/dummy.pdf',
            uploaded_by=lecturer
        )

        # Create Resource Feedback
        ResourceFeedback.objects.create(
            resource=resource,
            student=student,
            rating=5,
            comment='Very helpful!'
        )

        # Create Learning Goals
        goal = LearningGoal.objects.create(
            student=student,
            title='Master Basic Math',
            description='Complete basic math modules',
            target_date=timezone.now() + timezone.timedelta(days=30)
        )

        # Create Goal Milestones
        GoalMilestone.objects.create(
            goal=goal,
            title='Complete Addition',
            description='Master addition exercises',
            completed=True
        )

        # Create Activity Logs
        ActivityLog.objects.create(
            student=student,
            activity_type='course_progress',
            description='Completed Math Module 1',
            points_earned=10
        )

        self.stdout.write(self.style.SUCCESS('Successfully created test data'))