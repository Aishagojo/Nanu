from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user_display", "action", "target_table", "object_id_short")
    list_filter = ("action", "target_table", "created_at")
    search_fields = ("actor_user__username", "target_table", "target_id", "before", "after")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "actor_user", "action", "target_table", "target_id", "before", "after")
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "created_at",
                    "actor_user",
                    "action",
                    "target_table",
                    "target_id",
                )
            },
        ),
        ("Change payload", {"fields": ("before", "after")}),
    )

    def user_display(self, obj: AuditLog):
        return obj.actor_user.username if obj.actor_user else "Anonymous"

    user_display.short_description = "User"

    def object_id_short(self, obj: AuditLog):
        text = obj.target_id or ""
        return text if len(text) <= 24 else f"{text[:24]}…"

    object_id_short.short_description = "Object ID"
