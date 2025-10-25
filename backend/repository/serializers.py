from pathlib import Path

from rest_framework import serializers

from .models import Resource

ALLOWED_EXTENSIONS = {
    ".pdf": Resource.Kind.PDF,
    ".doc": Resource.Kind.DOCUMENT,
    ".docx": Resource.Kind.DOCUMENT,
    ".jpeg": Resource.Kind.IMAGE,
    ".jpg": Resource.Kind.IMAGE,
    ".png": Resource.Kind.IMAGE,
    ".gif": Resource.Kind.IMAGE,
    ".mp4": Resource.Kind.VIDEO,
    ".mpeg": Resource.Kind.VIDEO,
    ".mpg": Resource.Kind.VIDEO,
    ".mov": Resource.Kind.VIDEO,
    ".avi": Resource.Kind.VIDEO,
    ".mkv": Resource.Kind.VIDEO,
    ".mp3": Resource.Kind.AUDIO,
    ".wav": Resource.Kind.AUDIO,
    ".aac": Resource.Kind.AUDIO,
    ".m4a": Resource.Kind.AUDIO,
    ".ogg": Resource.Kind.AUDIO,
}


class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = ["id", "title", "kind", "description", "url", "file"]

    def validate(self, attrs):
        url = attrs.get("url") or getattr(self.instance, "url", "")
        file = attrs.get("file")

        if not url and not file:
            raise serializers.ValidationError("Provide either a URL or upload a file.")

        if file:
            ext = Path(file.name or "").suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                allowed = ", ".join(sorted(set(ALLOWED_EXTENSIONS.keys())))
                raise serializers.ValidationError(f"Unsupported file type. Allowed extensions: {allowed}")
            inferred_kind = ALLOWED_EXTENSIONS[ext]
            attrs["kind"] = inferred_kind
            attrs["url"] = ""  # ensure we don't persist stale URL when file is uploaded
        elif url and not attrs.get("kind"):
            attrs["kind"] = Resource.Kind.LINK

        return attrs
