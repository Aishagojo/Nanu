from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User
from .models import FeeItem, Payment
from .serializers import FeeItemSerializer, PaymentSerializer


class FeeItemViewSet(viewsets.ModelViewSet):
    serializer_class = FeeItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = FeeItem.objects.select_related("student").prefetch_related("payments")
        if user.role == User.Roles.PARENT:
            return qs.filter(student__parent_links__parent=user)
        if user.role == User.Roles.STUDENT:
            return qs.filter(student=user)
        if user.role in [User.Roles.FINANCE, User.Roles.ADMIN] or user.is_staff:
            return qs
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.FINANCE, User.Roles.ADMIN] and not user.is_staff:
            raise PermissionDenied("Only finance or admin users can create fee items.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.FINANCE, User.Roles.ADMIN] and not user.is_staff:
            raise PermissionDenied("Only finance or admin users can update fee items.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in [User.Roles.FINANCE, User.Roles.ADMIN] and not user.is_staff:
            raise PermissionDenied("Only finance or admin users can delete fee items.")
        instance.delete()


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related("fee_item", "fee_item__student")
        if user.role == User.Roles.PARENT:
            return qs.filter(fee_item__student__parent_links__parent=user)
        if user.role == User.Roles.STUDENT:
            return qs.filter(fee_item__student=user)
        if user.role in [User.Roles.FINANCE, User.Roles.ADMIN] or user.is_staff:
            return qs
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.FINANCE, User.Roles.ADMIN] and not user.is_staff:
            raise PermissionDenied("Only finance or admin users can record payments.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.FINANCE, User.Roles.ADMIN] and not user.is_staff:
            raise PermissionDenied("Only finance or admin users can update payments.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in [User.Roles.FINANCE, User.Roles.ADMIN] and not user.is_staff:
            raise PermissionDenied("Only finance or admin users can delete payments.")
        instance.delete()


class FeeSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, student_id):
        student = get_object_or_404(User, pk=student_id, role=User.Roles.STUDENT)
        user = request.user
        if user.role == User.Roles.PARENT:
            if not user.linked_students.filter(student=student).exists():
                raise PermissionDenied("Parent cannot access this student's finances.")
        elif user.role == User.Roles.STUDENT:
            if student.id != user.id:
                raise PermissionDenied("Students can only view their own finances.")
        elif user.role not in [User.Roles.FINANCE, User.Roles.ADMIN] and not user.is_staff:
            raise PermissionDenied("Role not allowed to view student finances.")

        items = FeeItem.objects.filter(student=student).prefetch_related("payments")
        total_amount = Decimal("0")
        total_paid = Decimal("0")
        status_counts = {}
        item_payload = []
        for item in items:
            total_amount += item.amount
            total_paid += item.paid
            status_counts[item.status] = status_counts.get(item.status, 0) + 1
            item_payload.append(
                {
                    "id": item.id,
                    "title": item.title,
                    "amount": float(item.amount),
                    "paid": float(item.paid),
                    "balance": float(item.balance),
                    "status": item.status,
                    "due_date": item.due_date.isoformat() if item.due_date else None,
                }
            )

        remaining = max(total_amount - total_paid, Decimal("0"))
        can_view_amounts = user.role in [User.Roles.PARENT, User.Roles.FINANCE]
        summary = {
            "student": {
                "id": student.id,
                "username": student.username,
                "display_name": student.display_name,
            },
            "status_counts": status_counts if can_view_amounts else {},
            "items": item_payload if can_view_amounts else [],
            "totals": None,
            "fee_status": "Clear" if remaining <= 0 else "Pending clearance",
            "message": None,
        }
        if can_view_amounts:
            summary["totals"] = {
                "amount": float(total_amount),
                "paid": float(total_paid),
                "balance": float(remaining),
            }
        else:
            summary["message"] = "Fees are visible to parents and finance officers only. Status: out of session until clearance."
        return Response(summary)
