from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import DeviceRegistration
from core.serializers import DeviceRegistrationSerializer


class DeviceRegistrationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DeviceRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        DeviceRegistration.objects.update_or_create(
            push_token=payload["push_token"],
            defaults={
                "user": request.user,
                "platform": payload["platform"],
                "app_id": payload.get("app_id", ""),
            },
        )
        return Response({"detail": "Device registered"}, status=status.HTTP_201_CREATED)
