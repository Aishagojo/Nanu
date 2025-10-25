from rest_framework.routers import DefaultRouter
from .views import ThreadViewSet, MessageViewSet
from .views import SupportChatAPIView

router = DefaultRouter()
router.register(r"threads", ThreadViewSet, basename="communication-thread")
router.register(r"messages", MessageViewSet, basename="communication-message")

urlpatterns = router.urls

from django.urls import path

urlpatterns += [
	path("support/chat/", SupportChatAPIView.as_view(), name="support-chat"),
]
