from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import UserSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    totp_code = serializers.CharField(required=False, allow_blank=True)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Custom claims
        token["username"] = user.username
        token["email"] = user.email or ""
        token["role"] = getattr(user, "role", None)
        token["display_name"] = getattr(user, "display_name", "")
        token["is_staff"] = bool(getattr(user, "is_staff", False))
        token["totp_enabled"] = bool(getattr(user, "totp_enabled", False))
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user: User = self.user  # type: ignore[assignment]
        request = self.context.get("request")
        totp_code = None
        if request is not None:
            totp_code = request.data.get("totp_code")
        if totp_code is None:
            totp_code = attrs.get("totp_code")
        if user.totp_enabled:
            if not totp_code or not user.verify_totp(totp_code):
                raise AuthenticationFailed("A valid authenticator code is required.")
        data["user"] = UserSerializer(user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
