from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    UserViewSet,
    ParentStudentLinkViewSet,
    me,
    password_reset_request,
    password_reset_confirm,
    password_change_self,
    totp_setup,
    totp_activate,
    totp_disable,
    assign_role,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"parent-links", ParentStudentLinkViewSet, basename="parent-link")

urlpatterns = router.urls + [
    path("me/", me, name="users-me"),
    path("password-reset/request/", password_reset_request, name="users-password-reset-request"),
    path("password-reset/confirm/", password_reset_confirm, name="users-password-reset-confirm"),
    path("password-reset/self/", password_change_self, name="users-password-change-self"),
    path("totp/setup/", totp_setup, name="users-totp-setup"),
    path("totp/activate/", totp_activate, name="users-totp-activate"),
    path("totp/disable/", totp_disable, name="users-totp-disable"),
    path("assign-role/", assign_role, name="users-assign-role"),
]
