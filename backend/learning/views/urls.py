from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import (
    AchievementCategoryViewSet,
    AchievementViewSet, 
    StudentAchievementViewSet,
    RewardClaimViewSet,
    TermProgressViewSet
)

router = DefaultRouter()
router.register(r'categories', AchievementCategoryViewSet)
router.register(r'achievements', AchievementViewSet)
router.register(r'student-achievements', StudentAchievementViewSet)
router.register(r'reward-claims', RewardClaimViewSet)
router.register(r'term-progress', TermProgressViewSet)

urlpatterns = [
    path('', include(router.urls)),
]