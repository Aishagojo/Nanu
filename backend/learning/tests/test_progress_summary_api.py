from rest_framework import status
from rest_framework.test import APITestCase

from tests.mixins import ParentStudentFixtureMixin


class ProgressSummaryApiTests(ParentStudentFixtureMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.parent)

    def test_parent_views_linked_student_progress(self):
        url = f"/api/learning/students/{self.student.id}/progress/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(payload["student"]["id"], self.student.id)
        self.assertEqual(payload["completed_units"], 2)
        self.assertEqual(len(payload["courses"]), 1)
        self.assertEqual(payload["courses"][0]["average_score"], 80.0)

    def test_parent_cannot_view_unlinked_student_progress(self):
        url = f"/api/learning/students/{self.unlinked_student.id}/progress/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
