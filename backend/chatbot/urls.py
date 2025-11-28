from django.urls import path
from .views import AskView

app_name = 'chatbot'

urlpatterns = [
    path('ask/', AskView.as_view(), name='ask'),
]
