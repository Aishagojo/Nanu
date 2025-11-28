from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from django.conf import settings
from users.models import Student, Guardian, Lecturer, HOD, Admin, RecordsOfficer, FinanceOfficer
from core.models import Department
from learning.models import Programme, CurriculumUnit, TermOffering, LecturerAssignment, Registration
from finance.models import FinanceThreshold
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds the database with initial data for demo and development purposes.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting database seeding...'))

        with transaction.atomic():
            self._seed_roles_and_permissions()
            self._seed_departments_and_hods()
            self._seed_programmes_and_units()
            self._seed_lecturers_and_assignments()
            self._seed_students_and_parents()
            self._seed_term_offerings_and_finance_thresholds()
            self._seed_initial_registrations()

        self.stdout.write(self.style.SUCCESS('Database seeding completed successfully!'))

    def _seed_roles_and_permissions(self):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding roles and permissions...'))
        # Create a superuser if it doesn't exist
        if not User.objects.filter(username=settings.ADMIN_USERNAME).exists():
            User.objects.create_superuser(
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                password=settings.ADMIN_PASSWORD,
                role=User.Roles.SUPERADMIN,
                display_name="Super Admin"
            )
            self.stdout.write(self.style.SUCCESS(f'Created superuser: {settings.ADMIN_USERNAME}'))
        else:
            self.stdout.write(self.style.WARNING(f'Superuser {settings.ADMIN_USERNAME} already exists.'))
        self.stdout.write(self.style.SUCCESS('Roles and permissions seeded.'))

    def _seed_departments_and_hods(self):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding departments and HODs...'))
        self.department_tourism, created = Department.objects.get_or_create(
            name="Tourism and Travel", code="TT"
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created department: {self.department_tourism.name}'))
        
        # Create HOD
        hod_user, created = User.objects.get_or_create(
            username="hod.travel",
            defaults={
                "email": "hod.travel@example.com",
                "password": "password123", # Consider hashing in production seeding
                "role": User.Roles.HOD,
                "display_name": "HOD Travel"
            }
        )
        if created:
            hod_user.set_password("password123")
            hod_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created HOD user: {hod_user.username}'))
        
        self.hod_profile, created = HOD.objects.get_or_create(user=hod_user, defaults={"department": self.department_tourism})
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created HOD profile for {hod_user.username}'))
        
        self.department_tourism.head_of_department = self.hod_profile
        self.department_tourism.save()

        self.stdout.write(self.style.SUCCESS('Departments and HODs seeded.'))

    def _seed_programmes_and_units(self):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding programmes and units...'))
        
        self.programme_tourism, created = Programme.objects.get_or_create(
            department=self.department_tourism,
            name="Diploma in Tourism Operations",
            code="DTM",
            award_level="Diploma",
            duration_years=2,
            trimesters_per_year=3
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created programme: {self.programme_tourism.name}'))

        units_data = [
            {"code": "DTM101", "title": "Introduction to Tourism", "credit_hours": 3, "trimester_hint": 1, "has_prereq": False},
            {"code": "DTM102", "title": "Travel Geography", "credit_hours": 3, "trimester_hint": 1, "has_prereq": False},
            {"code": "DTM103", "title": "Customer Service in Hospitality", "credit_hours": 3, "trimester_hint": 1, "has_prereq": False},
            {"code": "DTM104", "title": "Tour Guiding Techniques", "credit_hours": 3, "trimester_hint": 2, "has_prereq": True, "prereq_code": "DTM101"},
            {"code": "DTM105", "title": "Sustainable Tourism Practices", "credit_hours": 3, "trimester_hint": 2, "has_prereq": False},
            {"code": "DTM106", "title": "Event Management Fundamentals", "credit_hours": 3, "trimester_hint": 3, "has_prereq": False},
            {"code": "DTM201", "title": "Tourism Marketing", "credit_hours": 3, "trimester_hint": 4, "has_prereq": True, "prereq_code": "DTM104"},
            {"code": "DTM202", "title": "Travel Agency Operations", "credit_hours": 3, "trimester_hint": 4, "has_prereq": False},
        ]

        self.units = {}
        for data in units_data:
            prereq_unit = None
            if data.get("prereq_code"):
                prereq_unit = CurriculumUnit.objects.filter(
                    programme=self.programme_tourism, code=data["prereq_code"]
                ).first()
            unit, created = CurriculumUnit.objects.get_or_create(
                programme=self.programme_tourism,
                code=data["code"],
                defaults={
                    "title": data["title"],
                    "credit_hours": data["credit_hours"],
                    "trimester_hint": data["trimester_hint"],
                    "has_prereq": data["has_prereq"],
                    "prereq_unit": prereq_unit,
                }
            )
            self.units[data["code"]] = unit
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created unit: {unit.code} - {unit.title}'))

        self.stdout.write(self.style.SUCCESS('Programmes and units seeded.'))

    def _seed_lecturers_and_assignments(self):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding lecturers and assignments...'))
        self.lecturers = []
        for i in range(1, 3):
            lecturer_user, created = User.objects.get_or_create(
                username=f"lecturer{i}",
                defaults={
                    "email": f"lecturer{i}@example.com",
                    "password": "password123",
                    "role": User.Roles.LECTURER,
                    "display_name": f"Lecturer {i}"
                }
            )
            if created:
                lecturer_user.set_password("password123")
                lecturer_user.save()
                self.stdout.write(self.style.SUCCESS(f'Created lecturer user: {lecturer_user.username}'))
            
            lecturer_profile, created = Lecturer.objects.get_or_create(user=lecturer_user, defaults={"department": self.department_tourism})
            self.lecturers.append(lecturer_profile)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created lecturer profile for {lecturer_user.username}'))
        
        # Assign some units to lecturers
        if self.lecturers and self.units:
            current_year = 2025
            current_trimester = 1
            LecturerAssignment.objects.get_or_create(
                lecturer=self.lecturers[0],
                unit=self.units["DTM101"],
                academic_year=current_year,
                trimester=current_trimester
            )
            LecturerAssignment.objects.get_or_create(
                lecturer=self.lecturers[0],
                unit=self.units["DTM102"],
                academic_year=current_year,
                trimester=current_trimester
            )
            LecturerAssignment.objects.get_or_create(
                lecturer=self.lecturers[1],
                unit=self.units["DTM103"],
                academic_year=current_year,
                trimester=current_trimester
            )
            self.stdout.write(self.style.SUCCESS('Lecturer assignments seeded.'))
        self.stdout.write(self.style.SUCCESS('Lecturers and assignments seeded.'))

    def _seed_students_and_parents(self):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding students and parents...'))
        self.student_user, created = User.objects.get_or_create(
            username="student1",
            defaults={
                "email": "student1@example.com",
                "password": "password123",
                "role": User.Roles.STUDENT,
                "display_name": "Aisha Student"
            }
        )
        if created:
            self.student_user.set_password("password123")
            self.student_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created student user: {self.student_user.username}'))

        self.student_profile, created = Student.objects.get_or_create(
            user=self.student_user,
            defaults={
                "programme": self.programme_tourism,
                "year": 1,
                "trimester": 1,
                "trimester_label": "Year 1, Trimester 1",
                "cohort_year": 2025,
                "current_status": Student.Status.ACTIVE
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created student profile for {self.student_user.username}'))

        self.parent_user, created = User.objects.get_or_create(
            username="parent1",
            defaults={
                "email": "parent1@example.com",
                "password": "password123",
                "role": User.Roles.PARENT,
                "display_name": "Parent One"
            }
        )
        if created:
            self.parent_user.set_password("password123")
            self.parent_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created parent user: {self.parent_user.username}'))
        
        self.parent_profile, created = Guardian.objects.get_or_create(user=self.parent_user)
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created parent profile for {self.parent_user.username}'))

        self.stdout.write(self.style.SUCCESS('Students and parents seeded.'))

    def _seed_term_offerings_and_finance_thresholds(self):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding term offerings and finance thresholds...'))
        current_year = 2025
        current_trimester = 1

        for unit_code, unit_obj in self.units.items():
            if unit_obj.trimester_hint == current_trimester:
                TermOffering.objects.get_or_create(
                    programme=self.programme_tourism,
                    unit=unit_obj,
                    academic_year=current_year,
                    trimester=current_trimester,
                    defaults={"offered": True, "capacity": 30}
                )
                self.stdout.write(self.style.SUCCESS(f'Offered {unit_code} for {current_year}/T{current_trimester}'))
        
        FinanceThreshold.objects.get_or_create(
            programme=self.programme_tourism,
            academic_year=current_year,
            trimester=current_trimester,
            defaults={"threshold_amount": 5000.00}
        )
        self.stdout.write(self.style.SUCCESS('Term offerings and finance thresholds seeded.'))

    def _seed_initial_registrations(self):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding initial registrations...'))
        current_year = 2025
        current_trimester = 1

        # Register student1 for a few units
        units_to_register = [self.units["DTM101"], self.units["DTM102"]]
        for unit in units_to_register:
            Registration.objects.get_or_create(
                student=self.student_profile,
                unit=unit,
                academic_year=current_year,
                trimester=current_trimester,
                defaults={"status": Registration.Status.APPROVED}
            )
            self.stdout.write(self.style.SUCCESS(f'Registered {self.student_user.username} for {unit.code}'))
        self.stdout.write(self.style.SUCCESS('Initial registrations seeded.'))
