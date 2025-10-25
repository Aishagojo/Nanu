from __future__ import annotations

from django.utils.deprecation import MiddlewareMixin

from . import state
from .audit import log_api_request


class RequestAuditMiddleware(MiddlewareMixin):
    def process_request(self, request):
        user = getattr(request, "user", None)
        if user and not getattr(user, "is_authenticated", False):
            user = None
        state.set_user(user)
        state.set_request_info(
            {
                "path": request.path,
                "method": request.method,
                "remote_addr": request.META.get("REMOTE_ADDR"),
                "user_agent": request.META.get("HTTP_USER_AGENT"),
            }
        )

    def process_response(self, request, response):
        try:
            if request.path.startswith("/api/"):
                log_api_request(request, response)
        finally:
            state.clear()
        return response

    def process_exception(self, request, exception):
        state.clear()
        return None
