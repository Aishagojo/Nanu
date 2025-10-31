from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from learning.models import Course, Unit, Schedule, Session
from core.models import Department

User = get_user_model()

TEST_USERS = [
    # Students
    {
        "username": "student1",
        "password": "testing123",
        "email": "student1@test.com",
        "role": "student",
        "display_name": "Test Student One",
        "bio": "First year computer science student"
    },
    {
        "username": "student2", 
        "password": "testing123",
        "email": "student2@test.com",
        "role": "student",
        "display_name": "Test Student Two",
        "bio": "Second year mathematics student"
    },
    {
        "username": "student3",
        "password": "testing123",
        "email": "student3@test.com",
        "role": "student",
        "display_name": "Test Student Three",
        "bio": "Third year computer science student"
    },
    
    # Lecturers
    {
        "username": "lecturer1",
        "password": "testing123", 
        "email": "lecturer1@test.com",
        "role": "lecturer",
        "display_name": "Dr. Test Lecturer",
        "bio": "Professor of Computer Science",
        "department": "CS"
    },
    {
        "username": "lecturer2",
        "password": "testing123", 
        "email": "lecturer2@test.com",
        "role": "lecturer",
        "display_name": "Dr. Math Lecturer",
        "bio": "Professor of Mathematics",
        "department": "MATH"
    },
    {
        "username": "lecturer3",
        "password": "testing123", 
        "email": "lecturer3@test.com",
        "role": "lecturer",
        "display_name": "Dr. Programming Lecturer",
        "bio": "Assistant Professor of Programming",
        "department": "CS"
    },
    
    # Department Heads
    {
        "username": "cs_hod",
        "password": "testing123",
        "email": "cs_hod@test.com", 
        "role": "admin",
        "display_name": "Prof. CS Department Head",
        "bio": "Head of Computer Science Department",
        "is_hod": True,
        "department": "CS"
    },
    {
        "username": "math_hod",
        "password": "testing123",
        "email": "math_hod@test.com", 
        "role": "admin",
        "display_name": "Prof. Math Department Head",
        "bio": "Head of Mathematics Department",
        "is_hod": True,
        "department": "MATH"
    },
    
    # Administrators
    {
        "username": "admin1",
        "password": "testing123",
        "email": "admin@test.com",
        "role": "admin",
        "display_name": "System Administrator",
        "bio": "Main system administrator",
        "is_superuser": True
    }
]

DEPARTMENTS = [
    {
        "name": "Computer Science",
        "code": "CS",
        "description": "Department of Computer Science and Software Engineering"
    },
    {
        "name": "Mathematics",
        "code": "MATH",
        "description": "Department of Mathematics and Statistics"
    }
]

COURSES = [
    # Computer Science Courses
    {
        "name": "Introduction to Programming",
        "code": "CS101",
        "department": "CS",
        "description": "Basic programming concepts using Python",
        "status": "active"
    },
    {
        "name": "Data Structures",
        "code": "CS201",
        "department": "CS",
        "description": "Advanced data structures and algorithms",
        "status": "active"
    },
    {
        "name": "Web Development",
        "code": "CS301",
        "department": "CS",
        "description": "Modern web development technologies",
        "status": "pending"
    },
    
    # Mathematics Courses
    {
        "name": "Basic Mathematics",
        "code": "MATH101",
        "department": "MATH",
        "description": "Fundamental mathematics concepts",
        "status": "active"
    },
    {
        "name": "Calculus I",
        "code": "MATH201",
        "department": "MATH",
        "description": "Introduction to differential calculus",
        "status": "active"
    },
    {
        "name": "Linear Algebra",
        "code": "MATH301",
        "department": "MATH",
        "description": "Vectors, matrices and linear transformations",
        "status": "pending"
    }
]

# Sample schedule templates
SCHEDULE_TEMPLATES = [
    {
        "day_of_week": 1,  # Monday
        "start_time": "09:00",
        "end_time": "10:30"
    },
    {
        "day_of_week": 3,  # Wednesday
        "start_time": "11:00",
        "end_time": "12:30"
    },
    {
        "day_of_week": 5,  # Friday
        "start_time": "14:00",
        "end_time": "15:30"
    }
]

# Achievement categories for testing
ACHIEVEMENT_CATEGORIES = [
    {
        "name": "Academic Excellence",
        "description": "Achievements related to academic performance"
    },
    {
        "name": "Participation",
        "description": "Achievements for class participation and engagement"
    },
    {
        "name": "Progress",
        "description": "Achievements for learning progress and milestones"
    }
]

# Sample achievements
ACHIEVEMENTS = [
    {
        "category": "Academic Excellence",
        "name": "Perfect Score",
        "description": "Get 100% on any assessment",
        "points_value": 100,
        "max_claims_per_term": 3
    },
    {
        "category": "Participation",
        "name": "Active Participant",
        "description": "Participate actively in class discussions",
        "points_value": 50,
        "max_claims_per_term": 5
    },
    {
        "category": "Progress",
        "name": "Quick Learner",
        "description": "Complete all unit objectives ahead of schedule",
        "points_value": 75,
        "max_claims_per_term": 2
    }
]

class Command(BaseCommand):
    help = 'Creates test data for development and testing'

    def handle(self, *args, **kwargs):
        self.stdout.write('Creating test data...')
        
        # Create departments
        departments = {}
        for dept in DEPARTMENTS:
            department, created = Department.objects.get_or_create(
                code=dept["code"],
                defaults={
                    "name": dept["name"],
                    "description": dept["description"]
                }
            )
            departments[dept["code"]] = department
            if created:
                self.stdout.write(f'Created department: {department.name}')

        # Create test users
        users = {}
        for user_data in TEST_USERS:
            is_hod = user_data.pop("is_hod", False)
            is_superuser = user_data.pop("is_superuser", False)
            
            user, created = User.objects.get_or_create(
                username=user_data["username"],
                defaults={
                    **user_data,
                    "is_staff": user_data["role"] in ["admin", "lecturer"],
                    "is_superuser": is_superuser
                }
            )
            
            if created:
                user.set_password(user_data["password"])
                user.save()
                self.stdout.write(f'Created user: {user.username} ({user.role})')
            
            users[user.username] = user
            
            # Assign HOD to department
            if is_hod and departments:
                cs_dept = departments["CS"]
                cs_dept.head = user
                cs_dept.save()
                self.stdout.write(f'Assigned {user.username} as HOD of {cs_dept.name}')

        # Create courses
        for course_data in COURSES:
            dept_code = course_data.pop("department")
            course, created = Course.objects.get_or_create(
                code=course_data["code"],
                defaults={
                    **course_data,
                    "department": departments[dept_code],
                    "lecturer": users["lecturer1"]
                }
            )
            
            if created:
                self.stdout.write(f'Created course: {course.name}')
                
                # Create some units
                Unit.objects.get_or_create(
                    course=course,
                    name=f"Unit 1: Introduction to {course.name}",
                    description="First unit of the course"
                )
                
                # Create a schedule
                schedule = Schedule.objects.create(
                    course=course,
                    day_of_week=1,  # Monday
                    start_time="09:00",
                    end_time="10:30"
                )
                
                # Create some sessions
                for week in range(1, 5):
                    Session.objects.create(
                        schedule=schedule,
                        date=timezone.now() + timezone.timedelta(days=7 * week),
                        status="scheduled"
                    )

        self.stdout.write(self.style.SUCCESS('''
Test data created successfully!

You can now log in with the following credentials:

Students:
- Username: student1, Password: testing123
- Username: student2, Password: testing123

Lecturer:
- Username: lecturer1, Password: testing123

Head of Department:
- Username: hod1, Password: testing123

Admin:
- Username: admin1, Password: testing123

All users have the password: testing123
'''))