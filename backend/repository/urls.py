from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LibraryAssetViewSet

router = DefaultRouter()
router.register(r"assets", LibraryAssetViewSet, basename="library-asset")

urlpatterns = router.urls