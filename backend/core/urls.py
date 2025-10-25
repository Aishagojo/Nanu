from django.urls import path
from .views import health, help_view, about_view, transcribe_audio

urlpatterns = [
    path("health/", health),
    path("help/", help_view),
    path("about/", about_view),
    path("transcribe/", transcribe_audio),
]
