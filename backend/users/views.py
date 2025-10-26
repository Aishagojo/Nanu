from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from core.models import AuditLog

from .models import User, ParentStudentLink, UserProvisionRequest
from .serializers import (
    UserSerializer,
    ParentStudentLinkSerializer,
    UserProvisionSerializer,
    UserProvisionRequestSerializer,
)
from .notifications import notify_provision_request_approval


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class ParentStudentLinkViewSet(viewsets.ModelViewSet):
    serializer_class = ParentStudentLinkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ParentStudentLink.objects.select_related("parent", "student")
        if user.role == User.Roles.PARENT:
            return qs.filter(parent=user)
        if user.role == User.Roles.STUDENT:
            return qs.filter(student=user)
        if user.role in [User.Roles.ADMIN, User.Roles.HOD, User.Roles.RECORDS] or user.is_staff:
            return qs
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Roles.ADMIN, User.Roles.HOD, User.Roles.RECORDS] and not user.is_staff:
            raise PermissionDenied("Only admin, HOD, or records staff can create parent links.")
        passcode = self.request.data.get("records_passcode")
        if passcode != settings.RECORDS_PROVISION_PASSCODE:
            raise PermissionDenied("Invalid records approval passcode.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in [User.Roles.ADMIN, User.Roles.HOD, User.Roles.RECORDS] and not user.is_staff:
            raise PermissionDenied("Only admin, HOD, or records staff can delete parent links.")
        instance.delete()


class UserProvisionRequestViewSet(viewsets.ModelViewSet):
    serializer_class = UserProvisionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        allowed_roles = {User.Roles.RECORDS, User.Roles.ADMIN, User.Roles.HOD}
        qs = UserProvisionRequest.objects.select_related(
            "requested_by", "reviewed_by", "created_user"
        )
        if user.role in allowed_roles or user.is_staff:
            return qs
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        allowed_roles = {User.Roles.RECORDS, User.Roles.ADMIN, User.Roles.HOD}
        if user.role not in allowed_roles and not user.is_staff:
            raise PermissionDenied("Only admin, HOD, or records staff can submit provisioning requests.")
        serializer.save(requested_by=user)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def approve(self, request, pk=None):
        provision_request = self.get_object()
        acting = request.user
        if acting.role not in {User.Roles.ADMIN, User.Roles.HOD} and not acting.is_staff:
            raise PermissionDenied("Only admin or HOD users may approve requests.")
        if provision_request.status != UserProvisionRequest.Status.PENDING:
            raise ValidationError({"detail": "Request has already been processed."})
        if User.objects.filter(username=provision_request.username).exists():
            raise ValidationError({"detail": "A user with this username already exists."})
        temp_password = User.objects.make_random_password()
        payload = {
            "username": provision_request.username,
            "password": temp_password,
            "email": provision_request.email,
            "display_name": provision_request.display_name,
            "role": provision_request.role,
        }
        serializer = UserProvisionSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        provision_request.status = UserProvisionRequest.Status.APPROVED
        provision_request.reviewed_by = acting
        provision_request.reviewed_at = timezone.now()
        provision_request.created_user = user
        provision_request.rejection_reason = ""
        provision_request.temporary_password = temp_password
        provision_request.save(update_fields=["status", "reviewed_by", "reviewed_at", "created_user", "rejection_reason", "temporary_password"])
        AuditLog.objects.create(
            user=acting,
            action="user_provision_approved",
            model=UserProvisionRequest._meta.label,
            object_id=str(provision_request.pk),
            changes={"username": provision_request.username, "role": provision_request.role},
        )
        notify_provision_request_approval(provision_request, temp_password)
        return Response(
            {
                "user": UserSerializer(user).data,
                "temporary_password": temp_password,
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        provision_request = self.get_object()
        acting = request.user
        if acting.role not in {User.Roles.ADMIN, User.Roles.HOD} and not acting.is_staff:
            raise PermissionDenied("Only admin or HOD users may reject requests.")
        if provision_request.status != UserProvisionRequest.Status.PENDING:
            raise ValidationError({"detail": "Request has already been processed."})
        reason = request.data.get("reason", "").strip()
        provision_request.status = UserProvisionRequest.Status.REJECTED
        provision_request.reviewed_by = acting
        provision_request.reviewed_at = timezone.now()
        provision_request.rejection_reason = reason
        provision_request.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"])
        AuditLog.objects.create(
            user=acting,
            action="user_provision_rejected",
            model=UserProvisionRequest._meta.label,
            object_id=str(provision_request.pk),
            changes={"reason": reason},
        )
        return Response(UserProvisionRequestSerializer(provision_request).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def email_again(self, request, pk=None):
        provision_request = self.get_object()
        acting = request.user
        if acting.role not in {User.Roles.ADMIN, User.Roles.HOD} and not acting.is_staff:
            raise PermissionDenied("Only admin or HOD users may resend credentials.")
        if provision_request.status != UserProvisionRequest.Status.APPROVED or not provision_request.temporary_password:
            raise ValidationError({"detail": "Only approved requests with recorded credentials can be resent."})
        notify_provision_request_approval(provision_request, provision_request.temporary_password)
        return Response({"detail": "Credentials re-sent to the requester."})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    """Return the current authenticated user's profile."""
    return Response(UserSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def password_reset_request(request):
    identifier = request.data.get("username") or request.data.get("email")
    if not identifier:
        return Response({"detail": "username or email is required."}, status=status.HTTP_400_BAD_REQUEST)

    user = None
    if identifier:
        try:
            user = User.objects.get(username=identifier)
        except User.DoesNotExist:
            try:
                user = User.objects.get(email__iexact=identifier)
            except User.DoesNotExist:
                user = None

    if user:
        token = default_token_generator.make_token(user)
        user.must_change_password = True
        actor = request.user if getattr(request, "user", None) and request.user.is_authenticated else None
        user._password_changed_by = actor or user
        user.save(update_fields=["must_change_password"])
        AuditLog.objects.create(
            user=actor if actor else None,
            action="password_reset_request",
            model=User._meta.label,
            object_id=str(user.pk),
            changes={"token_issued": True},
        )
        return Response({
            "detail": "Password reset token generated.",
            "token": token,
            "username": user.username,
        })

    return Response({"detail": "No account matches the supplied username or email."}, status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def password_reset_confirm(request):
    username = request.data.get("username")
    token = request.data.get("token")
    new_password = request.data.get("new_password")
    if not all([username, token, new_password]):
        return Response({"detail": "username, token, and new_password are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"detail": "Invalid token or username."}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.must_change_password = False
    user._password_changed_by = user
    user.save(update_fields=["password", "must_change_password"])
    AuditLog.objects.create(
        user=user,
        action="password_reset_confirm",
        model=User._meta.label,
        object_id=str(user.pk),
        changes={"password_reset": True},
    )
    return Response({"detail": "Password updated successfully."})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def password_change_self(request):
    new_password = request.data.get("new_password")
    if not new_password:
        return Response({"detail": "new_password is required."}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    user.set_password(new_password)
    user.must_change_password = False
    user._password_changed_by = user
    user.save(update_fields=["password", "must_change_password"])
    AuditLog.objects.create(
        user=user,
        action="password_change_self",
        model=User._meta.label,
        object_id=str(user.pk),
        changes={"self_service": True},
    )
    return Response({"detail": "Password updated."})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def totp_setup(request):
    """Generate or return the current TOTP secret for the requesting user."""
    user = request.user
    modified = user.ensure_totp_secret()
    if modified:
        user.save(update_fields=["totp_secret"])
    return Response(
        {
            "secret": user.totp_secret,
            "otpauth_url": user.provisioning_uri(),
            "enabled": user.totp_enabled,
        }
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def totp_activate(request):
    code = request.data.get("code")
    if not code:
        raise ValidationError({"detail": "code is required."})
    user = request.user
    secret_generated = user.ensure_totp_secret()
    if not user.verify_totp(code):
        raise ValidationError({"detail": "Invalid authenticator code."})
    updates = []
    if secret_generated:
        updates.append("totp_secret")
    if not user.totp_enabled:
        user.totp_enabled = True
        user.totp_activated_at = timezone.now()
        updates.extend(["totp_enabled", "totp_activated_at"])
    if updates:
        user.save(update_fields=list(set(updates)))
    return Response({"detail": "Authenticator enabled.", "enabled": True})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def totp_disable(request):
    code = request.data.get("code")
    user = request.user
    if user.totp_enabled:
        if not code:
            raise ValidationError({"detail": "code is required to disable authenticator."})
        if not user.verify_totp(code):
            raise ValidationError({"detail": "Invalid authenticator code."})
    user.reset_totp()
    user.save(update_fields=["totp_secret", "totp_enabled", "totp_activated_at"])
    return Response({"detail": "Authenticator disabled.", "enabled": False})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def assign_role(request):
    acting = request.user
    if acting.role not in [User.Roles.SUPERADMIN] and not acting.is_superuser:
        raise PermissionDenied("Only super administrators may assign roles.")
    target_id = request.data.get("user_id")
    new_role = request.data.get("role")
    if not target_id or not new_role:
        raise ValidationError({"detail": "user_id and role are required."})
    target = get_object_or_404(User, pk=target_id)
    valid_roles = {choice[0] for choice in User.Roles.choices}
    if new_role not in valid_roles:
        raise ValidationError({"detail": f"Invalid role '{new_role}'."})
    if target == acting and new_role != User.Roles.SUPERADMIN:
        raise ValidationError({"detail": "Super administrators cannot demote themselves via API."})
    target.role = new_role
    updates = ["role"]
    if new_role == User.Roles.SUPERADMIN:
        if not target.is_superuser:
            target.is_superuser = True
            updates.append("is_superuser")
        if not target.is_staff:
            target.is_staff = True
            updates.append("is_staff")
    elif new_role == User.Roles.ADMIN:
        if not target.is_staff:
            target.is_staff = True
            updates.append("is_staff")
        if target != acting and target.is_superuser:
            target.is_superuser = False
            updates.append("is_superuser")
    else:
        if target != acting:
            if target.is_superuser:
                target.is_superuser = False
                updates.append("is_superuser")
            if target.is_staff and not target.is_superuser:
                target.is_staff = False
                updates.append("is_staff")
    target.save(update_fields=list(set(updates)))
    return Response(UserSerializer(target).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def provision_user(request):
    acting = request.user
    allowed_roles = {User.Roles.ADMIN, User.Roles.HOD}
    if acting.role not in allowed_roles and not acting.is_staff:
        raise PermissionDenied("Only admin or HOD users can bypass the approval queue.")
    serializer = UserProvisionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    AuditLog.objects.create(
        user=acting,
        action="user_provision",
        model=User._meta.label,
        object_id=str(user.pk),
        changes={"provisioned_role": user.role},
    )
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
