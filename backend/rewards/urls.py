from django.urls import path
from .views import AwardMeritView, StudentRewardsView, LeaderboardView

app_name = 'rewards'

urlpatterns = [
    path('award/', AwardMeritView.as_view(), name='award-merit'),
    path('student/<int:student_id>/', StudentRewardsView.as_view(), name='student-rewards'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
]
