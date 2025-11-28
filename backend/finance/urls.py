from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import RecordPaymentView, FeeStructureViewSet, FinanceStatusViewSet, FinanceReportView

router = DefaultRouter()
router.register(r"fee-structures", FeeStructureViewSet, basename="fee-structure")
router.register(r"status", FinanceStatusViewSet, basename="finance-status")

urlpatterns = router.urls + [
    path("record-payment/", RecordPaymentView.as_view(), name="record-payment"),
    path("report/", FinanceReportView.as_view(), name="finance-report"),
]