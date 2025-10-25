from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("at", "user_display", "action", "model", "object_id_short")
    list_filter = ("action", "model", "at")
    search_fields = ("user__username", "model", "object_id", "changes")
    ordering = ("-at",)
    readonly_fields = ("at", "user", "action", "model", "object_id", "changes")
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "at",
                    "user",
                    "action",
                    "model",
                    "object_id",
                )
            },
        ),
        ("Change payload", {"fields": ("changes",)}),
    )

    def user_display(self, obj: AuditLog):
        return obj.user.username if obj.user else "Anonymous"

    user_display.short_description = "User"

    def object_id_short(self, obj: AuditLog):
        text = obj.object_id or ""
        return text if len(text) <= 24 else f"{text[:24]}…"

    object_id_short.short_description = "Object ID"

