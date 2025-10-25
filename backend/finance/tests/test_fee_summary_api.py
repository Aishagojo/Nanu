from rest_framework import status
from rest_framework.test import APITestCase

from tests.mixins import ParentStudentFixtureMixin


class FeeSummaryApiTests(ParentStudentFixtureMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.parent)

    def test_parent_views_fee_summary(self):
        url = f"/api/finance/students/{self.student.id}/summary/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(payload["student"]["id"], self.student.id)
        self.assertEqual(payload["totals"]["amount"], 500.0)
        self.assertEqual(payload["totals"]["balance"], 250.0)
        self.assertEqual(payload["status_counts"].get("In progress"), 1)

    def test_parent_cannot_view_unlinked_student_fees(self):
        url = f"/api/finance/students/{self.unlinked_student.id}/summary/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
