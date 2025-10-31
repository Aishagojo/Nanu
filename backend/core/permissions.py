from rest_framework import permissions


class IsAdminOrLecturer(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.is_staff or hasattr(request.user, 'lecturer')

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        return request.user.is_staff or (hasattr(request.user, 'lecturer') and obj.lecturer == request.user)


class IsStudentReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return hasattr(request.user, 'student')
        return False

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return hasattr(request.user, 'student')
        return False
