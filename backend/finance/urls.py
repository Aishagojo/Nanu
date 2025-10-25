from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import FeeItemViewSet, PaymentViewSet, FeeSummaryView

router = DefaultRouter()
router.register(r"items", FeeItemViewSet, basename="fee-item")
router.register(r"payments", PaymentViewSet, basename="payment")

urlpatterns = router.urls + [
    path("students/<int:student_id>/summary/", FeeSummaryView.as_view(), name="fee-summary"),
]
