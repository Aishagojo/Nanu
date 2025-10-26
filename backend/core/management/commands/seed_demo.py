from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from learning.models import Course, Unit
from repository.models import Resource


DEMO_USERS = [
    {
        "username": "student1",
        "password": "Student@2025",
        "role": "student",
        "email": "student1@example.com",
        "display_name": "Aisha Student",
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "username": "parent1",
        "password": "Parent@2025",
        "role": "parent",
        "email": "parent1@example.com",
        "display_name": "Grace Parent",
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "username": "lecturer1",
        "password": "Lecturer@2025",
        "role": "lecturer",
        "email": "lecturer1@example.com",
        "display_name": "Peter Lecturer",
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "username": "hod1",
        "password": "HOD@2025",
        "role": "hod",
        "email": "hod1@example.com",
        "display_name": "Mary HoD",
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "username": "finance1",
        "password": "Finance@2025",
        "role": "finance",
        "email": "finance1@example.com",
        "display_name": "James Finance",
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "username": "records1",
        "password": "Records@2025",
        "role": "records",
        "email": "records1@example.com",
        "display_name": "Linda Records",
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "username": "admin1",
        "password": "Admin@2025",
        "role": "admin",
        "email": "admin1@example.com",
        "display_name": "Allan Admin",
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "username": "superadmin1",
        "password": "SuperAdmin@2025",
        "role": "superadmin",
        "email": "superadmin1@example.com",
        "display_name": "Sophia SuperAdmin",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "username": "librarian1",
        "password": "Librarian@2025",
        "role": "librarian",
        "email": "librarian1@example.com",
        "display_name": "Leo Librarian",
        "is_staff": True,
        "is_superuser": False,
    },
]


class Command(BaseCommand):
    help = "Seed demo users, sample course/unit, and a library resource"

    def handle(self, *args, **options):
        User = get_user_model()

        self.stdout.write(self.style.MIGRATE_HEADING("Seeding demo users"))
        user_lookup = {}
        for payload in DEMO_USERS:
            username = payload["username"]
            defaults = {
                "role": payload["role"],
                "email": payload.get("email", ""),
                "display_name": payload.get("display_name", ""),
                "is_staff": payload.get("is_staff", False),
                "is_superuser": payload.get("is_superuser", False),
            }
            user, created = User.objects.get_or_create(username=username, defaults=defaults)
            updated_fields = set()

            for field, value in defaults.items():
                if getattr(user, field) != value:
                    setattr(user, field, value)
                    updated_fields.add(field)

            user.set_password(payload["password"])
            updated_fields.add("password")
            user.must_change_password = False
            updated_fields.add("must_change_password")
            user.save(update_fields=list(updated_fields))

            action = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{action} {username} (role: {payload['role']}) with password {payload['password']}"
                )
            )
            user_lookup[username] = user

        lecturer = user_lookup.get("lecturer1")

        self.stdout.write(self.style.MIGRATE_HEADING("Seeding sample course, unit, and resource"))

        course, _ = Course.objects.get_or_create(
            code="TTM101",
            defaults={
                "name": "Fundamentals of Tourism",
                "description": "Introduction to tourism systems, ethics, and industry roles.",
                "owner": lecturer,
            },
        )
        if lecturer and course.owner_id != lecturer.id:
            course.owner = lecturer
            course.save(update_fields=["owner"])

        Unit.objects.update_or_create(
            course=course,
            title="Week 1: Tourism Foundations",
            defaults={"description": "Overview of tourism concepts, terminology, and industry sectors."},
        )

        Resource.objects.update_or_create(
            title="Tourism Basics Handbook",
            defaults={
                "kind": Resource.Kind.PDF,
                "description": "A primer covering tourism definitions, geography, and customer care.",
                "url": "https://example.com/tourism-basics.pdf",
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
