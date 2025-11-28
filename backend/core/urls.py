from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.base import health, help_view, about_view, transcribe_audio
from .views.hod import DepartmentViewSet, HodDashboardViewSet, HODViewSet
from .views.admin_views import AdminPipelineView # Added

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'dashboard', HodDashboardViewSet, basename='hod-dashboard')
router.register(r'hods', HODViewSet, basename='hod')
router.register(r'admin/pipeline', AdminPipelineView, basename='admin-pipeline') # Added

urlpatterns = [
    path("health/", health),
    path("help/", help_view),
    path("about/", about_view),
    path("transcribe/", transcribe_audio),
    path("api/", include(router.urls)),
]
