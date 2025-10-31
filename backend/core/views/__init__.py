from .base import health, index, help_view, about_view, transcribe_audio
from .hod import DepartmentViewSet, HodDashboardViewSet

__all__ = [
    'health',
    'index',
    'help_view',
    'about_view',
    'transcribe_audio',
    'DepartmentViewSet',
    'HodDashboardViewSet',
]