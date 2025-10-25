from rest_framework import serializers
from users.models import User
from .models import FeeItem, Payment


class PaymentSerializer(serializers.ModelSerializer):
    fee_item = serializers.PrimaryKeyRelatedField(queryset=FeeItem.objects.all())

    class Meta:
        model = Payment
        fields = ["id", "fee_item", "amount", "method", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class FeeItemSerializer(serializers.ModelSerializer):
    payments = PaymentSerializer(many=True, read_only=True)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)
    student = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Roles.STUDENT)
    )

    class Meta:
        model = FeeItem
        fields = [
            "id",
            "student",
            "title",
            "amount",
            "paid",
            "balance",
            "status",
            "due_date",
            "payments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "balance", "status", "payments", "created_at", "updated_at"]
