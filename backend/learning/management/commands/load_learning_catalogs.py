import csv
from pathlib import Path
from typing import List

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from learning.models import Course, Unit
from repository.models import Resource


def normalise(text: str) -> str:
    if text is None:
        return ""
    return text.strip()


def build_course_description(exam_tracks: str, notes: str) -> str:
    pieces: List[str] = []
    if exam_tracks:
        pieces.append(f"Exam tracks: {exam_tracks}")
    if notes:
        pieces.append(notes)
    return " | ".join(pieces)


def kind_from_type(type_label: str) -> str:
    label = (type_label or "").lower()
    if "video" in label:
        return Resource.Kind.VIDEO
    if "image" in label or "illustration" in label:
        return Resource.Kind.IMAGE
    if "pdf" in label:
        return Resource.Kind.PDF
    return Resource.Kind.LINK


def build_resource_description(license_text: str, notes: str, best_for_units: str) -> str:
    bits: List[str] = []
    if license_text:
        bits.append(f"License: {license_text}")
    if best_for_units:
        bits.append(f"Recommended units: {best_for_units}")
    if notes:
        bits.append(notes)
    return " | ".join(bits)


class Command(BaseCommand):
    help = "Load course/unit and learning material catalogues from CSV files in backend/data/."

    def add_arguments(self, parser):
        parser.add_argument(
            "--data-dir",
            type=str,
            default=str(Path(settings.BASE_DIR) / "data"),
            help="Directory containing units_catalog.csv and learning_materials_catalog.csv",
        )
    def handle(self, *args, **options):
        data_dir = Path(options["data_dir"])
        units_path = data_dir / "units_catalog.csv"
        materials_path = data_dir / "learning_materials_catalog.csv"

        if not units_path.exists():
            raise CommandError(f"Missing units CSV at {units_path}")
        if not materials_path.exists():
            raise CommandError(f"Missing learning materials CSV at {materials_path}")

        self.stdout.write(f"Using data directory: {data_dir}")

        with transaction.atomic():
            courses_created = self.import_courses(units_path)
            resources_created = self.import_resources(materials_path)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Synced courses/units (processed {courses_created} rows) and resources (processed {resources_created} rows)."
                )
            )

    def import_courses(self, csv_path: Path) -> int:
        processed = 0
        with csv_path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                code = normalise(row.get("unit_code"))
                title = normalise(row.get("unit_title")) or code
                exam_tracks = normalise(row.get("exam_tracks"))
                notes = normalise(row.get("notes"))
                description = build_course_description(exam_tracks, notes)

                if not code:
                    continue

                course, created = Course.objects.get_or_create(
                    code=code,
                    defaults={
                        "name": title,
                        "description": description,
                        "lecturer": None,
                    },
                )
                if not created:
                    updated = False
                    if course.name != title:
                        course.name = title
                        updated = True
                    if description and course.description != description:
                        course.description = description
                        updated = True
                    if updated:
                        course.save(update_fields=["name", "description"])

                Unit.objects.update_or_create(
                    course=course,
                    title=title,
                    defaults={
                        "description": notes,
                    },
                )
                processed += 1
        return processed

    def import_resources(self, csv_path: Path) -> int:
        processed = 0
        with csv_path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                title = normalise(row.get("title"))
                resource_type = normalise(row.get("type"))
                url = normalise(row.get("url"))
                license_text = normalise(row.get("license"))
                best_for_units = normalise(row.get("best_for_units"))
                notes = normalise(row.get("notes"))

                if not title:
                    continue

                kind = kind_from_type(resource_type)
                description = build_resource_description(license_text, notes, best_for_units)

                Resource.objects.update_or_create(
                    title=title,
                    defaults={
                        "kind": kind,
                        "description": description,
                        "url": url,
                    },
                )
                processed += 1
        return processed

