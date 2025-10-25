from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        # Register signal handlers
        from . import audit  # noqa: F401
        from . import auth_signals  # noqa: F401
